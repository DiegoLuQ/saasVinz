"""Convenios con empresas: CRUD, descuento por ítem en la orden y copia congelada."""
import uuid

import pytest

from app import models
from app.services.agreements import compute_discount


def test_calculo_por_item():
    terms = {"plans_pct": 10, "products_pct": 5, "special_service_id": 7, "special_service_pct": 20}
    servicios = [{"service_id": 7, "precio_venta": 50000, "cantidad": 1},
                 {"service_id": 8, "precio_venta": 30000, "cantidad": 1}]  # el 8 no tiene descuento
    planes = [{"precio_venta": 100000, "cantidad": 1}]
    productos = [{"precio_venta": 20000, "cantidad": 2}]
    assert compute_discount(terms, servicios, planes, productos) == 10000 + 2000 + 10000
    assert compute_discount(None, servicios, planes, productos) == 0


@pytest.fixture
def catalog(db, world):
    tag = uuid.uuid4().hex[:6]
    tid = world["tenant_a"]
    special = models.Service(tenant_id=tid, name=f"Eutanasia {tag}", price=40000, cost=0, is_special=True)
    plan = models.Plan(tenant_id=tid, name=f"Plan {tag}", price=100000, cost=0)
    db.add_all([special, plan])
    db.commit()
    return {"special": special.id, "plan": plan.id, "tag": tag}


def _order(client, h, tag, **extra):
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Luna {tag}", "species": "Felino", "customer_id": c["id"]}).json()
    return client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente", **extra})


def test_convenio_en_la_orden(client, auth, catalog):
    h = auth("a")
    r = client.post("/api/internal/agreements", headers=h, json={
        "name": f"Empresa {catalog['tag']}", "rut": "76.123.456-7",
        "plans_discount_pct": 10, "products_discount_pct": 5,
        "special_service_id": catalog["special"], "special_service_discount_pct": 20,
    })
    assert r.status_code == 201, r.text
    ag = r.json()

    lines = {
        "planes": [{"plan_id": catalog["plan"], "cantidad": 1, "precio_venta": 100000, "precio_costo": 0}],
        "servicios": [{"service_id": catalog["special"], "cantidad": 1, "precio_venta": 40000, "precio_costo": 0}],
    }
    o = _order(client, h, catalog["tag"], agreement_id=ag["id"], **lines)
    assert o.status_code == 200, o.text
    order = o.json()
    assert order["agreement_id"] == ag["id"]
    assert order["agreement_discount"] == 10000 + 8000

    # Cambiar el convenio no altera la orden ya registrada (copia congelada)…
    client.put(f"/api/internal/agreements/{ag['id']}", headers=h, json={**{k: ag[k] for k in (
        "name", "rut", "products_discount_pct", "special_service_id", "special_service_discount_pct")}, "plans_discount_pct": 50})
    upd = client.patch(f"/api/internal/cremations/{order['id']}", headers=h, json={"notes": "x"}).json()
    assert upd["agreement_discount"] == 18000
    # …pero cambiar sus ítems sí recalcula el monto con esa copia.
    upd = client.patch(f"/api/internal/cremations/{order['id']}", headers=h, json={"servicios": []}).json()
    assert upd["agreement_discount"] == 10000

    # Quitar el convenio.
    upd = client.patch(f"/api/internal/cremations/{order['id']}", headers=h, json={"agreement_id": None}).json()
    assert upd["agreement_id"] is None and upd["agreement_discount"] == 0

    lista = client.get("/api/internal/agreements", headers=h).json()
    assert any(a["id"] == ag["id"] for a in lista)
    assert any(a["id"] == ag["id"] for a in client.get("/api/internal/agreements/active-options", headers=h).json())


def test_aislamiento_entre_crematorios(client, auth, catalog):
    ag = client.post("/api/internal/agreements", headers=auth("a"), json={"name": f"Solo A {catalog['tag']}"}).json()
    assert all(a["id"] != ag["id"] for a in client.get("/api/internal/agreements", headers=auth("b")).json())
    assert client.put(f"/api/internal/agreements/{ag['id']}", headers=auth("b"), json={"name": "robo"}).status_code == 404
    r = _order(client, auth("b"), catalog["tag"] + "b", agreement_id=ag["id"])
    assert r.status_code == 400


def test_borrar_con_ordenes_solo_desactiva(client, auth, catalog):
    h = auth("a")
    ag = client.post("/api/internal/agreements", headers=h, json={"name": f"Usado {catalog['tag']}", "plans_discount_pct": 5}).json()
    assert _order(client, h, catalog["tag"] + "u", agreement_id=ag["id"]).status_code == 200
    r = client.delete(f"/api/internal/agreements/{ag['id']}", headers=h).json()
    assert r == {"deleted": False, "deactivated": True}
    assert all(a["id"] != ag["id"] for a in client.get("/api/internal/agreements/active-options", headers=h).json())

    libre = client.post("/api/internal/agreements", headers=h, json={"name": f"Libre {catalog['tag']}"}).json()
    assert client.delete(f"/api/internal/agreements/{libre['id']}", headers=h).json()["deleted"] is True


def test_vista_previa_del_recibo(client, auth, catalog):
    h = auth("a")
    ag = client.post("/api/internal/agreements", headers=h, json={
        "name": f"Recibo {catalog['tag']}", "plans_discount_pct": 10}).json()
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam R {catalog['tag']}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Kira {catalog['tag']}", "species": "Canino", "customer_id": c["id"]}).json()
    r = client.post("/api/internal/ops-records/receipt/preview", headers=h, json={
        "pet_id": p["id"], "plans": [{"id": catalog["plan"], "price": 100000}],
        "services": [{"id": catalog["special"], "price": 40000}],
        "weight_price": 5000, "discount": 10, "agreement_id": ag["id"],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["agreement_discount"] == 10000
    assert body["total"] == (145000 - 10000) * 0.9
    assert f"Recibo {catalog['tag']}" in body["html_content"] and "REC-BORRADOR" in body["html_content"]


def test_cancelar_borra_la_comision_pendiente(client, auth, db, world, catalog):
    from app.api.internal.partners.models import Veterinary, PartnerLinkV2, PartnerLinkStatus, PartnerCommission
    tag = catalog["tag"]
    vet = Veterinary(name=f"Vet {tag}", rut=f"9{tag}", slug=f"vet-{tag}", email=f"vet-{tag}@vinzer-pruebas.cl", password_hash="x")
    db.add(vet)
    db.flush()
    link = PartnerLinkV2(tenant_id=world["tenant_a"], veterinary_id=vet.id, status=PartnerLinkStatus.active,
                         slug_publico=f"vet-{tag}", tipo_comision="porcentaje", porcentaje_comision=10)
    db.add(link)
    db.commit()

    h = auth("a")
    o = _order(client, h, tag + "v", partner_link_id=link.id, total_price=100000,
               planes=[{"plan_id": catalog["plan"], "cantidad": 1, "precio_venta": 100000, "precio_costo": 0}]).json()
    db.expire_all()
    assert db.query(PartnerCommission).filter(PartnerCommission.cremation_id == o["id"]).one().amount == 10000

    r = client.patch(f"/api/internal/cremations/{o['id']}", headers=h, json={"status": "cancelado", "total_price": 100000})
    assert r.status_code == 200, r.text
    upd = r.json()
    assert upd["financial"]["commission"] == 0 and upd["financial"]["total_price"] == 0
    db.expire_all()
    assert db.query(PartnerCommission).filter(PartnerCommission.cremation_id == o["id"]).count() == 0

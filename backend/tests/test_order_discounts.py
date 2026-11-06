"""Descuentos desde la vista rápida de la orden: convenio empresa + % manual,
total y comisión de la veterinaria recalculados en el servidor."""
import uuid

import pytest

from app import models


@pytest.fixture
def catalog(db, world):
    tag = uuid.uuid4().hex[:6]
    tid = world["tenant_a"]
    plan = models.Plan(tenant_id=tid, name=f"Plan {tag}", price=100000, cost=0)
    extra = models.Service(tenant_id=tid, name=f"Traslado {tag}", price=20000, cost=0)
    db.add_all([plan, extra])
    db.commit()
    return {"plan": plan.id, "extra": extra.id, "tag": tag}


def _order(client, h, catalog, **extra):
    tag = catalog["tag"]
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Toby {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    r = client.post("/api/internal/cremations", headers=h, json={
        "pet_id": p["id"], "status": "pendiente", "total_price": 120000,
        "planes": [{"plan_id": catalog["plan"], "cantidad": 1, "precio_venta": 100000, "precio_costo": 0}],
        "servicios": [{"service_id": catalog["extra"], "cantidad": 1, "precio_venta": 20000, "precio_costo": 0}],
        **extra,
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_convenio_y_descuento_recalculan_el_total(client, auth, catalog):
    h = auth("a")
    oid = _order(client, h, catalog)
    ag = client.post("/api/internal/agreements", headers=h, json={"name": f"Empresa {catalog['tag']}", "plans_discount_pct": 10}).json()

    # Convenio: 10 % del plan (100.000) = 10.000 → 110.000
    r = client.patch(f"/api/internal/cremations/{oid}/discounts", headers=h, json={"agreement_id": ag["id"]})
    assert r.status_code == 200, r.text
    assert r.json()["agreement"]["discount"] == 10000 and r.json()["total"] == 110000

    # + 10 % manual sobre lo que queda → 99.000 (el convenio se conserva al no mandarlo)
    r = client.patch(f"/api/internal/cremations/{oid}/discounts", headers=h, json={"discount": 10})
    assert r.json()["total"] == 99000 and r.json()["agreement"]["id"] == ag["id"]

    # Quitar convenio (null explícito) → 120.000 × 0,9 = 108.000
    r = client.patch(f"/api/internal/cremations/{oid}/discounts", headers=h, json={"agreement_id": None})
    assert r.json()["agreement"] is None and r.json()["total"] == 108000

    assert client.patch(f"/api/internal/cremations/{oid}/discounts", headers=h, json={"discount": 120}).status_code == 400


def test_la_comision_sigue_al_nuevo_total(client, auth, db, world, catalog):
    from app.api.internal.partners.models import Veterinary, PartnerLinkV2, PartnerLinkStatus, PartnerCommission
    tag = catalog["tag"]
    vet = Veterinary(name=f"Vet {tag}", rut=f"8{tag}", slug=f"vetd-{tag}", email=f"vetd-{tag}@vinzer-pruebas.cl", password_hash="x")
    db.add(vet)
    db.flush()
    link = PartnerLinkV2(tenant_id=world["tenant_a"], veterinary_id=vet.id, status=PartnerLinkStatus.active,
                         slug_publico=f"vetd-{tag}", tipo_comision="porcentaje", porcentaje_comision=10)
    db.add(link)
    db.commit()

    h = auth("a")
    oid = _order(client, h, catalog, partner_link_id=link.id)
    r = client.patch(f"/api/internal/cremations/{oid}/discounts", headers=h, json={"discount": 50})
    assert r.status_code == 200 and r.json()["total"] == 60000 and r.json()["commission"] == 6000
    db.expire_all()
    assert db.query(PartnerCommission).filter(PartnerCommission.cremation_id == oid).one().amount == 6000


def test_otro_crematorio_no_puede(client, auth, catalog):
    oid = _order(client, auth("a"), catalog)
    r = client.patch(f"/api/internal/cremations/{oid}/discounts", headers=auth("b"), json={"discount": 10})
    assert r.status_code == 404

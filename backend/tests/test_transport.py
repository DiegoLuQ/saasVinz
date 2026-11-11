"""Cobro de traslado por comuna (zonas): configuración, formulario público, registro,
orden y recálculo de descuentos. Lógica en app/services/transport.py."""
import json
import uuid

import pytest

from app import models
from app.services import transport
from tests.test_public_form import form_token  # noqa: F401  (fixture)

ZONES = [
    {"name": "Urbana", "price": 0, "communes": ["Santiago", "Ñuñoa"]},
    {"name": "Zona 2", "price": 8000, "communes": ["Puente Alto", "Maipú"]},
]


def test_regla_de_cobro():
    cfg = transport.clean_config({"enabled": True, "zones": ZONES})
    q = transport.quote(cfg, "puente alto", "Nunoa")       # sin tildes / minúsculas
    assert q["pickup"]["zone"] == "Zona 2" and q["pickup"]["price"] == 8000
    assert q["delivery"]["zone"] == "Urbana" and q["delivery"]["price"] == 0
    assert q["total"] == 8000 and q["zone"] == "Zona 2" and q["uncovered"] == []   # un cobro: la zona más cara

    q = transport.quote(cfg, "Arica", "Maipú")             # comuna sin zona: todo a cotizar, no bloquea
    assert q["pickup"]["covered"] is False and q["pickup"]["price"] is None
    assert q["total"] == 0 and q["uncovered"] == ["Arica"]

    solo_retiro = transport.clean_config({"enabled": True, "charge_delivery": False, "zones": ZONES})
    assert transport.quote(solo_retiro, "Maipú", "Maipú")["total"] == 8000
    assert transport.quote(transport.clean_config({"zones": ZONES}), "Maipú", "Maipú") is None  # apagado

    # Retiro y entrega en la misma comuna: un solo cobro (no se duplica)
    q = transport.quote_owner(cfg, {"commune": "Maipú", "pickupSameAsOwner": True})
    assert q["total"] == 8000
    assert transport.detail_label(q) == "Traslado (retiro y entrega en Maipú)"


def test_una_comuna_no_puede_estar_en_dos_zonas():
    with pytest.raises(ValueError, match="dos zonas"):
        transport.clean_config({"zones": [{"name": "A", "price": 1, "communes": ["Maipú"]},
                                          {"name": "B", "price": 2, "communes": ["maipu"]}]})
    with pytest.raises(ValueError):
        transport.clean_config({"zones": [{"name": "", "price": 1}]})


@pytest.fixture
def traslado(client, auth, db, world):
    h = auth("a")
    r = client.put("/api/internal/maintenance/transport", headers=h,
                   json={"enabled": True, "show_prices": True, "zones": ZONES})
    assert r.status_code == 200, r.text
    yield h
    db.rollback()
    db.query(models.Tenant).filter(models.Tenant.id == world["tenant_a"]).update({models.Tenant.transport_config: None})
    db.commit()


def test_api_config(client, traslado, auth):
    cfg = client.get("/api/internal/maintenance/transport", headers=traslado).json()
    assert cfg["enabled"] is True and [z["name"] for z in cfg["zones"]] == ["Urbana", "Zona 2"]
    bad = {"enabled": True, "zones": ZONES + [{"name": "Otra", "price": 1, "communes": ["Santiago"]}]}
    assert client.put("/api/internal/maintenance/transport", headers=traslado, json=bad).status_code == 400
    # El otro crematorio no tiene la configuración de A
    assert client.get("/api/internal/maintenance/transport", headers=auth("b")).json()["zones"] == []


def test_formulario_publico_recibe_las_zonas(client, traslado, db, world):
    pub = client.get("/api/public/tenant/crematorio-a").json()["transport"]
    assert pub["zones"][1]["price"] == 8000 and "Maipú" in pub["zones"][1]["communes"]
    client.put("/api/internal/maintenance/transport", headers=traslado,
               json={"enabled": True, "show_prices": False, "zones": ZONES})
    pub = client.get("/api/public/tenant/crematorio-a").json()["transport"]
    assert all(z["price"] is None for z in pub["zones"])  # precios ocultos


def test_formulario_registro_y_orden(client, traslado, db, world, form_token):
    tag = uuid.uuid4().hex[:6]
    owner = {"fullName": f"Familia {tag}", "phone": "+56912345678", "veterinary": "Clínica", "address": "Calle 1",
             "commune": "Ñuñoa", "pickupCommune": "Puente Alto",
             "transport": {"total": 1}}  # lo que mande el navegador se ignora
    r = client.post("/api/public/submit-form", data={
        "tenant_id": world["tenant_a"], "owner_data": json.dumps(owner),
        "pet_data": json.dumps({"name": f"Toby {tag}", "type": "Canino", "species": "Canino", "size": "Pequeño", "age": "8"}),
        "token": form_token, "recaptcha_token": "x",
    })
    assert r.status_code == 200, r.text
    sub = db.query(models.FormSubmission).filter(models.FormSubmission.tenant_id == world["tenant_a"]) \
        .order_by(models.FormSubmission.id.desc()).first()
    t = sub.owner_data["transport"]
    assert t["total"] == 8000 and t["pickup"]["zone"] == "Zona 2" and t["delivery"]["price"] == 0

    h = traslado
    detail = client.get(f"/api/internal/submissions/{sub.id}", headers=h).json()
    assert detail["transport_charge"]["total"] == 8000 and detail["total"] >= 8000

    cust = client.post(f"/api/internal/submissions/{sub.id}/create-customer", headers=h).json()["customer_id"]
    pet = client.post(f"/api/internal/submissions/{sub.id}/create-pet?customer_id={cust}", headers=h).json()["pet_id"]
    assert client.post(f"/api/internal/submissions/{sub.id}/create-services?pet_id={pet}", headers=h).status_code == 200
    db.expire_all()
    oc = db.query(models.CremationOC).filter(models.CremationOC.pet_id == pet).one()
    assert oc.financial.transport_price == 8000 and oc.financial.total_price == 8000
    assert oc.financial.transport_detail["pickup"]["commune"] == "Puente Alto"

    exp = client.get(f"/api/internal/cremations/{oc.id}/expediente", headers=h).json()
    line = next(i for i in exp["items"] if i["tipo"] == "traslado")
    assert line["precio"] == 8000 and "Puente Alto" in line["nombre"]

    # El % manual se aplica también al traslado (igual que al recargo por peso)
    r = client.patch(f"/api/internal/cremations/{oc.id}/discounts", headers=h, json={"discount": 50})
    assert r.status_code == 200, r.text
    db.expire_all()
    assert db.query(models.CremationFinancial).get(oc.id).total_price == 4000

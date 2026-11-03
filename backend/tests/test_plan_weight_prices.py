"""Precio por plan y peso (form_config.weight_pricing_mode = "table"): cada plan
tiene su precio por tramo (srv_plans.weight_prices) y no se suma recargo."""
import json
import uuid

import pytest

from app import models
from app.services.public_form_config import submission_weight_charge
from tests.test_public_form import form_token  # noqa: F401  (fixture)


@pytest.fixture
def tabla(client, auth, db, world):
    """Tramos 0–4 / 4,1–9 / desde 9,1 y un plan de 87.000 en el crematorio A."""
    h = auth("a")
    tid = world["tenant_a"]
    tenant = db.query(models.Tenant).get(tid)
    original_cfg = tenant.form_config
    old_tiers = [(t.label, t.min_weight, t.max_weight, t.price) for t in
                 db.query(models.WeightPricing).filter(models.WeightPricing.tenant_id == tid).all()]
    r = client.put("/api/internal/maintenance/weight-pricing", headers=h, json={"tiers": [
        {"label": "Pequeño", "min_weight": 0, "max_weight": 4, "price": 5000},
        {"label": "Mediano", "min_weight": 4.1, "max_weight": 9, "price": 8000},
        {"label": "Grande", "min_weight": 9.1, "max_weight": None, "price": 12000},
    ]})
    assert r.status_code == 200, r.text
    tiers = [t["id"] for t in r.json()]
    plan = models.Plan(tenant_id=tid, name=f"Plan Recuerdo {uuid.uuid4().hex[:5]}", price=87000, cost=0, is_active=True)
    db.add(plan)
    db.commit()
    try:
        yield {"h": h, "tid": tid, "tiers": tiers, "plan_id": plan.id}
    finally:
        db.rollback()
        tenant = db.query(models.Tenant).get(tid)
        tenant.form_config = original_cfg
        db.query(models.Plan).filter(models.Plan.id == plan.id).delete()
        db.commit()
        client.put("/api/internal/maintenance/weight-pricing", headers=h, json={"tiers": [
            {"label": l, "min_weight": mn, "max_weight": mx, "price": p} for l, mn, mx, p in old_tiers
        ]})


def _modo(db, tid, mode):
    tenant = db.query(models.Tenant).get(tid)
    tenant.form_config = {**(tenant.form_config or {}), "weight_pricing_mode": mode}
    db.commit()


def _enviar(client, db, world, token, plan_id, **pet_extra):
    owner = {"fullName": "Familia Tabla", "phone": "+56912345678", "veterinary": "Domicilio", "address": "Calle 1"}
    pet = {"name": "Toby", "type": "Canino", "species": "Canino", "age": "8", **pet_extra}
    r = client.post("/api/public/submit-form", data={
        "tenant_id": world["tenant_a"], "owner_data": json.dumps(owner), "pet_data": json.dumps(pet),
        "token": token, "recaptcha_token": "x", "selected_services": json.dumps([f"plan_{plan_id}"]),
    })
    assert r.status_code == 200, r.text
    return db.query(models.FormSubmission).filter(
        models.FormSubmission.tenant_id == world["tenant_a"]
    ).order_by(models.FormSubmission.id.desc()).first()


def _guardar_tabla(client, tabla, prices):
    r = client.put("/api/internal/maintenance/plan-weight-prices", headers=tabla["h"],
                   json={"plans": [{"plan_id": tabla["plan_id"], "prices": prices}]})
    assert r.status_code == 200, r.text
    return next(p for p in r.json()["plans"] if p["plan_id"] == tabla["plan_id"])


def test_guarda_la_tabla_y_descarta_tramos_inexistentes(client, tabla):
    t1, t2, _ = tabla["tiers"]
    row = _guardar_tabla(client, tabla, {str(t1): 87000, str(t2): 90000, "999999": 1, "x": 5})
    assert row["prices"] == {str(t1): 87000, str(t2): 90000}
    r = client.put("/api/internal/maintenance/plan-weight-prices", headers=tabla["h"],
                   json={"plans": [{"plan_id": tabla["plan_id"], "prices": {str(t1): -5}}]})
    assert r.status_code == 400


def test_modo_invalido_se_rechaza(client, tabla):
    r = client.put("/api/internal/maintenance/form-config", headers=tabla["h"], json={"weight_pricing_mode": "otro"})
    assert r.status_code == 400


def test_formulario_con_tabla_congela_el_precio_del_tramo(client, db, world, tabla, form_token):
    t1, t2, t3 = tabla["tiers"]
    _guardar_tabla(client, tabla, {str(t1): 87000, str(t2): 90000})
    _modo(db, tabla["tid"], "table")

    sub = _enviar(client, db, world, form_token, tabla["plan_id"], weightTierId=str(t2))
    plan_line = next(s for s in sub.selected_services if s["type"] == "plan")
    assert plan_line["price"] == 90000
    assert sub.pet_data["weightTier"]["price"] == 0
    assert submission_weight_charge(db, tabla["tid"], sub.pet_data) is None

    # Con kg: tramo «desde 9,1» sin precio en la tabla → precio base del plan.
    sub = _enviar(client, db, world, form_token, tabla["plan_id"], weightKg="12")
    assert next(s for s in sub.selected_services if s["type"] == "plan")["price"] == 87000

    # Datos públicos: los tramos sin recargo y los planes con su tabla.
    tenant = client.get("/api/public/tenant/crematorio-a").json()
    assert all("price" not in t or t["price"] is None for t in tenant["weight_tiers"])
    services = client.get("/api/public/tenant/crematorio-a/services").json()
    plan = next(s for s in services if s["id"] == f"plan_{tabla['plan_id']}")
    assert plan["weight_prices"] == {str(t1): 87000, str(t2): 90000}


def test_modo_recargo_no_cambia(client, db, world, tabla, form_token):
    _, t2, _ = tabla["tiers"]
    _guardar_tabla(client, tabla, {str(t2): 90000})
    _modo(db, tabla["tid"], "surcharge")
    sub = _enviar(client, db, world, form_token, tabla["plan_id"], weightTierId=str(t2))
    assert next(s for s in sub.selected_services if s["type"] == "plan")["price"] == 87000
    assert sub.pet_data["weightTier"]["price"] == 8000
    assert submission_weight_charge(db, tabla["tid"], sub.pet_data)["price"] == 8000


def test_catalogo_de_planes_entrega_la_tabla(client, db, tabla):
    t1, t2, _ = tabla["tiers"]
    _guardar_tabla(client, tabla, {str(t1): 87000, str(t2): 90000})
    _modo(db, tabla["tid"], "table")
    link = client.post("/api/internal/catalog/links", headers=tabla["h"], json={"catalog_type": "plans"})
    assert link.status_code == 201, link.text
    data = client.get(f"/api/public/catalog/crematorio-a/{link.json()['token']}").json()
    plan = next(p for p in data["plans"] if p["id"] == tabla["plan_id"])
    assert plan["weight_prices"] == {str(t1): 87000, str(t2): 90000}
    assert all(t.get("price") is None for t in data["weight_tiers"])

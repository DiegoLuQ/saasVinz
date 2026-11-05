"""Peso máximo de un plan (ej. «Minigarritas» hasta 1 kg): el catálogo y el
formulario lo reciben para ocultarlo en tamaños mayores y submit-form lo rechaza."""
import json

import pytest

from app import models
from app.services.public_form_config import plan_fits_weight
from tests.test_plan_weight_prices import tabla, _enviar  # noqa: F401  (fixture)
from tests.test_public_form import form_token  # noqa: F401  (fixture)


def test_regla_plan_fits_weight():
    assert plan_fits_weight(None, 50, 80)
    assert plan_fits_weight(1, tier_min=0)          # «0 – 1»
    assert not plan_fits_weight(1, tier_min=1)      # «1 – 4»
    assert not plan_fits_weight(1, tier_min=1.1)
    assert plan_fits_weight(1, kg=1) and not plan_fits_weight(1, kg=1.2)
    assert plan_fits_weight(1)                       # sin peso: no se puede saber


@pytest.fixture
def mini(client, tabla, db):
    r = client.patch(f"/api/internal/plans/{tabla['plan_id']}", headers=tabla["h"], json={"max_weight": 4})
    assert r.status_code == 200, r.text
    yield tabla
    db.rollback()
    db.query(models.Plan).filter(models.Plan.id == tabla["plan_id"]).update({models.Plan.max_weight: None})
    db.commit()


def test_api_y_servicios_publicos_exponen_el_maximo(client, mini, db):
    plan = db.query(models.Plan).get(mini["plan_id"])
    db.refresh(plan)
    assert plan.max_weight == 4
    svc = client.get("/api/public/tenant/crematorio-a/services").json()
    assert next(s for s in svc if s["id"] == f"plan_{mini['plan_id']}")["max_weight"] == 4
    assert client.patch(f"/api/internal/plans/{mini['plan_id']}", headers=mini["h"], json={"max_weight": -1}).status_code == 422


def test_formulario_rechaza_mascota_mas_pesada(client, mini, db, world, form_token):
    t1, t2, _ = mini["tiers"]
    sub = _enviar(client, db, world, form_token, mini["plan_id"], weightTierId=str(t1))  # 0 – 4 kg: ok
    assert any(i.get("type") == "plan" for i in sub.selected_services)
    _enviar(client, db, world, form_token, mini["plan_id"], weightKg="3,5")
    owner = {"fullName": "Familia", "phone": "+56912345678", "veterinary": "Domicilio", "address": "Calle 1"}
    for extra in ({"weightTierId": str(t2)}, {"weightKg": "6"}):  # 4,1 – 9 kg / 6 kg: no
        r = client.post("/api/public/submit-form", data={
            "tenant_id": world["tenant_a"], "owner_data": json.dumps(owner),
            "pet_data": json.dumps({"name": "Toby", "type": "Canino", "species": "Canino", "age": "8", **extra}),
            "token": form_token, "recaptcha_token": "x", "selected_services": json.dumps([f"plan_{mini['plan_id']}"]),
        })
        assert r.status_code == 400, r.text
        assert "hasta 4 kg" in r.json()["detail"]

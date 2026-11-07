"""Edad de la mascota con unidad (días/semanas/meses/años) y cálculo con las
fechas del formulario (nacimiento + fallecimiento)."""
import json
import uuid
from datetime import datetime
from types import SimpleNamespace

import pytest

from app import models
from app.services.image_template_ai import _age_text
from app.utils.pet_age import age_between, age_from_partial_dates, format_age, normalize_form_age
from tests.test_public_form import form_token, _submit  # noqa: F401  (fixture)


def test_unidad_mas_natural():
    assert age_between(datetime(2026, 1, 1), datetime(2026, 1, 11)) == (10, "days")
    assert age_between(datetime(2026, 1, 1), datetime(2026, 2, 26)) == (8, "weeks")
    assert age_between(datetime(2025, 1, 15), datetime(2025, 9, 20)) == (8, "months")
    assert age_between(datetime(2015, 3, 12), datetime(2026, 3, 11)) == (10, "years")
    assert age_between(datetime(2026, 3, 1), datetime(2026, 1, 1)) is None
    assert age_from_partial_dates("2015", "2026-03") == (11, "years")
    assert format_age(1, "years") == "1 año" and format_age(3, "weeks") == "3 semanas"


def test_normalizar_edad_del_formulario():
    pet = {"age": "8", "ageUnit": "months"}
    normalize_form_age(pet)
    assert pet["age"] == "8" and pet["ageUnit"] == "months" and pet["ageAuto"] is False
    pet = {"age": "", "birthDate": "2025-01-15", "deathDate": "2025-09-20"}
    normalize_form_age(pet)
    assert pet["age"] == "8" and pet["ageUnit"] == "months" and pet["ageAuto"] is True
    pet = {"age": "5", "ageUnit": "siglos"}
    normalize_form_age(pet)
    assert pet["ageUnit"] == "years"
    with pytest.raises(ValueError):
        normalize_form_age({"age": "5000"})


def test_texto_para_disenos():
    assert _age_text(SimpleNamespace(age=3, age_unit="weeks", birth_date=None, death_date=None)) == "3 semanas"
    assert _age_text(SimpleNamespace(age=7, age_unit="years", birth_date=None, death_date=None)) == "7 años"


def _last_sub(db, world):
    sub = db.query(models.FormSubmission).filter(models.FormSubmission.tenant_id == world["tenant_a"]) \
        .order_by(models.FormSubmission.id.desc()).first()
    return sub, (sub.pet_data if isinstance(sub.pet_data, dict) else json.loads(sub.pet_data))


def test_formulario_calcula_y_guarda_la_unidad(client, db, auth, world, form_token):
    base = {"name": f"Copito {uuid.uuid4().hex[:5]}", "type": "Felino", "species": "Felino", "size": "Pequeño"}

    # Edad obligatoria vacía, pero con ambas fechas: se calcula
    r = _submit(client, world, form_token, pet={**base, "age": "", "birthDate": "2025-01-15", "deathDate": "2025-09-20"})
    assert r.status_code == 200, r.text
    sub, data = _last_sub(db, world)
    assert data["age"] == "8" and data["ageUnit"] == "months" and data["ageAuto"] is True

    h = auth("a")
    cust = client.post(f"/api/internal/submissions/{sub.id}/create-customer", headers=h).json()["customer_id"]
    pid = client.post(f"/api/internal/submissions/{sub.id}/create-pet?customer_id={cust}", headers=h).json()["pet_id"]
    got = client.get(f"/api/internal/pets/{pid}", headers=h).json()
    assert got["age"] == 8 and got["age_unit"] == "months"

    # Escrita por la familia en semanas
    r = _submit(client, world, form_token, pet={**base, "age": "3", "ageUnit": "weeks"})
    assert r.status_code == 200, r.text
    assert _last_sub(db, world)[1]["ageUnit"] == "weeks"

    # Sin edad ni fechas: la edad es opcional por defecto
    assert _submit(client, world, form_token, pet={**base, "age": ""}).status_code == 200
    # Fallecimiento antes del nacimiento
    assert _submit(client, world, form_token, pet={**base, "age": "", "birthDate": "2025-05", "deathDate": "2025-01"}).status_code == 400


def test_edad_nunca_es_obligatoria():
    from app.services.public_form_config import normalize_form_config
    cfg = normalize_form_config({
        "fields": {"age": {"visible": True, "required": True}},
        "custom_forms": [{"id": "x", "name": "X", "fields": {"age": {"visible": True, "required": True}}}],
    })
    assert cfg["fields"]["age"] == {"visible": True, "required": False}
    assert cfg["custom_forms"][0]["fields"]["age"]["required"] is False

"""Fechas de la mascota con precisión: completa, mes y año o solo el año.
La ficha guarda el día 1 + la precisión; certificado / diseños muestran solo lo
que se sabe; el formulario de la familia acepta «2015», «2015-03» o la fecha."""
import json
import uuid
from datetime import date, datetime
from types import SimpleNamespace

import pytest

from app import models
from app.services.image_template_ai import _pet_date
from app.utils.certificates import generate_image_certificate_html
from app.utils.partial_dates import parse_partial_date, validate_partial_date
from tests.test_public_form import form_token, _submit  # noqa: F401  (fixture)


def _html(**kw):
    res = generate_image_certificate_html(
        background_url="", aspect_ratio="16:9", pet_name="Toby",
        fields=[
            {"id": "b", "type": "fecha_nacimiento", "format": "long", "x": 10, "y": 10},
            {"id": "d", "type": "fecha_fallecimiento", "format": "short", "x": 10, "y": 20},
        ],
        birth_date=datetime(2015, 3, 1), death_date=datetime(2026, 3, 7), **kw,
    )
    return res if isinstance(res, str) else str(res)


def test_certificado_respeta_la_precision():
    html = _html(birth_precision="year")
    assert "2015" in html and "marzo de 2015" not in html
    assert "marzo de 2015" in _html(birth_precision="month") and "1 de marzo de 2015" not in _html(birth_precision="month")
    assert "1 de marzo de 2015" in _html()
    # Override al emitir con su propio formato
    assert "1 de enero de 2012" not in _html(overrides={"b": {"date": "2012-01-01", "format": "year"}})


def test_bindings_de_disenos():
    pet = SimpleNamespace(birth_date=datetime(2015, 3, 1), birth_date_precision="month",
                          death_date=datetime(2026, 3, 7), death_date_precision="year")
    assert _pet_date(pet, "birth") == "marzo de 2015"
    assert _pet_date(pet, "death") == "2026"


def test_fechas_parciales():
    assert parse_partial_date("2015") == (datetime(2015, 1, 1), "year")
    assert parse_partial_date("2015-03") == (datetime(2015, 3, 1), "month")
    assert parse_partial_date("2015-03-12") == (datetime(2015, 3, 12), "day")
    assert parse_partial_date("12/03/2015") == (datetime(2015, 3, 12), "day")
    assert parse_partial_date("2015-13") == (None, "day")
    assert validate_partial_date("2015-3", "x") == "2015-03"
    with pytest.raises(ValueError):
        validate_partial_date(str(date.today().year + 1), "x")
    with pytest.raises(ValueError):
        validate_partial_date("1800", "x")


def test_patch_guarda_la_precision(client, auth):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Toby {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    assert p["birth_date_precision"] == "day"
    r = client.patch(f"/api/internal/pets/{p['id']}", headers=h,
                     json={"birth_date": "2015-03-01T12:00:00", "birth_date_precision": "month"})
    assert r.status_code == 200, r.text
    got = client.get(f"/api/internal/pets/{p['id']}", headers=h).json()
    assert got["birth_date"].startswith("2015-03-01") and got["birth_date_precision"] == "month"
    assert client.patch(f"/api/internal/pets/{p['id']}", headers=h, json={"birth_date_precision": "semana"}).status_code == 422


def test_formulario_de_la_familia_con_fecha_parcial(client, db, auth, world, form_token):
    pet = {"name": f"Copito {uuid.uuid4().hex[:5]}", "type": "Felino", "species": "Felino", "size": "Pequeño", "age": "8",
           "birthDate": "2015", "deathDate": "2026-3"}
    r = _submit(client, world, form_token, pet=pet)
    assert r.status_code == 200, r.text
    sub = db.query(models.FormSubmission).filter(models.FormSubmission.tenant_id == world["tenant_a"]) \
        .order_by(models.FormSubmission.id.desc()).first()
    data = sub.pet_data if isinstance(sub.pet_data, dict) else json.loads(sub.pet_data)
    assert data["birthDate"] == "2015" and data["deathDate"] == "2026-03"

    # Al procesar el registro la ficha queda con la precisión
    h = auth("a")
    cust = client.post(f"/api/internal/submissions/{sub.id}/create-customer", headers=h).json()["customer_id"]
    pid = client.post(f"/api/internal/submissions/{sub.id}/create-pet?customer_id={cust}", headers=h).json()["pet_id"]
    got = client.get(f"/api/internal/pets/{pid}", headers=h).json()
    assert got["birth_date"].startswith("2015-01-01") and got["birth_date_precision"] == "year"
    assert got["death_date"].startswith("2026-03-01") and got["death_date_precision"] == "month"

    # Fecha futura: rechazada
    pet["deathDate"] = f"{date.today().year + 1}"
    assert _submit(client, world, form_token, pet=pet).status_code == 400

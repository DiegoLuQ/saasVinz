"""Fechas de la mascota «solo año»: la ficha guarda el 1 de enero + la marca, y el
certificado / diseños imprimen solo el año aunque el diseño pida la fecha completa."""
import uuid
from datetime import datetime
from types import SimpleNamespace

from app.services.image_template_ai import _pet_date
from app.utils.certificates import generate_image_certificate_html


def _fields():
    return [
        {"id": "b", "type": "fecha_nacimiento", "format": "long", "x": 10, "y": 10},
        {"id": "d", "type": "fecha_fallecimiento", "format": "short", "x": 10, "y": 20},
    ]


def _html(**kw):
    res = generate_image_certificate_html(
        background_url="", aspect_ratio="16:9", fields=_fields(), pet_name="Toby",
        birth_date=datetime(2015, 1, 1), death_date=datetime(2026, 3, 7), **kw,
    )
    return res if isinstance(res, str) else str(res)


def test_certificado_imprime_solo_el_anio():
    html = _html(birth_year_only=True)
    assert "2015" in html and "1 de enero de 2015" not in html
    # La de fallecimiento sigue exacta
    assert "07/03/2026" in html or "7/3/2026" in html or "07-03-2026" in html

    # Sin la marca: fecha completa
    assert "1 de enero de 2015" in _html()


def test_override_al_emitir_con_formato_anio():
    html = _html(overrides={"b": {"date": "2012-01-01", "format": "year"}})
    assert "2012" in html and "1 de enero de 2012" not in html


def test_bindings_de_disenos():
    pet = SimpleNamespace(birth_date=datetime(2015, 1, 1), birth_date_year_only=True,
                          death_date=datetime(2026, 3, 7), death_date_year_only=False)
    assert _pet_date(pet, "birth") == "2015"
    assert _pet_date(pet, "death") != "2026"


def test_patch_guarda_la_marca(client, auth):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Toby {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    assert p["birth_date_year_only"] is False

    r = client.patch(f"/api/internal/pets/{p['id']}", headers=h,
                     json={"birth_date": "2015-01-01T12:00:00", "birth_date_year_only": True})
    assert r.status_code == 200, r.text
    got = client.get(f"/api/internal/pets/{p['id']}", headers=h).json()
    assert got["birth_date"].startswith("2015-01-01") and got["birth_date_year_only"] is True
    assert got["death_date_year_only"] is False

"""Catálogo de planes: el botón «Solicitar este plan» se administra en
Configuración → Formulario y Pesos (form_config.show_plan_request_button)."""
from app import models
from app.services.public_form_config import normalize_form_config


def test_por_defecto_el_boton_es_visible():
    assert normalize_form_config(None)["show_plan_request_button"] is True
    assert normalize_form_config({"show_plan_request_button": False})["show_plan_request_button"] is False


def test_catalogo_publico_respeta_la_configuracion(client, auth, db, world):
    h = auth("a")
    link = client.post("/api/internal/catalog/links", headers=h, json={"catalog_type": "plans"})
    assert link.status_code == 201, link.text
    token = link.json()["token"]
    url = f"/api/public/catalog/crematorio-a/{token}"
    assert client.get(url).json()["show_plan_request"] is True

    tenant = db.query(models.Tenant).get(world["tenant_a"])
    original = tenant.form_config
    tenant.form_config = {**(original or {}), "show_plan_request_button": False}
    db.commit()
    try:
        assert client.get(url).json()["show_plan_request"] is False
    finally:
        tenant.form_config = original
        db.commit()

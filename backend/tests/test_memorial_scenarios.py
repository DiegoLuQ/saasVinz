"""Escenarios de diseño por plan de memorial (rec_plans.features.scenarios): Partner solo
Santuario Sereno; se valida al guardar el diseño y al crear el memorial."""
import uuid

from app.api.internal.memorials import models as mem_models
from tests.test_memorial_signup import _data, _photo


def _catalog(client, h):
    return {p["key"]: p for p in client.get("/api/internal/creator/memorials/plan-catalog", headers=h).json()}


def test_valores_iniciales_y_edicion(client, auth):
    h = auth("creator")
    cat = _catalog(client, h)
    assert cat["partner"]["features"]["scenarios"] == ["normal"]
    assert cat["recuerdo"]["features"]["scenarios"] == ["normal", "altar"]
    assert cat["infinito"]["features"]["scenarios"] == ["normal", "altar", "cielo", "constelacion"]
    pid = cat["recuerdo"]["id"]
    try:
        r = client.put(f"/api/internal/creator/memorials/plan-catalog/{pid}",
                       json={"features": {"scenarios": ["constelacion", "inventado", "normal"]}}, headers=h)
        assert r.status_code == 200, r.text
        assert r.json()["features"]["scenarios"] == ["normal", "constelacion"]  # orden fijo, sin inválidos
        r = client.put(f"/api/internal/creator/memorials/plan-catalog/{pid}", json={"features": {"scenarios": []}}, headers=h)
        assert r.json()["features"]["scenarios"] == ["normal"]  # nunca queda vacío
    finally:
        client.put(f"/api/internal/creator/memorials/plan-catalog/{pid}",
                   json={"features": {"scenarios": ["normal", "altar"]}}, headers=h)


def test_guardar_diseno_respeta_el_plan(client, auth, db):
    h = auth("creator")
    pet = f"Esc{uuid.uuid4().hex[:5]}"
    res = client.post("/api/internal/creator/memorials/new", data={"data": _data(pet, plan="recuerdo")}, files=[_photo()], headers=h)
    assert res.status_code == 200, res.text
    m = db.query(mem_models.Memorial).filter(mem_models.Memorial.id_recuerdo == res.json()["id_recuerdo"]).first()
    url = f"/api/internal/memorials/{m.id_recuerdo}/manage"
    key = {"access-key": m.access_key}
    bad = client.patch(url, headers=key, json={"diseno": {"tipo_diseno": "constelacion"}})
    assert bad.status_code == 400 and "no está incluido" in bad.json()["detail"]
    ok = client.patch(url, headers=key, json={"diseno": {"tipo_diseno": "normal"}})
    assert ok.status_code == 200, ok.text
    assert ok.json()["plan_features"]["scenarios"] == ["normal", "altar"]


def test_crear_con_diseno_no_incluido(client, auth):
    res = client.post("/api/internal/creator/memorials/new",
                      data={"data": _data(f"X{uuid.uuid4().hex[:5]}", plan="recuerdo",
                                          design={"scenario": "cielo", "theme": "cielo", "effect": "plumas"})},
                      files=[_photo()], headers=auth("creator"))
    assert res.status_code == 400

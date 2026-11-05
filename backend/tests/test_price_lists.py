"""Tablas de precios (promociones): cada enlace del catálogo de planes elige una;
el catálogo, el formulario abierto desde el enlace y la solicitud usan esos precios."""
from datetime import timedelta

import pytest

from app import models
from app.api.internal.catalog.models import CatalogShareToken
from app.utils import tz
from tests.test_plan_weight_prices import tabla, _modo, _enviar, _guardar_tabla  # noqa: F401  (fixture)


@pytest.fixture
def promo(client, tabla, db):
    t1, t2, _ = tabla["tiers"]
    r = client.post("/api/internal/price-lists", headers=tabla["h"], json={
        "name": "Promo Diciembre",
        "tier_prices": {str(t1): 1000, "999999": 5},  # tramo inexistente: se descarta
        "plan_prices": {str(tabla["plan_id"]): {str(t2): 70000}},
    })
    assert r.status_code == 200, r.text
    pl = r.json()
    link = client.post("/api/internal/catalog/links", headers=tabla["h"],
                       json={"catalog_type": "plans", "name": "promo-test", "price_list_id": pl["id"]})
    assert link.status_code == 201, link.text
    yield {**tabla, "list": pl, "link": link.json()}
    db.rollback()
    db.query(CatalogShareToken).filter(CatalogShareToken.name == "promo-test").delete()
    db.query(models.PriceList).filter(models.PriceList.tenant_id == tabla["tid"]).delete()
    db.commit()


def _catalogo(client, token):
    return client.get(f"/api/public/catalog/crematorio-a/{token}").json()


def test_crud_y_validaciones(client, promo):
    h = promo["h"]
    t1 = promo["tiers"][0]
    assert promo["list"]["tier_prices"] == {str(t1): 1000}
    assert promo["list"]["status"] == "activa"
    assert promo["link"]["price_list_name"] == "Promo Diciembre"
    assert client.post("/api/internal/price-lists", headers=h, json={"name": "general"}).status_code == 400
    assert client.post("/api/internal/price-lists", headers=h, json={"name": "promo diciembre"}).status_code == 400
    hoy = tz.get_now().date()
    r = client.post("/api/internal/price-lists", headers=h, json={
        "name": "Fechas malas", "valid_from": str(hoy), "valid_until": str(hoy - timedelta(days=1))})
    assert r.status_code == 400
    lista = client.get("/api/internal/price-lists", headers=h).json()
    assert [x["links"] for x in lista if x["id"] == promo["list"]["id"]] == [1]


def test_catalogo_usa_la_promo_en_modo_recargo(client, promo, db):
    t1, t2, _ = promo["tiers"]
    _modo(db, promo["tid"], "surcharge")
    tiers = {t["id"]: t["price"] for t in _catalogo(client, promo["link"]["token"])["weight_tiers"]}
    assert tiers[t1] == 1000      # promo
    assert tiers[t2] == 8000      # vacío = General


def test_catalogo_y_formulario_usan_la_promo_en_modo_tabla(client, promo, db):
    t1, t2, _ = promo["tiers"]
    _modo(db, promo["tid"], "table")
    _guardar_tabla(client, promo, {str(t1): 87000, str(t2): 90000})
    plan = next(p for p in _catalogo(client, promo["link"]["token"])["plans"] if p["id"] == promo["plan_id"])
    assert plan["weight_prices"] == {str(t1): 87000, str(t2): 70000}
    # El formulario abierto desde el enlace (token) ve lo mismo; sin token, la General
    svc = client.get(f"/api/public/tenant/crematorio-a/services?token={promo['link']['token']}").json()
    assert next(s for s in svc if s["id"] == f"plan_{promo['plan_id']}")["weight_prices"][str(t2)] == 70000
    svc = client.get("/api/public/tenant/crematorio-a/services").json()
    assert next(s for s in svc if s["id"] == f"plan_{promo['plan_id']}")["weight_prices"][str(t2)] == 90000


def test_solicitud_congela_precio_de_la_promo(client, promo, db, world):
    t1, t2, _ = promo["tiers"]
    _modo(db, promo["tid"], "table")
    sub = _enviar(client, db, world, promo["link"]["token"], promo["plan_id"], weightTierId=str(t2))
    plan = next(i for i in sub.selected_services if i.get("type") == "plan")
    assert plan["price"] == 70000
    assert sub.pet_data["priceList"]["name"] == "Promo Diciembre"

    _modo(db, promo["tid"], "surcharge")
    sub = _enviar(client, db, world, promo["link"]["token"], promo["plan_id"], weightTierId=str(t1))
    assert sub.pet_data["weightTier"]["price"] == 1000


def test_promo_vencida_vuelve_a_la_general(client, promo, db):
    t1 = promo["tiers"][0]
    _modo(db, promo["tid"], "surcharge")
    ayer = tz.get_now().date() - timedelta(days=1)
    r = client.put(f"/api/internal/price-lists/{promo['list']['id']}", headers=promo["h"], json={
        "name": "Promo Diciembre", "tier_prices": {str(t1): 1000}, "valid_until": str(ayer)})
    assert r.status_code == 200 and r.json()["status"] == "vencida"
    tiers = {t["id"]: t["price"] for t in _catalogo(client, promo["link"]["token"])["weight_tiers"]}
    assert tiers[t1] == 5000


def test_otro_crematorio_no_usa_ni_ve_la_tabla(client, auth, promo):
    hb = auth("b")
    assert promo["list"]["id"] not in [x["id"] for x in client.get("/api/internal/price-lists", headers=hb).json()]
    r = client.post("/api/internal/catalog/links", headers=hb,
                    json={"catalog_type": "plans", "name": "promo-test", "price_list_id": promo["list"]["id"]})
    assert r.status_code == 404
    assert client.delete(f"/api/internal/price-lists/{promo['list']['id']}", headers=hb).status_code == 404


def test_borrar_tabla_deja_el_enlace_en_general(client, promo, db):
    assert client.delete(f"/api/internal/price-lists/{promo['list']['id']}", headers=promo["h"]).status_code == 204
    db.expire_all()
    tok = db.query(CatalogShareToken).filter(CatalogShareToken.id == promo["link"]["id"]).one()
    assert tok.price_list_id is None

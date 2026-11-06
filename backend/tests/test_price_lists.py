"""Tablas de precios (promociones): independientes de la General, con sus propios
rangos de peso y el precio de cada plan por rango. Cada enlace del catálogo de
planes elige una; el catálogo, el formulario abierto desde el enlace, la solicitud
y la orden creada desde ella usan esos rangos y precios."""
from datetime import timedelta

import pytest

from app import models
from app.api.internal.catalog.models import CatalogShareToken
from app.utils import tz
from tests.test_plan_weight_prices import tabla, _modo, _enviar  # noqa: F401  (fixture)


@pytest.fixture
def promo(client, tabla, db):
    r = client.post("/api/internal/price-lists", headers=tabla["h"], json={
        "name": "Promo Diciembre",
        "tiers": [
            {"label": "Mini", "min_weight": 0, "max_weight": 1},
            {"label": "Resto", "min_weight": 1.1, "max_weight": None},
        ],
        # null = precio base del plan; plan inexistente se descarta
        "plan_prices": {str(tabla["plan_id"]): [40000, None], "999999": [1]},
    })
    assert r.status_code == 200, r.text
    pl = r.json()
    link = client.post("/api/internal/catalog/links", headers=tabla["h"],
                       json={"catalog_type": "plans", "name": "promo-test", "price_list_id": pl["id"]})
    assert link.status_code == 201, link.text
    yield {**tabla, "list": pl, "link": link.json(), "ptiers": [t["id"] for t in pl["tiers"]]}
    db.rollback()
    db.query(CatalogShareToken).filter(CatalogShareToken.name == "promo-test").delete()
    db.query(models.CremationFinancial).filter(models.CremationFinancial.tenant_id == tabla["tid"]) \
        .update({models.CremationFinancial.price_list_id: None})
    db.query(models.WeightPricing).filter(models.WeightPricing.price_list_id.isnot(None),
                                          models.WeightPricing.tenant_id == tabla["tid"]).delete()
    db.query(models.PriceList).filter(models.PriceList.tenant_id == tabla["tid"]).delete()
    db.commit()


def _catalogo(client, token):
    return client.get(f"/api/public/catalog/crematorio-a/{token}").json()


def test_crud_y_validaciones(client, promo):
    h = promo["h"]
    mini, resto = promo["ptiers"]
    assert [t["label"] for t in promo["list"]["tiers"]] == ["Mini", "Resto"]
    assert set(promo["ptiers"]).isdisjoint(promo["tiers"])  # rangos propios, no los de la General
    assert promo["list"]["plan_prices"] == {str(promo["plan_id"]): {str(mini): 40000}}
    assert promo["list"]["status"] == "activa"
    assert promo["link"]["price_list_name"] == "Promo Diciembre"
    assert client.post("/api/internal/price-lists", headers=h, json={"name": "general", "tiers": [{"max_weight": 5}]}).status_code == 400
    assert client.post("/api/internal/price-lists", headers=h, json={"name": "promo diciembre", "tiers": [{"max_weight": 5}]}).status_code == 400
    assert client.post("/api/internal/price-lists", headers=h, json={"name": "Sin rangos"}).status_code == 400
    assert client.post("/api/internal/price-lists", headers=h, json={
        "name": "Solapada", "tiers": [{"min_weight": 0, "max_weight": 5}, {"min_weight": 3, "max_weight": 9}]}).status_code == 400
    hoy = tz.get_now().date()
    r = client.post("/api/internal/price-lists", headers=h, json={
        "name": "Fechas malas", "tiers": [{"max_weight": 5}],
        "valid_from": str(hoy), "valid_until": str(hoy - timedelta(days=1))})
    assert r.status_code == 400
    lista = client.get("/api/internal/price-lists", headers=h).json()
    assert [x["links"] for x in lista if x["id"] == promo["list"]["id"]] == [1]
    # Los rangos de la General no cambian
    general = client.get("/api/internal/maintenance/weight-pricing", headers=h).json()
    assert [t["id"] for t in general] == promo["tiers"]

    # Editar conserva los ids de los rangos por posición
    r = client.put(f"/api/internal/price-lists/{promo['list']['id']}", headers=h, json={
        "name": "Promo Diciembre", "tiers": [{"label": "Mini", "min_weight": 0, "max_weight": 1.5}],
        "plan_prices": {str(promo["plan_id"]): [45000]}})
    assert r.status_code == 200, r.text
    assert [t["id"] for t in r.json()["tiers"]] == [mini]
    assert r.json()["plan_prices"] == {str(promo["plan_id"]): {str(mini): 45000}}


@pytest.mark.parametrize("mode", ["surcharge", "table"])
def test_catalogo_usa_rangos_y_precios_de_la_tabla(client, promo, db, mode):
    mini, resto = promo["ptiers"]
    _modo(db, promo["tid"], mode)  # la tabla siempre cobra por plan y peso
    data = _catalogo(client, promo["link"]["token"])
    assert [t["id"] for t in data["weight_tiers"]] == [mini, resto]
    assert all("price" not in t or not t["price"] for t in data["weight_tiers"])
    plan = next(p for p in data["plans"] if p["id"] == promo["plan_id"])
    assert plan["weight_prices"] == {str(mini): 40000}  # «Resto» vacío = precio base


def test_formulario_desde_el_enlace_usa_la_tabla(client, promo, db):
    mini, resto = promo["ptiers"]
    _modo(db, promo["tid"], "surcharge")
    tok = promo["link"]["token"]
    info = client.get(f"/api/public/tenant/crematorio-a?token={tok}").json()
    assert info["form_config"]["weight_pricing_mode"] == "table"
    assert [t["id"] for t in info["weight_tiers"]] == [mini, resto]
    svc = client.get(f"/api/public/tenant/crematorio-a/services?token={tok}").json()
    assert next(s for s in svc if s["id"] == f"plan_{promo['plan_id']}")["weight_prices"] == {str(mini): 40000}
    # Sin token: la General
    info = client.get("/api/public/tenant/crematorio-a").json()
    assert info["form_config"]["weight_pricing_mode"] == "surcharge"
    assert [t["id"] for t in info["weight_tiers"]] == promo["tiers"]


def test_solicitud_y_orden_congelan_la_tabla(client, promo, db, world):
    mini, resto = promo["ptiers"]
    _modo(db, promo["tid"], "surcharge")
    sub = _enviar(client, db, world, promo["link"]["token"], promo["plan_id"], weightTierId=str(mini))
    plan = next(i for i in sub.selected_services if i.get("type") == "plan")
    assert plan["price"] == 40000
    assert sub.pet_data["priceList"]["name"] == "Promo Diciembre"
    assert sub.pet_data["weightTier"]["price"] == 0  # sin recargo

    sub2 = _enviar(client, db, world, promo["link"]["token"], promo["plan_id"], weightKg="0,8")
    assert next(i for i in sub2.selected_services if i.get("type") == "plan")["price"] == 40000
    assert sub2.pet_data["weightTier"]["id"] == mini
    sub3 = _enviar(client, db, world, promo["link"]["token"], promo["plan_id"], weightTierId=str(resto))
    assert next(i for i in sub3.selected_services if i.get("type") == "plan")["price"] == 87000  # base

    # Procesar hasta la orden: recuerda la tabla y no suma recargo
    h = promo["h"]
    cust = client.post(f"/api/internal/submissions/{sub.id}/create-customer", headers=h).json()["customer_id"]
    pet = client.post(f"/api/internal/submissions/{sub.id}/create-pet?customer_id={cust}", headers=h).json()["pet_id"]
    r = client.post(f"/api/internal/submissions/{sub.id}/create-services?pet_id={pet}", headers=h)
    assert r.status_code == 200, r.text
    oc = db.query(models.CremationOC).filter(models.CremationOC.pet_id == pet).one()
    assert oc.financial.price_list_id == promo["list"]["id"]
    assert (oc.financial.weight_price or 0) == 0
    try:
        det = client.get(f"/api/internal/cremations/{oc.id}", headers=h).json()
        assert det["price_list"]["name"] == "Promo Diciembre"
        assert [t["id"] for t in det["price_list"]["tiers"]] == [mini, resto]
        assert det["price_list"]["plan_prices"] == {str(promo["plan_id"]): {str(mini): 40000}}
    finally:
        assert client.delete(f"/api/internal/cremations/{oc.id}?scope=all", headers=h).status_code in (200, 204)


def test_promo_vencida_vuelve_a_la_general(client, promo, db):
    _modo(db, promo["tid"], "surcharge")
    ayer = tz.get_now().date() - timedelta(days=1)
    r = client.put(f"/api/internal/price-lists/{promo['list']['id']}", headers=promo["h"], json={
        "name": "Promo Diciembre", "tiers": [{"max_weight": 1}, {"min_weight": 1.1}], "valid_until": str(ayer)})
    assert r.status_code == 200 and r.json()["status"] == "vencida"
    tiers = {t["id"]: t["price"] for t in _catalogo(client, promo["link"]["token"])["weight_tiers"]}
    assert list(tiers) == promo["tiers"] and tiers[promo["tiers"][0]] == 5000


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
    assert db.query(models.WeightPricing).filter(models.WeightPricing.id.in_(promo["ptiers"])).count() == 0


def _form_config(client, h, **changes):
    cfg = client.get("/api/internal/maintenance/form-config", headers=h).json()
    body = {
        "phases": cfg["phases"],
        "fields": {f["key"]: {"visible": f["visible"], "required": f["required"]} for f in cfg["fields"]},
        "show_weight_prices": cfg["show_weight_prices"], "show_service_prices": cfg["show_service_prices"],
        "show_plan_request_button": cfg["show_plan_request_button"], "weight_pricing_mode": cfg["weight_pricing_mode"],
        "price_list_id": cfg.get("price_list_id"), "memories": cfg["memories"], "delivery_notice": cfg["delivery_notice"],
        "welcome_modal": None, "custom_forms": cfg["custom_forms"],
    }
    body.update(changes)
    return client.put("/api/internal/maintenance/form-config", headers=h, json=body)


def test_formulario_elige_su_tabla(client, promo, db):
    h, mini, resto = promo["h"], *promo["ptiers"]
    _modo(db, promo["tid"], "surcharge")
    try:
        # Formulario principal con la tabla: sin token ya usa sus rangos y precios
        r = _form_config(client, h, price_list_id=promo["list"]["id"])
        assert r.status_code == 200, r.text
        assert r.json()["price_list_id"] == promo["list"]["id"]
        info = client.get("/api/public/tenant/crematorio-a").json()
        assert info["form_config"]["weight_pricing_mode"] == "table"
        assert [t["id"] for t in info["weight_tiers"]] == [mini, resto]

        # Formulario personalizado: hereda la del principal o usa la General si elige otra
        r = _form_config(client, h, price_list_id=None, custom_forms=[
            {"id": "pf-promo", "name": "Promo", "price_list_id": promo["list"]["id"]},
            {"id": "pf-normal", "name": "Normal"},
        ])
        assert r.status_code == 200, r.text
        assert [t["id"] for t in client.get("/api/public/tenant/crematorio-a?form=pf-promo").json()["weight_tiers"]] == [mini, resto]
        assert [t["id"] for t in client.get("/api/public/tenant/crematorio-a?form=pf-normal").json()["weight_tiers"]] == promo["tiers"]
        svc = client.get("/api/public/tenant/crematorio-a/services?form=pf-promo").json()
        assert next(s for s in svc if s["id"] == f"plan_{promo['plan_id']}")["weight_prices"] == {str(mini): 40000}

        # Una tabla de otro crematorio no se acepta
        assert _form_config(client, h, price_list_id=999999).status_code == 400

        # Borrar la tabla devuelve los formularios a la General
        assert client.delete(f"/api/internal/price-lists/{promo['list']['id']}", headers=h).status_code == 204
        cfg = client.get("/api/internal/maintenance/form-config", headers=h).json()
        assert next(cf for cf in cfg["custom_forms"] if cf["id"] == "pf-promo")["price_list_id"] is None
    finally:
        db.rollback()
        t = db.query(models.Tenant).get(promo["tid"])
        t.form_config = {k: v for k, v in (t.form_config or {}).items() if k not in ("price_list_id", "custom_forms")}
        db.commit()

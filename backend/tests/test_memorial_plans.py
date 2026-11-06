"""Planes de memorial editables desde Admin: precio congelado por memorial, límites por plan,
Partner sin precio, y solo el SuperAdmin edita."""
from app.api.internal.memorials import models as mem_models
from app.services import memorial_plans


def _catalog(client, h):
    return {p["key"]: p for p in client.get("/api/internal/creator/memorials/plan-catalog", headers=h).json()}


def test_catalogo_y_precio_congelado(client, world, auth, db):
    h = auth("creator")
    cat = _catalog(client, h)
    assert set(cat) >= {"partner", "recuerdo", "eterno", "infinito"}
    assert cat["infinito"]["billing"] == "one_time" and cat["eterno"]["features"]["max_timeline"] == 50
    eterno_id = cat["eterno"]["id"]
    old_price = cat["eterno"]["price"]

    from tests.test_memorial_signup import _data, _photo
    res = client.post("/api/internal/creator/memorials/new", data={"data": _data("Precio", plan="eterno")},
                      files=[_photo()], headers=h)
    assert res.status_code == 200, res.text
    m = db.query(mem_models.Memorial).filter(mem_models.Memorial.id_recuerdo == res.json()["id_recuerdo"]).first()
    assert m.plan_price == old_price and m.plan_billing == "yearly"
    try:
        r = client.put(f"/api/internal/creator/memorials/plan-catalog/{eterno_id}",
                       json={"price": old_price + 20, "features": {"max_dedications": 55, "qr": True, "inventado": 9}}, headers=h)
        assert r.status_code == 200, r.text
        assert r.json()["price"] == old_price + 20 and r.json()["features"]["max_dedications"] == 55
        assert "inventado" not in r.json()["features"]
        db.expire_all()
        m = db.get(mem_models.Memorial, m.id)
        assert m.plan_price == old_price  # el cliente actual mantiene su precio
        assert memorial_plans.limits(db, m)["max_dedications"] == 55  # los límites sí siguen al plan
    finally:
        client.put(f"/api/internal/creator/memorials/plan-catalog/{eterno_id}",
                   json={"price": old_price, "features": {"max_dedications": 50}}, headers=h)


def test_partner_sin_precio_y_solo_creator(client, world, auth):
    h = auth("creator")
    partner = _catalog(client, h)["partner"]
    r = client.put(f"/api/internal/creator/memorials/plan-catalog/{partner['id']}",
                   json={"price": 99, "billing": "yearly", "features": {"max_images": 4}}, headers=h)
    assert r.status_code == 200 and r.json()["price"] == 0 and r.json()["billing"] == "included"
    assert r.json()["features"]["max_images"] == 4
    client.put(f"/api/internal/creator/memorials/plan-catalog/{partner['id']}", json={"features": {"max_images": 3}}, headers=h)
    assert client.get("/api/internal/creator/memorials/plan-catalog", headers=auth("a")).status_code in (401, 403)
    assert client.put(f"/api/internal/creator/memorials/plan-catalog/{partner['id']}", json={"price": 1},
                      headers=auth("a")).status_code in (401, 403)


def test_cobro_invalido(client, world, auth):
    h = auth("creator")
    rid = _catalog(client, h)["recuerdo"]["id"]
    assert client.put(f"/api/internal/creator/memorials/plan-catalog/{rid}", json={"billing": "monthly"}, headers=h).status_code == 400

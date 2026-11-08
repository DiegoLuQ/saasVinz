"""Catálogo de productos: etiqueta destacada (badge) y «veces comprado»
(unidades en órdenes no canceladas)."""
import secrets
import uuid

from app.api.internal.catalog.models import CatalogShareToken
from tests.test_stock import _pet


def test_badge_y_veces_comprado(client, auth, db, world):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    p = client.post("/api/internal/products", headers=h, json={
        "name": f"Urna {tag}", "cost_price": 0, "sale_price": 20000, "stock": 10, "badge": "  Popular  "}).json()
    assert p["badge"] == "Popular"

    for i, status in enumerate(["pendiente", "entregado", "pendiente"]):
        r = client.post("/api/internal/cremations", headers=h, json={"pet_id": _pet(client, h, f"{tag}{i}"), "status": status,
                        "products": [{"product_id": p["id"], "quantity": 2, "unit_price": 20000, "precio_costo": 0}]})
        assert r.status_code == 200, r.text
        last = r.json()["id"]
    # Una cancelada no cuenta
    assert client.patch(f"/api/internal/cremations/{last}", headers=h, json={"status": "cancelado"}).status_code == 200

    link = CatalogShareToken(tenant_id=world["tenant_a"], token=secrets.token_urlsafe(16),
                             catalog_type="products", is_active=True, views_count=0)
    db.add(link)
    db.commit()
    data = client.get(f"/api/public/catalog/crematorio-a/{link.token}").json()
    item = next(x for x in data["products"] if x["id"] == p["id"])
    assert item["badge"] == "Popular" and item["times_purchased"] == 4

    # El crematorio puede ocultar el conteo
    assert client.patch(f"/api/internal/products/{p['id']}", headers=h, json={"show_purchases": False}).status_code == 200
    data = client.get(f"/api/public/catalog/crematorio-a/{link.token}").json()
    assert next(x for x in data["products"] if x["id"] == p["id"])["times_purchased"] is None

    # Quitar la etiqueta
    r = client.patch(f"/api/internal/products/{p['id']}", headers=h, json={"badge": ""})
    assert r.status_code == 200 and r.json()["badge"] is None

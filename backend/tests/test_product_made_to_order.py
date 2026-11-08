"""Productos: código automático (carga masiva por imágenes), nota y «a pedido»
(no se bloquea por stock en las órdenes y se muestra como «A pedido»)."""
import uuid

from app import models
from tests.test_stock import _pet


def test_codigo_automatico_nota_y_a_pedido(client, auth, db, world):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    r = client.post("/api/internal/products", headers=h, json={
        "name": f"Ánfora mármol {tag}", "cost_price": 0, "sale_price": 45000, "stock": 0,
        "description": "Mármol blanco", "note": "  Demora 10 días  ", "made_to_order": True})
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["code"].startswith("P-") and p["note"] == "Demora 10 días"
    assert p["made_to_order"] is True and p["availability_status"] == "A pedido"

    # Otro sin código: código distinto
    q = client.post("/api/internal/products", headers=h, json={
        "name": f"Ánfora roble {tag}", "cost_price": 0, "sale_price": 1, "stock": 3}).json()
    assert q["code"].startswith("P-") and q["code"] != p["code"] and q["made_to_order"] is False

    # Una orden con el producto a pedido no se bloquea aunque no haya stock
    pet = _pet(client, h, tag)
    r = client.post("/api/internal/cremations", headers=h, json={"pet_id": pet, "status": "pendiente", "products": [
        {"product_id": p["id"], "quantity": 2, "unit_price": 45000, "precio_costo": 0}]})
    assert r.status_code == 200, r.text
    db.expire_all()
    prod = db.query(models.Product).get(p["id"])
    assert prod.availability_status == "A pedido"

    # Deja de ser a pedido: vuelve a su estado por stock
    r = client.patch(f"/api/internal/products/{p['id']}", headers=h, json={"made_to_order": False, "code": ""})
    assert r.status_code == 200 and r.json()["availability_status"] == "Agotado" and r.json()["code"] == p["code"], r.text

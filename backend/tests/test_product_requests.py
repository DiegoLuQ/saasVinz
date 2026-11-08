"""Solicitudes de productos desde el catálogo público (carrito): ligadas a la orden
con ?ref= (token de seguimiento) o compras externas con nombre + WhatsApp."""
import secrets
import uuid

import pytest

from app import models
from app.api.internal.catalog.models import CatalogShareToken, ProductRequest


@pytest.fixture
def shop(client, auth, db, world):
    tag = uuid.uuid4().hex[:6]
    tid = world["tenant_a"]
    rel = models.Product(tenant_id=tid, code=f"R{tag}", name=f"Relicario {tag}", sale_price=25000, cost_price=5000, stock=3)
    urn = models.Product(tenant_id=tid, code=f"A{tag}", name=f"Ánfora {tag}", sale_price=40000, cost_price=9000,
                         stock=0, made_to_order=True)
    link = CatalogShareToken(tenant_id=tid, token=secrets.token_urlsafe(16), catalog_type="products", is_active=True, views_count=0)
    db.add_all([rel, urn, link])
    db.commit()

    h = auth("a")
    c = client.post("/api/internal/customers", headers=h,
                    json={"name": f"Familia {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Sufia {tag}", "species": "Felino", "customer_id": c["id"]}).json()
    o = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente"}).json()
    cr = db.query(models.Cremation).get(o["id"])
    db.refresh(cr)
    return {"tag": tag, "rel": rel.id, "urn": urn.id, "link": link.token, "order": o["id"],
            "ref": cr.details.tracking_token, "pet": p["name"]}


def _base(s):
    return f"/api/public/catalog/crematorio-a/{s['link']}"


def _stock(db, pid):
    db.expire_all()
    return db.query(models.Product).get(pid).stock


def test_solicitud_ligada_a_la_orden(client, auth, db, shop):
    h = auth("a")
    cat = client.get(_base(shop), params={"ref": shop["ref"]}).json()
    assert cat["order_ref"] == {"pet_name": shop["pet"], "can_request": True}
    assert client.get(_base(shop), params={"ref": "no-existe"}).json()["order_ref"] is None

    r = client.post(f"{_base(shop)}/requests", json={
        "ref": shop["ref"], "items": [{"product_id": shop["rel"], "qty": 2}, {"product_id": shop["urn"], "qty": 1}]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["kind"] == "order" and body["total"] == 90000 and body["code"].startswith("PC-")
    assert _stock(db, shop["rel"]) == 3  # no se descuenta al solicitar

    notif = db.query(models.Notification).filter(models.Notification.type == "product_request").order_by(models.Notification.id.desc()).first()
    assert shop["pet"] in notif.message and notif.audience == "ordenes"

    req_id = body["id"]
    detail = client.get(f"/api/internal/product-requests/{req_id}", headers=h).json()
    assert detail["cremation"]["id"] == shop["order"] and detail["whatsapp_url"].startswith("https://wa.me/56912345678")

    acc = client.post(f"/api/internal/product-requests/{req_id}/accept", headers=h)
    assert acc.status_code == 200, acc.text
    assert acc.json()["status"] == "accepted"
    assert _stock(db, shop["rel"]) == 1
    lines = db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id == shop["order"]).all()
    assert sorted((l.product_id, l.cantidad, l.precio_venta) for l in lines) == sorted(
        [(shop["rel"], 2, 25000.0), (shop["urn"], 1, 40000.0)])
    fin = db.query(models.CremationFinancial).filter(models.CremationFinancial.cremation_id == shop["order"]).first()
    assert fin.total_price >= 90000
    assert client.post(f"/api/internal/product-requests/{req_id}/accept", headers=h).status_code == 409
    # Otro crematorio no la ve
    assert client.get(f"/api/internal/product-requests/{req_id}", headers=auth("b")).status_code == 404


def test_orden_entregada_no_recibe_solicitudes(client, db, shop):
    cr = db.query(models.Cremation).get(shop["order"])
    cr.status = "entregado"
    db.commit()
    assert client.get(_base(shop), params={"ref": shop["ref"]}).json()["order_ref"]["can_request"] is False
    r = client.post(f"{_base(shop)}/requests", json={"ref": shop["ref"], "items": [{"product_id": shop["rel"], "qty": 1}]})
    assert r.status_code == 409


def test_sin_stock_no_se_puede_pedir(client, shop):
    r = client.post(f"{_base(shop)}/requests", json={"ref": shop["ref"], "items": [{"product_id": shop["rel"], "qty": 4}]})
    assert r.status_code == 409 and "quedan 3" in r.json()["detail"]


def test_compra_externa(client, auth, db, shop):
    h = auth("a")
    base = f"{_base(shop)}/requests"
    assert client.post(base, json={"items": [{"product_id": shop["rel"], "qty": 1}]}).status_code == 400  # sin nombre/WhatsApp
    item = [{"product_id": shop["rel"], "qty": 1}]
    assert client.post(base, json={"items": item, "contact_name": "<script>", "contact_phone": "12345678"}).status_code == 400
    assert client.post(base, json={"items": item, "contact_name": "Ana 2", "contact_phone": "12345678"}).status_code == 400
    assert client.post(base, json={"items": item, "contact_name": "Ana", "contact_phone": "1234"}).status_code == 400
    assert client.post(base, json={"items": item, "contact_name": "A" * 101, "contact_phone": "12345678"}).status_code == 422
    phone = "+56 9 " + str(uuid.uuid4().int)[:8]
    r = client.post(base, json={"items": [{"product_id": shop["rel"], "qty": 1}],
                                "contact_name": "Percy Rojas", "contact_phone": phone, "note": "Con grabado"})
    assert r.status_code == 200, r.text
    assert r.json()["kind"] == "external"
    saved = db.query(ProductRequest).get(r.json()["id"])
    assert saved.contact_phone == "+569" + phone[-8:] and saved.note == "Con grabado"
    rid = r.json()["id"]

    lst = client.get("/api/internal/product-requests", headers=h, params={"kind": "external", "status": "pending"}).json()
    assert any(i["id"] == rid for i in lst["items"]) and lst["counts"]["pending"] >= 1

    client.post(f"/api/internal/product-requests/{rid}/accept", headers=h)
    db.expire_all()
    req = db.query(ProductRequest).get(rid)
    assert req.status == "accepted" and req.customer_id
    assert db.query(models.Customer).get(req.customer_id).name == "Percy Rojas"
    assert _stock(db, shop["rel"]) == 2
    # Cuenta en «Comprado N veces»
    prod = next(p for p in client.get(_base(shop)).json()["products"] if p["id"] == shop["rel"])
    assert prod["times_purchased"] >= 1

    assert client.post(f"/api/internal/product-requests/{rid}/cancel", headers=h).json()["status"] == "cancelled"
    assert _stock(db, shop["rel"]) == 3  # vuelve el stock


def test_rechazar_y_entregar(client, auth, db, shop):
    h = auth("a")
    base = f"{_base(shop)}/requests"
    mk = lambda: client.post(base, json={"items": [{"product_id": shop["urn"], "qty": 1}],
                                         "contact_name": "Ana", "contact_phone": "987654321"}).json()["id"]
    a, b = mk(), mk()
    assert client.post(f"/api/internal/product-requests/{a}/reject", headers=h, json={"reason": "Sin material"}).json()["status"] == "rejected"
    client.post(f"/api/internal/product-requests/{b}/accept", headers=h)
    assert client.post(f"/api/internal/product-requests/{b}/deliver", headers=h).json()["status"] == "delivered"


def test_solicitud_sobre_registro_pasa_a_la_orden(client, auth, db, world, shop):
    """Desde el correo del formulario el enlace lleva el código del registro."""
    sub = models.FormSubmission(tenant_id=world["tenant_a"], slug="crematorio-a", owner_data={"fullName": "X"},
                                pet_data={"name": "Kira"}, code=f"S{uuid.uuid4().hex[:10]}", status="pending")
    db.add(sub)
    db.commit()
    assert client.get(_base(shop), params={"ref": sub.code}).json()["order_ref"]["pet_name"] == "Kira"
    rid = client.post(f"{_base(shop)}/requests", json={"ref": sub.code, "items": [{"product_id": shop["urn"], "qty": 1}]}).json()["id"]
    h = auth("a")
    assert client.post(f"/api/internal/product-requests/{rid}/accept", headers=h).status_code == 409  # aún sin orden

    # Al procesarse el registro (pet_id) la solicitud queda ligada a la orden de esa mascota
    cr = db.query(models.Cremation).get(shop["order"])
    sub.pet_id = cr.pet_id
    db.commit()
    lst = client.get("/api/internal/product-requests", headers=h).json()["items"]
    assert next(i for i in lst if i["id"] == rid)["cremation"]["id"] == shop["order"]
    assert client.post(f"/api/internal/product-requests/{rid}/accept", headers=h).status_code == 200


def test_bootstrap_cuenta_solicitudes_pendientes(client, auth, shop):
    h = auth("a")
    before = client.get("/api/internal/auth/bootstrap", headers=h).json()["metadata"]["pending_product_requests"]
    client.post(f"{_base(shop)}/requests", json={"ref": shop["ref"], "items": [{"product_id": shop["rel"], "qty": 1}]})
    after = client.get("/api/internal/auth/bootstrap", headers=h).json()["metadata"]["pending_product_requests"]
    assert after == before + 1


def test_aceptar_y_descartar_producto_por_producto(client, auth, db, shop):
    h = auth("a")
    r = client.post(f"{_base(shop)}/requests", json={
        "ref": shop["ref"], "items": [{"product_id": shop["rel"], "qty": 1}, {"product_id": shop["urn"], "qty": 1}]}).json()
    rid = r["id"]
    detail = client.get(f"/api/internal/product-requests/{rid}", headers=h).json()
    assert [it["state"] for it in detail["items"]] == ["pending", "pending"]
    assert detail["items"][0]["stock"] == 3 and detail["items"][1]["made_to_order"] is True

    # Agrega solo el relicario: sigue pendiente, descuenta su stock y suma a la orden
    a = client.post(f"/api/internal/product-requests/{rid}/items/0/accept", headers=h)
    assert a.status_code == 200, a.text
    body = a.json()
    assert body["status"] == "pending" and [it["state"] for it in body["items"]] == ["added", "pending"]
    assert body["added_total"] == 25000 and body["pending_total"] == 40000
    assert _stock(db, shop["rel"]) == 2
    assert client.post(f"/api/internal/product-requests/{rid}/items/0/accept", headers=h).status_code == 409

    # Descarta el otro: queda aceptada con lo agregado
    d = client.post(f"/api/internal/product-requests/{rid}/items/1/discard", headers=h).json()
    assert d["status"] == "accepted" and d["items"][1]["state"] == "discarded"
    lines = db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id == shop["order"]).all()
    assert [(l.product_id, l.cantidad) for l in lines] == [(shop["rel"], 1)]


def test_descartar_todo_rechaza(client, auth, db, shop):
    h = auth("a")
    phone = str(uuid.uuid4().int)[:8]
    rid = client.post(f"{_base(shop)}/requests", json={"items": [{"product_id": shop["rel"], "qty": 1}],
                                                        "contact_name": "Luis", "contact_phone": phone}).json()["id"]
    d = client.post(f"/api/internal/product-requests/{rid}/items/0/discard", headers=h).json()
    assert d["status"] == "rejected" and d["reject_reason"] == "Productos no disponibles"
    assert _stock(db, shop["rel"]) == 3

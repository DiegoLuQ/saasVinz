"""Productos especiales: máx. 4 activos por crematorio; se ofrecen en el formulario
como adicionales (con su nota especial e imagen) y la nota queda en la solicitud."""
import uuid

from app import models


def _prod(client, h, name, **kw):
    body = {"name": name, "cost_price": 0, "sale_price": 15000, "stock": 5, **kw}
    return client.post("/api/internal/products", headers=h, json=body)


def test_maximo_cuatro_especiales(client, auth, db, world):
    h = auth("b")
    tag = uuid.uuid4().hex[:6]
    # Limpia especiales previos del crematorio B (otras corridas)
    db.query(models.Product).filter(models.Product.tenant_id == world["tenant_b"]).update({"is_special": False})
    db.commit()
    ids = []
    for i in range(4):
        r = _prod(client, h, f"Especial {i} {tag}", is_special=True, note="Se entrega con las cenizas")
        assert r.status_code == 200, r.text
        ids.append(r.json()["id"])
    r = _prod(client, h, f"Quinto {tag}", is_special=True)
    assert r.status_code == 400 and "4 productos especiales" in r.json()["detail"]

    otro = _prod(client, h, f"Normal {tag}").json()
    assert client.patch(f"/api/internal/products/{otro['id']}", headers=h, json={"is_special": True}).status_code == 400
    # Editar uno que ya es especial no choca con el límite
    assert client.patch(f"/api/internal/products/{ids[0]}", headers=h, json={"note": "Otra nota"}).status_code == 200
    # Quitar la marca a uno libera el cupo
    assert client.patch(f"/api/internal/products/{ids[0]}", headers=h, json={"is_special": False}).status_code == 200
    assert client.patch(f"/api/internal/products/{otro['id']}", headers=h, json={"is_special": True}).status_code == 200
    # Desactivado no cuenta
    assert client.patch(f"/api/internal/products/{ids[1]}", headers=h, json={"is_active": False}).status_code == 200
    assert _prod(client, h, f"Otro {tag}", is_special=True).status_code == 200


def test_especial_en_el_formulario(client, auth, db, world):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    db.query(models.Product).filter(models.Product.tenant_id == world["tenant_a"]).update({"is_special": False})
    db.commit()
    esp = _prod(client, h, f"Relicario {tag}", is_special=True, note="Grabado en 5 días").json()
    sin_stock = _prod(client, h, f"Llavero {tag}", is_special=True, stock=0).json()
    pedido = _prod(client, h, f"Cuadro {tag}", is_special=True, stock=0, made_to_order=True).json()

    slug = db.query(models.Tenant).get(world["tenant_a"]).slug
    items = {i["id"]: i for i in client.get(f"/api/public/tenant/{slug}/services").json()}
    e = items[f"prod_{esp['id']}"]
    assert e["is_special"] is True and e["important_note"] == "Grabado en 5 días"
    assert f"prod_{sin_stock['id']}" not in items          # sin stock y no es a pedido
    assert f"prod_{pedido['id']}" in items                  # a pedido sí se ofrece

"""Stock de ánforas/insumos en las órdenes: el ánfora del plan queda como línea
de la orden (plan_id, precio 0) y se descuenta / devuelve por un solo camino."""
import uuid

import pytest

from app import models


@pytest.fixture
def setup(db, world):
    tag = uuid.uuid4().hex[:6]
    tid = world["tenant_a"]
    urn = models.Product(tenant_id=tid, code=f"U{tag}", name=f"Ánfora {tag}", sale_price=30000, cost_price=8000, stock=5)
    urn2 = models.Product(tenant_id=tid, code=f"V{tag}", name=f"Ánfora madera {tag}", sale_price=50000, cost_price=12000, stock=2)
    plan = models.Plan(tenant_id=tid, name=f"Plan {tag}", price=100000, cost=0)
    db.add_all([urn, urn2, plan])
    db.flush()
    db.add(models.PlanProduct(tenant_id=tid, plan_id=plan.id, product_id=urn.id))
    db.commit()
    return {"tag": tag, "urn": urn.id, "urn2": urn2.id, "plan": plan.id}


def _stock(db, pid):
    db.expire_all()
    return db.query(models.Product).get(pid).stock


def _pet(client, h, tag):
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    return client.post("/api/internal/pets", headers=h, json={"name": f"Mila {tag}", "species": "Felino", "customer_id": c["id"]}).json()["id"]


def _lines(s, product_id=None, price=0, plan_id=None, qty=1):
    return {
        "planes": [{"plan_id": s["plan"], "cantidad": 1, "precio_venta": 100000, "precio_costo": 0}],
        "products": [{"product_id": product_id or s["urn"], "quantity": qty, "unit_price": price,
                      "precio_costo": 0, "plan_id": plan_id if plan_id is not None else s["plan"]}],
    }


def test_anfora_del_plan_descuenta_y_devuelve(client, auth, db, setup):
    h = auth("a")
    pet = _pet(client, h, setup["tag"])
    r = client.post("/api/internal/cremations", headers=h, json={"pet_id": pet, "status": "pendiente", **_lines(setup)})
    assert r.status_code == 200, r.text
    order = r.json()
    assert _stock(db, setup["urn"]) == 4
    line = order["products"][0] if order.get("products") else order["productos"][0]
    assert line["plan_id"] == setup["plan"] and line["unit_price"] == 0

    # La familia cambia el ánfora por otra: la anterior vuelve, la nueva se descuenta.
    r = client.patch(f"/api/internal/cremations/{order['id']}", headers=h,
                     json=_lines(setup, product_id=setup["urn2"], price=20000))
    assert r.status_code == 200, r.text
    assert (_stock(db, setup["urn"]), _stock(db, setup["urn2"])) == (5, 1)

    # Cancelar devuelve el stock.
    assert client.patch(f"/api/internal/cremations/{order['id']}", headers=h, json={"status": "cancelado"}).status_code == 200
    assert _stock(db, setup["urn2"]) == 2


def test_eliminar_la_orden_devuelve_el_stock(client, auth, db, setup):
    h = auth("a")
    pet = _pet(client, h, setup["tag"] + "d")
    order = client.post("/api/internal/cremations", headers=h, json={"pet_id": pet, "status": "pendiente", **_lines(setup)}).json()
    assert _stock(db, setup["urn"]) == 4
    assert client.delete(f"/api/internal/cremations/{order['id']}?scope=order", headers=h).status_code == 200
    assert _stock(db, setup["urn"]) == 5


def test_sin_stock_no_guarda(client, auth, db, setup):
    h = auth("a")
    pet = _pet(client, h, setup["tag"] + "s")
    r = client.post("/api/internal/cremations", headers=h,
                    json={"pet_id": pet, "status": "pendiente", **_lines(setup, product_id=setup["urn2"], qty=3)})
    assert r.status_code == 409 and "Stock insuficiente" in r.json()["detail"]
    assert _stock(db, setup["urn2"]) == 2


def test_editar_no_se_bloquea_por_stock_negativo_antiguo(client, auth, db, setup):
    h = auth("a")
    pet = _pet(client, h, setup["tag"] + "n")
    order = client.post("/api/internal/cremations", headers=h, json={"pet_id": pet, "status": "pendiente", **_lines(setup)}).json()
    prod = db.query(models.Product).get(setup["urn"])
    prod.stock = -1  # movimientos antiguos dejaron el stock negativo
    db.commit()
    r = client.patch(f"/api/internal/cremations/{order['id']}", headers=h, json={**_lines(setup), "notes": "x"})
    assert r.status_code == 200, r.text
    assert _stock(db, setup["urn"]) == -1  # devolvió 1 y volvió a tomar 1


def test_procesar_registro_deja_el_anfora_en_la_orden(client, auth, db, world, setup):
    h = auth("a")
    sub = models.FormSubmission(
        tenant_id=world["tenant_a"], slug="crematorio-a", status="pending",
        owner_data={"fullName": f"Fam web {setup['tag']}", "phone": "+56912345678"},
        pet_data={"name": f"Luz {setup['tag']}", "species": "Canino"},
        selected_services=[{"type": "plan", "id": setup["plan"], "name": "Plan", "price": 100000, "cost": 0,
                            "items": [{"type": "product", "id": setup["urn"], "quantity": 1}]}],
    )
    db.add(sub)
    db.commit()
    cust = client.post(f"/api/internal/submissions/{sub.id}/create-customer", headers=h).json()["customer_id"]
    pet = client.post(f"/api/internal/submissions/{sub.id}/create-pet?customer_id={cust}", headers=h).json()["pet_id"]
    r = client.post(f"/api/internal/submissions/{sub.id}/create-services?pet_id={pet}", headers=h)
    assert r.status_code == 200, r.text
    assert _stock(db, setup["urn"]) == 4

    oc = db.query(models.CremationOC).filter(models.CremationOC.pet_id == pet).one()
    lines = db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id == oc.id).all()
    assert [(l.product_id, l.plan_id, l.precio_venta) for l in lines] == [(setup["urn"], setup["plan"], 0.0)]

    # Antes el stock no volvía al eliminar estas órdenes.
    assert client.delete(f"/api/internal/cremations/{oc.id}?scope=order", headers=h).status_code == 200
    assert _stock(db, setup["urn"]) == 5


def test_procesar_registro_sin_stock_queda_pendiente(client, auth, db, world, setup):
    """Sin stock el registro se procesa igual: el producto queda «pendiente de stock»."""
    h = auth("a")
    prod = db.query(models.Product).get(setup["urn"])
    prod.stock = 0
    db.commit()
    sub = models.FormSubmission(
        tenant_id=world["tenant_a"], slug="crematorio-a", status="pending",
        owner_data={"fullName": f"Fam sin stock {setup['tag']}", "phone": "+56912345678"},
        pet_data={"name": f"Sol {setup['tag']}", "species": "Canino"},
        selected_services=[{"type": "plan", "id": setup["plan"], "name": "Plan", "price": 100000, "cost": 0,
                            "items": [{"type": "product", "id": setup["urn"], "quantity": 1}]}],
    )
    db.add(sub)
    db.commit()
    cust = client.post(f"/api/internal/submissions/{sub.id}/create-customer", headers=h).json()["customer_id"]
    pet = client.post(f"/api/internal/submissions/{sub.id}/create-pet?customer_id={cust}", headers=h).json()["pet_id"]
    r = client.post(f"/api/internal/submissions/{sub.id}/create-services?pet_id={pet}", headers=h)
    assert r.status_code == 200, r.text
    pending = r.json()["stock_pending"]
    assert [(p["product_id"], p["missing"]) for p in pending] == [(setup["urn"], 1)]
    assert _stock(db, setup["urn"]) == -1  # 1 unidad por reponer

    oc = db.query(models.CremationOC).filter(models.CremationOC.pet_id == pet).one()
    assert db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id == oc.id).count() == 1
    # Eliminar la orden devuelve la unidad reservada
    assert client.delete(f"/api/internal/cremations/{oc.id}?scope=order", headers=h).status_code == 200
    assert _stock(db, setup["urn"]) == 0

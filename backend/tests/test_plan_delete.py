"""Eliminar un plan: solo si ninguna orden lo usa (si no, 409 y se desactiva).
Antes fallaba con 500 (StaleDataError en srv_plan_services) cuando el plan tenía servicios."""
import uuid

from app import models


def test_eliminar_plan_con_servicios_y_productos(client, auth, db, world):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    s1 = client.post("/api/internal/services", headers=h, json={"name": f"Retiro {tag}", "price": 1000}).json()
    s2 = client.post("/api/internal/services", headers=h, json={"name": f"Velatorio {tag}", "price": 2000}).json()
    prod = models.Product(tenant_id=world["tenant_a"], name=f"Ánfora {tag}", code=f"X-{tag}", sale_price=1, stock=3)
    db.add(prod)
    db.commit()
    plan = client.post("/api/internal/plans", headers=h, json={
        "name": f"Borrable {tag}", "price": 1000, "service_ids": [s1["id"], s2["id"]],
    }).json()
    db.add(models.PlanProduct(tenant_id=world["tenant_a"], plan_id=plan["id"], product_id=prod.id))
    db.commit()
    client.get(f"/api/internal/plans/{plan['id']}", headers=h)

    r = client.delete(f"/api/internal/plans/{plan['id']}", headers=h)
    assert r.status_code == 200, r.text
    assert client.get(f"/api/internal/plans/{plan['id']}", headers=h).status_code == 404
    db.expire_all()
    assert db.query(models.PlanService).filter(models.PlanService.plan_id == plan["id"]).count() == 0


def test_no_se_elimina_plan_con_ordenes(client, auth):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    s1 = client.post("/api/internal/services", headers=h, json={"name": f"Retiro {tag}", "price": 1000}).json()
    plan = client.post("/api/internal/plans", headers=h, json={"name": f"Usado {tag}", "price": 1000, "service_ids": [s1["id"]]}).json()
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Toby {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    assert client.post("/api/internal/cremations", headers=h, json={
        "pet_id": p["id"], "status": "pendiente", "total_price": 1000,
        "planes": [{"plan_id": plan["id"], "cantidad": 1, "precio_venta": 1000, "precio_costo": 0}],
    }).status_code == 200

    r = client.delete(f"/api/internal/plans/{plan['id']}", headers=h)
    assert r.status_code == 409 and "1 orden" in r.json()["detail"]
    assert client.get(f"/api/internal/plans/{plan['id']}", headers=h).status_code == 200

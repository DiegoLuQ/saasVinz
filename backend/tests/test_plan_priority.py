"""Plan prioritario: sus órdenes se marcan («Prioridad») y van primero en el
Panel de Trabajo, el Dashboard y el expediente de la orden."""
import uuid

from app import models


def _order(client, h, plan_id, tag, name):
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"{name} {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    r = client.post("/api/internal/cremations", headers=h, json={
        "pet_id": p["id"], "status": "pendiente", "total_price": 50000,
        "planes": [{"plan_id": plan_id, "cantidad": 1, "precio_venta": 50000, "precio_costo": 0}],
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_plan_prioritario_va_primero(client, auth, db, world):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    normal = client.post("/api/internal/plans", headers=h, json={"name": f"Normal {tag}", "price": 50000}).json()
    urgente = client.post("/api/internal/plans", headers=h, json={"name": f"Urgente {tag}", "price": 50000, "is_priority": True}).json()
    assert urgente["is_priority"] is True and normal["is_priority"] is False

    o_normal = _order(client, h, normal["id"], tag, "Toby")      # creada antes
    o_urgente = _order(client, h, urgente["id"], tag, "Luna")

    board = client.get("/api/internal/operations/ops/board", headers=h, params={"tab": "not_started", "q": tag}).json()
    ids = [o["id"] for o in board["items"]]
    assert ids.index(o_urgente) < ids.index(o_normal)
    by_id = {o["id"]: o for o in board["items"]}
    assert by_id[o_urgente]["priority_plan"] == f"Urgente {tag}" and by_id[o_normal]["priority_plan"] is None

    exp = client.get(f"/api/internal/cremations/{o_urgente}/expediente", headers=h).json()
    assert exp["order"]["priority_plan"] == f"Urgente {tag}"

    # Quitar la prioridad del plan: la orden deja de estar marcada
    r = client.patch(f"/api/internal/plans/{urgente['id']}", headers=h, json={"is_priority": False})
    assert r.status_code == 200, r.text
    board = client.get("/api/internal/operations/ops/board", headers=h, params={"tab": "not_started", "q": tag}).json()
    assert all(o["priority_plan"] is None for o in board["items"])

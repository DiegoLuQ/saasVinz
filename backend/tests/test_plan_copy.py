"""Copiar plan: crea «<nombre> (copia)» inactivo con los mismos servicios y
productos, sin tocar el original (ni las órdenes que lo usan)."""
import uuid


def test_copiar_plan(client, auth):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    s1 = client.post("/api/internal/services", headers=h, json={"name": f"Retiro {tag}", "price": 1000}).json()
    s2 = client.post("/api/internal/services", headers=h, json={"name": f"Velatorio {tag}", "price": 2000}).json()
    plan = client.post("/api/internal/plans", headers=h, json={
        "name": f"Plan A {tag}", "price": 50000, "is_featured": True, "is_priority": True,
        "service_ids": [s1["id"], s2["id"]], "optional_service_ids": [s2["id"]],
    }).json()

    r = client.post(f"/api/internal/plans/{plan['id']}/copy", headers=h)
    assert r.status_code == 200, r.text
    c = r.json()
    assert c["id"] != plan["id"] and c["name"] == f"Plan A {tag} (copia)"
    assert c["is_active"] is False and c["is_featured"] is False and c["is_priority"] is True
    assert c["price"] == 50000
    assert [s["id"] for s in c["services"]] == [s1["id"], s2["id"]]
    assert c["optional_service_ids"] == [s2["id"]]

    # Segunda copia: nombre libre en el mismo grupo
    c2 = client.post(f"/api/internal/plans/{plan['id']}/copy", headers=h).json()
    assert c2["name"] == f"Plan A {tag} (copia 2)"

    # Quitar un servicio de la copia no toca el original
    client.patch(f"/api/internal/plans/{c['id']}", headers=h, json={"service_ids": [s1["id"]]})
    orig = client.get(f"/api/internal/plans/{plan['id']}", headers=h).json()
    assert [s["id"] for s in orig["services"]] == [s1["id"], s2["id"]] and orig["is_featured"] is True


def test_copiar_plan_de_otro_tenant_404(client, auth):
    tag = uuid.uuid4().hex[:6]
    plan = client.post("/api/internal/plans", headers=auth("a"), json={"name": f"Solo A {tag}", "price": 1}).json()
    r = client.post(f"/api/internal/plans/{plan['id']}/copy", headers=auth("b"))
    assert r.status_code == 404

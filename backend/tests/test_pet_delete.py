"""Eliminar mascota desde /dashboard/mascotas: con órdenes se bloquea (409); sin órdenes se
borra la mascota y su cliente si no tiene otras mascotas."""


def _cliente_mascota(client, h, nombre):
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Dueño {nombre}"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": nombre, "species": "Perro", "customer_id": c["id"]})
    assert p.status_code in (200, 201), p.text
    return c, p.json()


def test_con_ordenes_no_se_elimina(client, auth):
    h = auth("a")
    c, p = _cliente_mascota(client, h, "Toby Orden")
    o = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente"})
    assert o.status_code in (200, 201), o.text
    try:
        assert len(client.get(f"/api/internal/pets/{p['id']}/delete-preview", headers=h).json()["orders"]) == 1
        r = client.delete(f"/api/internal/pets/{p['id']}", headers=h)
        assert r.status_code == 409 and "órdenes asociadas" in r.json()["detail"]
        assert client.get(f"/api/internal/pets/{p['id']}", headers=h).status_code == 200
    finally:
        client.delete(f"/api/internal/cremations/{o.json()['id']}?scope=all", headers=h)


def test_sin_ordenes_borra_mascota_y_cliente(client, auth):
    h = auth("a")
    c, p = _cliente_mascota(client, h, "Toby Duplicado")
    prev = client.get(f"/api/internal/pets/{p['id']}/delete-preview", headers=h).json()
    assert prev["customer"] == {"id": c["id"], "name": c["name"], "deleted": True}
    r = client.delete(f"/api/internal/pets/{p['id']}", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["customer_deleted"] is True
    assert client.get(f"/api/internal/pets/{p['id']}", headers=h).status_code == 404
    assert client.get(f"/api/internal/customers/{c['id']}", headers=h).status_code == 404


def test_cliente_con_otra_mascota_se_conserva(client, auth):
    h = auth("a")
    c, p1 = _cliente_mascota(client, h, "Luna Uno")
    p2 = client.post("/api/internal/pets", headers=h, json={"name": "Luna Dos", "species": "Gato", "customer_id": c["id"]}).json()
    assert client.get(f"/api/internal/pets/{p1['id']}/delete-preview", headers=h).json()["customer"]["deleted"] is False
    r = client.delete(f"/api/internal/pets/{p1['id']}", headers=h)
    assert r.status_code == 200 and r.json()["customer_deleted"] is False
    assert client.get(f"/api/internal/customers/{c['id']}", headers=h).status_code == 200
    client.delete(f"/api/internal/pets/{p2['id']}", headers=h)

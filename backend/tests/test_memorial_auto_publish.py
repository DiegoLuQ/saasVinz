"""Gestión del memorial: con «Publicar mensajes automáticamente» las dedicatorias nuevas
quedan aprobadas; sin él, pendientes de la aprobación de la familia."""
from app.api.internal.memorials import models as mem_models


def test_publicar_mensajes_automaticamente(client, auth, db):
    h = auth("a")
    c = client.post("/api/internal/customers", headers=h, json={"name": "Familia Memorial"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": "Lucero", "species": "Perro", "customer_id": c["id"]}).json()
    r = client.post("/api/internal/memorials", headers=h, json={"id_mascota": p["id"], "msg_despedida": "Te queremos"})
    assert r.status_code == 200, r.text
    uuid = r.json()["id_recuerdo"]
    mem = db.query(mem_models.Memorial).filter(mem_models.Memorial.id_recuerdo == uuid).one()
    pin = {"access-key": mem.access_key}
    try:
        def enviar(nombre):
            d = client.post(f"/api/internal/memorials/{uuid}/dedicatorias", json={"mensajero": nombre, "mensaje": "Siempre contigo"})
            assert d.status_code == 200, d.text
            return d.json()["estado"]

        assert enviar("Ana") == "pendiente"
        on = client.patch(f"/api/internal/memorials/{uuid}/manage", headers=pin, json={"diseno": {"auto_publicar_mensajes": True}})
        assert on.status_code == 200, on.text
        assert enviar("Beto") == "aprobado"
        client.patch(f"/api/internal/memorials/{uuid}/manage", headers=pin, json={"diseno": {"auto_publicar_mensajes": False}})
        assert enviar("Carla") == "pendiente"
    finally:
        client.delete(f"/api/internal/pets/{p['id']}", headers=h)

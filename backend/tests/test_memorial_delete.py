"""Memoriales: el crematorio los crea solo con el botón (GET by-pet no crea) y el SuperAdmin
los elimina (individual o varios) salvo los que tienen mensajes."""
import uuid

from app.api.internal.memorials import models as mem


def _pet(client, h, tag):
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    return client.post("/api/internal/pets", headers=h, json={"name": f"Kira {tag}", "species": "Perro", "customer_id": c["id"]}).json()


def _memorial(db, world, pet_id):
    m = mem.Memorial(id_tenant=world["tenant_a"], id_mascota=pet_id, msg_despedida="En memoria", diseno={"tipo_diseno": "normal"})
    db.add(m)
    db.commit()
    return m


def test_ver_memorial_por_mascota_no_lo_crea(client, auth, db, world):
    h = auth("a")
    p = _pet(client, h, uuid.uuid4().hex[:6])
    r = client.get(f"/api/internal/memorials/by-pet/{p['id']}", headers=h)
    assert r.status_code == 200 and r.json() is None
    assert db.query(mem.Memorial).filter_by(id_mascota=p["id"]).count() == 0
    # Otro crematorio no ve el de A
    m = _memorial(db, world, p["id"])
    assert client.get(f"/api/internal/memorials/by-pet/{p['id']}", headers=auth("b")).json() is None
    got = client.get(f"/api/internal/memorials/by-pet/{p['id']}", headers=h).json()
    assert got["id_recuerdo"] == str(m.id_recuerdo)


def test_superadmin_elimina_solo_sin_mensajes(client, auth, db, world):
    h, adm = auth("a"), auth("creator")
    tag = uuid.uuid4().hex[:6]
    free1 = _memorial(db, world, _pet(client, h, tag + "a")["id"])
    free2 = _memorial(db, world, _pet(client, h, tag + "b")["id"])
    busy = _memorial(db, world, _pet(client, h, tag + "c")["id"])
    db.add(mem.Dedication(id_recuerdo=busy.id, mensajero="Ana", mensaje="Te queremos"))
    db.commit()
    ids = {"free1": free1.id, "free2": free2.id, "busy": busy.id}

    rows = {m["id"]: m for m in client.get("/api/internal/creator/memorials?limit=500", headers=adm).json()}
    assert rows[ids["busy"]]["dedications_count"] == 1 and rows[ids["free1"]]["dedications_count"] == 0

    # Un crematorio no puede
    assert client.delete(f"/api/internal/creator/memorials/{ids['free1']}", headers=h).status_code in (401, 403)

    # Individual: con mensajes = 409; sin mensajes = se borra
    r = client.delete(f"/api/internal/creator/memorials/{ids['busy']}", headers=adm)
    assert r.status_code == 409, r.text
    assert client.delete(f"/api/internal/creator/memorials/{ids['free1']}", headers=adm).status_code == 200

    # Masivo: borra los libres, omite el con mensajes y el inexistente
    r = client.post("/api/internal/creator/memorials/bulk-delete", headers=adm, json={"ids": [ids["free2"], ids["busy"], 999999999]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert [d["id"] for d in body["deleted"]] == [ids["free2"]]
    assert {s["id"] for s in body["skipped"]} == {ids["busy"], 999999999}

    db.expire_all()
    left = {m.id for m in db.query(mem.Memorial).filter(mem.Memorial.id.in_(list(ids.values()))).all()}
    assert left == {ids["busy"]}

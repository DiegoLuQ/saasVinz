"""Fase 2 de planes de memorial: largo máximo de los mensajes según el plan y melodías
guardadas por la familia (hasta max_melodies, elige cuál suena; solo memoriales Vinzer)."""
from app.api.internal.common.models import MediaLibrary
from app.api.internal.memorials import models as mem_models
from tests.test_memorial_signup import _data, _photo


def _melodies(db, n=4):
    ids = []
    for i in range(n):
        m = MediaLibrary(tenant_id=None, url=f"/storage/melodias/test-{i}.m4a", media_type="audio",
                         category="melodias", description=f"Melodía prueba {i}", duration=30)
        db.add(m)
        db.flush()
        ids.append(m.id)
    db.commit()
    return ids


def _vinzer_memorial(client, auth, db, plan="eterno", pet="Melodia"):
    r = client.post("/api/internal/creator/memorials/new", data={"data": _data(pet, plan=plan), "activate": "true"},
                    files=[_photo()], headers=auth("creator"))
    assert r.status_code == 200, r.text
    m = db.query(mem_models.Memorial).filter(mem_models.Memorial.id_recuerdo == r.json()["id_recuerdo"]).first()
    return m, r.json()["pin"]


def test_largo_de_mensaje_segun_plan(client, world, auth, db):
    m, pin = _vinzer_memorial(client, auth, db, plan="recuerdo", pet="Largo")
    url = f"/api/internal/memorials/{m.id_recuerdo}/dedicatorias"
    assert client.post(url, json={"mensajero": "Ana", "mensaje": "x" * 501}).status_code == 400
    ok = client.post(url, json={"mensajero": "Ana", "mensaje": "x" * 500})
    assert ok.status_code == 200, ok.text
    # la familia tampoco puede alargarlo al editarlo
    ed = client.patch(f"/api/internal/memorials/dedications/{ok.json()['id_dedicatoria']}",
                      json={"mensaje": "y" * 501}, headers={"access-key": pin})
    assert ed.status_code == 400
    man = client.get(f"/api/internal/memorials/{m.id_recuerdo}/manage", headers={"access-key": pin}).json()
    assert man["plan_features"]["max_dedication_chars"] == 500 and man["is_vinzer_plan"] is True


def test_melodias_favoritas_de_la_familia(client, world, auth, db):
    ids = _melodies(db)
    m, pin = _vinzer_memorial(client, auth, db, plan="eterno", pet="Musica")
    h = {"access-key": pin}
    url = f"/api/internal/memorials/{m.id_recuerdo}/manage/melody"
    opts = client.get(f"/api/internal/memorials/{m.id_recuerdo}/manage/melodies", headers=h).json()
    assert opts["enabled"] is True and opts["max"] == 3

    # 4 favoritas en Eterno (máx 3) → 400
    assert client.put(url, json={"favorites": ids[:4], "media_id": ids[0]}, headers=h).status_code == 400
    r = client.put(url, json={"favorites": ids[:3], "media_id": ids[1], "activa": True}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["melody"]["id"] == ids[1]
    pub = client.get(f"/api/internal/memorials/{m.id_recuerdo}").json()
    assert pub["melody"]["id"] == ids[1]
    assert client.get(f"/api/internal/memorials/{m.id_recuerdo}/manage/melodies", headers=h).json()["favorites"] == ids[:3]
    # sin PIN no
    assert client.put(url, json={"favorites": [ids[0]], "media_id": ids[0]}).status_code == 401

    # Recuerdo: 1 sola
    r2, pin2 = _vinzer_memorial(client, auth, db, plan="recuerdo", pet="Una")
    u2 = f"/api/internal/memorials/{r2.id_recuerdo}/manage/melody"
    assert client.put(u2, json={"favorites": ids[:2], "media_id": ids[0]}, headers={"access-key": pin2}).status_code == 400
    assert client.put(u2, json={"favorites": [], "media_id": ids[0]}, headers={"access-key": pin2}).status_code == 200


def test_memorial_de_crematorio_no_elige_melodia(client, world, auth, db):
    partner = db.query(mem_models.Memorial).filter(mem_models.Memorial.plan_id.isnot(None)).join(
        mem_models.MemorialPlan).filter(mem_models.MemorialPlan.kind == "partner").first()
    if partner is None:
        return
    r = client.put(f"/api/internal/memorials/{partner.id_recuerdo}/manage/melody",
                   json={"favorites": [], "media_id": None}, headers={"access-key": partner.access_key or ""})
    assert r.status_code in (401, 403)

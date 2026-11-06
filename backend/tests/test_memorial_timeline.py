"""Fase 4 de planes de memorial: línea de tiempo (Eterno/Infinito).
Momentos con fecha opcional, título, texto y foto propia (aparte de la galería); tope max_timeline."""
from datetime import date, timedelta

from app.api.internal.memorials import models as mem_models
from app.services import memorial_plans
from tests.test_memorial_phase2 import _vinzer_memorial
from tests.test_memorial_signup import _photo


def _file():
    name, (fname, content, ctype) = _photo("momento.png")
    return {"file": (fname, content, ctype)}


def test_familia_arma_la_linea_de_tiempo(client, world, auth, db):
    m, pin = _vinzer_memorial(client, auth, db, plan="eterno", pet="Momentos")
    h = {"access-key": pin}
    base = f"/api/internal/memorials/{m.id_recuerdo}/manage/timeline"
    opts = client.get(base, headers=h).json()
    assert opts["enabled"] is True and opts["max"] == 50 and opts["moments"] == []
    assert client.get(base).status_code == 401

    r = client.post(base, data={"titulo": "Llegó a casa", "texto": "Cabía en una mano", "fecha": "2015-03-01"},
                    files=_file(), headers=h)
    assert r.status_code == 200, r.text
    first = r.json()["moments"][0]
    assert first["image_url"] and first["fecha"] == "2015-03-01"
    r = client.post(base, data={"titulo": "Su primera playa", "fecha": "2014-12-24"}, headers=h)
    assert [x["titulo"] for x in r.json()["moments"]] == ["Su primera playa", "Llegó a casa"]  # por fecha
    # validaciones
    assert client.post(base, data={"titulo": " "}, headers=h).status_code == 400
    assert client.post(base, data={"titulo": "x", "texto": "y" * 501}, headers=h).status_code == 400
    future = (date.today() + timedelta(days=3)).isoformat()
    assert client.post(base, data={"titulo": "x", "fecha": future}, headers=h).status_code == 400

    # la foto del momento no cuenta para la galería
    db.expire_all()
    assert len(db.query(mem_models.Memorial).get(m.id).lista_imagenes) == 1

    # editar (quitar foto) y borrar
    mid = first["id"]
    r = client.patch(f"{base}/{mid}", data={"titulo": "Llegó a casa ♥", "remove_photo": "true"}, headers=h)
    assert r.status_code == 200, r.text
    edited = next(x for x in r.json()["moments"] if x["id"] == mid)
    assert edited["titulo"] == "Llegó a casa ♥" and edited["image_url"] is None and edited["fecha"] is None

    pub = client.get(f"/api/internal/memorials/{m.id_recuerdo}").json()
    assert len(pub["timeline"]) == 2
    assert client.delete(f"{base}/{mid}", headers=h).json()["moments"].__len__() == 1


def test_recuerdo_no_tiene_linea_de_tiempo_y_tope(client, world, auth, db):
    m, pin = _vinzer_memorial(client, auth, db, plan="recuerdo", pet="SinLinea")
    h = {"access-key": pin}
    base = f"/api/internal/memorials/{m.id_recuerdo}/manage/timeline"
    assert client.get(base, headers=h).json()["enabled"] is False
    assert client.post(base, data={"titulo": "Hola"}, headers=h).status_code == 403
    assert client.get(f"/api/internal/memorials/{m.id_recuerdo}").json()["timeline"] == []

    # tope del plan
    e, pin2 = _vinzer_memorial(client, auth, db, plan="eterno", pet="Tope")
    plan = memorial_plans.plan_of(db, e)
    feats = dict(plan.features or {})
    old = dict(feats)
    try:
        plan.features = {**feats, "max_timeline": 1}
        db.commit()
        b2 = f"/api/internal/memorials/{e.id_recuerdo}/manage/timeline"
        assert client.post(b2, data={"titulo": "Uno"}, headers={"access-key": pin2}).status_code == 200
        assert client.post(b2, data={"titulo": "Dos"}, headers={"access-key": pin2}).status_code == 400
    finally:
        plan.features = old
        db.commit()

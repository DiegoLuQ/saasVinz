"""Memoriales vendidos por Vinzer: formulario público (pendiente de pago), enlace de invitación
de un solo uso, creación desde Admin y activación (correo con enlace + PIN solo al activar)."""
import io
import json
import uuid

from PIL import Image

from app.api.internal.memorials import models as mem_models

EMAIL = f"familia-{uuid.uuid4().hex[:8]}@vinzer-pruebas.cl"


def _photo(name="foto.png"):
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 120, 90)).save(buf, "PNG")
    return ("photos", (name, buf.getvalue(), "image/png"))


def _data(pet="Toby", **over):
    d = {
        "family": {"name": "Familia Pérez", "email": EMAIL, "phone": "+56922222222"},
        "pet": {"name": pet, "species": "Perro", "birth_date": "2015-01-02", "death_date": "2026-10-01"},
        "message": "Siempre contigo",
        "plan": "recuerdo",
        "design": {"scenario": "altar", "theme": "oscuro", "effect": "estrellas"},
    }
    d.update(over)
    return json.dumps(d)


def test_opciones_lista_los_planes_de_vinzer(client, world):
    r = client.get("/api/public/memorial-signup")
    assert r.status_code == 200, r.text
    body = r.json()
    assert [p["key"] for p in body["plans"]] == ["recuerdo", "eterno", "infinito"]
    assert body["max_photos"] == 3 and body["invite"] is None


def test_formulario_publico_crea_pendiente_y_avisa(client, world, db, sent_emails):
    r = client.post("/api/public/memorial-signup", data={"data": _data()}, files=[_photo(), _photo("b.png")])
    assert r.status_code == 200, r.text
    # reenviar el mismo formulario no duplica el memorial
    dup = client.post("/api/public/memorial-signup", data={"data": _data()}, files=[_photo()])
    assert dup.status_code == 409, dup.text
    out = r.json()
    assert out["status"] == "pending" and len(out["pin"]) == 6 and out["short_code"]
    m = db.query(mem_models.Memorial).filter(mem_models.Memorial.id_recuerdo == out["id_recuerdo"]).first()
    assert m.status == mem_models.MemorialStatus.pending and m.plan == "recuerdo" and m.plan_price == 39 and m.plan_billing == "yearly"
    assert len(m.lista_imagenes) == 2
    assert m.diseno["tipo_diseno"] == "altar" and m.diseno["origen"] == "web"
    # familia («Recibimos…» con PIN) + SuperAdmin; aún no el de bienvenida
    subjects = [e["subject"] if isinstance(e, dict) else getattr(e, "subject", "") for e in sent_emails]
    assert any("Recibimos" in s for s in subjects), subjects
    assert any("por cobrar" in s for s in subjects), subjects


def test_validaciones(client, world):
    assert client.post("/api/public/memorial-signup", data={"data": _data()}).status_code == 400  # sin fotos
    r = client.post("/api/public/memorial-signup", data={"data": _data(plan="ultra")}, files=[_photo()])
    assert r.status_code == 400
    many = [_photo(f"{i}.png") for i in range(4)]
    assert client.post("/api/public/memorial-signup", data={"data": _data()}, files=many).status_code == 400


def test_invitacion_un_solo_uso_y_activacion(client, world, auth, db, sent_emails):
    h = auth("creator")
    inv = client.post("/api/internal/creator/memorials/invites", json={"plan": "infinito", "note": "Familia Soto"}, headers=h)
    assert inv.status_code == 200, inv.text
    token = inv.json()["url"].split("i=")[1]
    assert client.get(f"/api/public/memorial-signup?invite={token}").json()["invite"] == {"plan": "infinito"}

    r = client.post("/api/public/memorial-signup", data={"data": _data("Luna", plan="infinito"), "invite": token}, files=[_photo()])
    assert r.status_code == 200, r.text
    again = client.post("/api/public/memorial-signup", data={"data": _data("Otro"), "invite": token}, files=[_photo()])
    assert again.status_code == 410
    listed = client.get("/api/internal/creator/memorials/invites", headers=h).json()
    assert next(i for i in listed if i["id"] == inv.json()["id"])["status"] == "usado"

    m = db.query(mem_models.Memorial).filter(mem_models.Memorial.id_recuerdo == r.json()["id_recuerdo"]).first()
    assert m.diseno["origen"] == "invitacion"
    sent_emails.clear()
    p = client.patch(f"/api/internal/creator/memorials/{m.id}", json={"status": "active"}, headers=h)
    assert p.status_code == 200, p.text
    db.expire_all()
    m = db.get(mem_models.Memorial, m.id)
    assert m.status == mem_models.MemorialStatus.active and m.valid_until is None  # infinito = pago único
    assert len(sent_emails) == 1  # bienvenida con enlace + PIN


def test_admin_crea_activo_y_solo_creator(client, world, auth, db):
    r = client.post("/api/internal/creator/memorials/new", data={"data": _data("Max", plan="eterno"), "activate": "true"},
                    files=[_photo()], headers=auth("creator"))
    assert r.status_code == 200, r.text
    m = db.query(mem_models.Memorial).filter(mem_models.Memorial.id_recuerdo == r.json()["id_recuerdo"]).first()
    assert m.status == mem_models.MemorialStatus.active and m.valid_until is not None
    assert m.diseno["origen"] == "admin"
    assert client.post("/api/internal/creator/memorials/new", data={"data": _data()}, files=[_photo()],
                       headers=auth("a")).status_code in (401, 403)
    assert client.post("/api/internal/creator/memorials/invites", json={}, headers=auth("a")).status_code in (401, 403)

"""Collage del mes: fotos principales de las mascotas con orden entregada, solo
con la autorización de la familia (crm_pets.photo_consent), y plantillas kind=collage."""
import uuid

from app import models
from app.utils import tz


def _delivered(client, h, tag, name, consent, photo=True):
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"{name} {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    patch = {"photo_consent": consent}
    if photo:
        url = f"https://cdn.test/{tag}/{name}.webp"
        patch.update({"image_url": url, "images": [url]})
    r = client.patch(f"/api/internal/pets/{p['id']}", headers=h, json=patch)
    assert r.status_code == 200, r.text
    r = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "entregado", "total_price": 1000})
    assert r.status_code == 200, r.text
    return p["id"]


def test_collage_solo_autorizadas(client, auth, db, world):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    si = _delivered(client, h, tag, "Luna", True)
    pend = _delivered(client, h, tag, "Max", None)
    no = _delivered(client, h, tag, "Kira", False)
    sin_foto = _delivered(client, h, tag, "Toby", True, photo=False)

    r = client.get("/api/internal/image-templates/collage/photos", headers=h, params={"last": 40})
    assert r.status_code == 200, r.text
    data = r.json()
    ids = [p["pet_id"] for p in data["photos"]]
    assert si in ids and pend not in ids and no not in ids and sin_foto not in ids
    assert pend in [p["pet_id"] for p in data["pending"]]
    assert data["declined"] >= 1 and data["mode"] == "last"

    # Mes actual (zona del crematorio)
    month = tz.get_now().strftime("%Y-%m")
    data = client.get("/api/internal/image-templates/collage/photos", headers=h, params={"month": month}).json()
    assert si in [p["pet_id"] for p in data["photos"]] and data["mode"] == "month"
    assert client.get("/api/internal/image-templates/collage/photos", headers=h, params={"month": "2026-13"}).status_code == 400

    # Autorizar desde el collage: pasa a las fotos
    client.patch(f"/api/internal/pets/{pend}", headers=h, json={"photo_consent": True})
    data = client.get("/api/internal/image-templates/collage/photos", headers=h, params={"last": 40}).json()
    assert pend in [p["pet_id"] for p in data["photos"]]

    # Otro crematorio no ve estas fotos
    other = client.get("/api/internal/image-templates/collage/photos", headers=auth("b"), params={"last": 40}).json()
    assert si not in [p["pet_id"] for p in other["photos"]]


def test_plantillas_collage_separadas(client, auth, db, world):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    db.execute(models.ImageTemplate.__table__.insert().values(
        name=f"Collage {tag}", supported_ratios=["1:1"], kind="collage", is_active=True, usage_count=0,
        ai_text_max_chars=500, definition={"background": {"type": "color", "value": "#000", "opacity": 1}, "layers": []},
    ))
    db.commit()
    social = client.get("/api/internal/image-templates", headers=h, params={"page_size": 60}).json()["items"]
    assert all(t["kind"] == "social" for t in social) and f"Collage {tag}" not in [t["name"] for t in social]
    col = client.get("/api/internal/image-templates", headers=h, params={"page_size": 60, "kind": "collage"}).json()["items"]
    assert f"Collage {tag}" in [t["name"] for t in col]


def test_admin_guarda_el_tipo(client, auth, world):
    h = auth("creator")
    layer = {"type": "collage", "id": "c1", "x": 50, "y": 50, "width": 80, "height": 60, "cols": 3, "rows": 3}
    body = {"name": "Collage tipo", "supported_ratios": ["1:1"],
            "definition": {"background": {"type": "color", "value": "#000", "opacity": 1}, "layers": []}}
    t = client.post("/api/internal/creator/image-templates", headers=h, json=body).json()
    assert t["kind"] == "social"
    # Editar: el tipo enviado se guarda
    r = client.patch(f"/api/internal/creator/image-templates/{t['id']}", headers=h, json={"kind": "collage"})
    assert r.status_code == 200 and r.json()["kind"] == "collage", r.text
    # Con capa collage siempre queda como collage aunque no se envíe el tipo
    r = client.post("/api/internal/creator/image-templates", headers=h,
                    json={**body, "definition": {**body["definition"], "layers": [layer]}})
    assert r.json()["kind"] == "collage"


def test_collage_descargado_cuenta_como_uso(client, auth, db, world):
    hc = auth("creator")
    layer = {"type": "collage", "id": "c1", "x": 50, "y": 50, "width": 80, "height": 60, "cols": 3, "rows": 3}
    t = client.post("/api/internal/creator/image-templates", headers=hc, json={
        "name": f"Collage uso {uuid.uuid4().hex[:5]}", "supported_ratios": ["1:1"],
        "definition": {"background": {"type": "color", "value": "#000", "opacity": 1}, "layers": [layer]}}).json()
    h = auth("a")
    r = client.post(f"/api/internal/image-templates/{t['id']}/collages", headers=h, json={
        "ratio": "1:1", "mode": "month", "period": "2026-10", "label": "Octubre 2026",
        "photos": [{"pet_id": 1, "url": "https://cdn.test/a.webp", "name": "Luna"}]})
    assert r.status_code == 200, r.text
    usage = client.get("/api/internal/creator/image-templates/stats/usage", headers=hc).json()
    u = usage.get(str(t["id"])) or usage.get(t["id"]) or {}
    assert u.get("tenants_count") == 1 and u.get("designs") == 1, usage
    d = u["downloads"][0]
    assert d["label"] == "Octubre 2026" and d["photos"] == 1 and d["ratio"] == "1:1"
    assert d["tenant_name"] and d["user_name"] and d["created_at"]
    # Usada pero editable (los collages no se bloquean)
    client.post(f"/api/internal/image-templates/{t['id']}/use", headers=h)
    r = client.patch(f"/api/internal/creator/image-templates/{t['id']}", headers=hc, json={"name": "Collage editado"})
    assert r.status_code == 200 and r.json()["is_locked"] is False, r.text
    # No aparece en «Mis diseños»
    mine = client.get("/api/internal/image-templates/exports", headers=h, params={"page_size": 60}).json()
    assert all(i["kind"] != "collage" for i in mine["items"])

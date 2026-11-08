"""Imagen de los servicios especiales: se sube (1:1, WebP optimizado), se guarda en
srv_services.image_url y el formulario público la recibe solo para los especiales."""
import io
import uuid

from PIL import Image

from app import models


def _png(w=900, h=600):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), "#a0522d").save(buf, "PNG")
    buf.seek(0)
    return buf


def test_imagen_servicio_especial(client, auth, db, world):
    h = auth("a")
    r = client.post("/api/internal/services/upload-image", headers=h,
                    files={"file": ("Eutanasia.png", _png(), "image/png")})
    assert r.status_code == 200, r.text
    url = r.json()["image_url"]
    assert url

    tag = uuid.uuid4().hex[:6]
    esp = client.post("/api/internal/services", headers=h, json={
        "name": f"Eutanasia {tag}", "price": 30000, "is_special": True, "image_url": url}).json()
    normal = client.post("/api/internal/services", headers=h, json={
        "name": f"Traslado {tag}", "price": 10000, "image_url": url}).json()
    assert esp["image_url"] == url

    slug = db.query(models.Tenant).get(world["tenant_a"]).slug
    items = {i["name"]: i for i in client.get(f"/api/public/tenant/{slug}/services").json()}
    assert items[f"Eutanasia {tag}"]["image_url"] == url
    assert items[f"Traslado {tag}"]["image_url"] is None

    # Quitar la imagen
    r = client.patch(f"/api/internal/services/{esp['id']}", headers=h, json={"image_url": None})
    assert r.status_code == 200 and r.json()["image_url"] is None

    # Formato no permitido
    r = client.post("/api/internal/services/upload-image", headers=h,
                    files={"file": ("x.gif", io.BytesIO(b"GIF89a"), "image/gif")})
    assert r.status_code == 400
    assert normal["id"]

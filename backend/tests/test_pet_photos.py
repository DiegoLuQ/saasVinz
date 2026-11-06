"""Mascotas → «Fotos de mascotas»: lista paginada (10), búsqueda por mascota o
dueño, ZIP y descarga individual solo desde el almacenamiento propio."""
import io
import uuid
import zipfile

import pytest

from app.core.config import settings
from app.services import pet_photos

BASE = "https://r2.vinzer-pruebas.cl"


@pytest.fixture
def photos_world(client, auth, monkeypatch):
    monkeypatch.setattr(settings, "R2_PUBLIC_URL", BASE)
    monkeypatch.setattr(pet_photos, "requests", type("R", (), {"get": staticmethod(
        lambda url, **kw: type("Resp", (), {"status_code": 200, "content": f"img:{url}".encode()})())}))
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Rocío {tag}", "phone": "912345678"}).json()
    pets = []
    for i in range(6):
        imgs = [f"{BASE}/t/{tag}-{i}-a.webp", f"{BASE}/t/{tag}-{i}-b.jpg"]
        p = client.post("/api/internal/pets", headers=h, json={
            "name": f"Toby{i} {tag}", "species": "Canino", "customer_id": c["id"], "images": imgs, "image_url": imgs[0]}).json()
        pets.append(p)
    # Una URL ajena (no se descarga nunca)
    evil = client.post("/api/internal/pets", headers=h, json={
        "name": f"Malo {tag}", "species": "Felino", "customer_id": c["id"], "images": ["http://169.254.169.254/x.png"]}).json()
    return {"h": h, "tag": tag, "pets": pets, "evil": evil}


def test_lista_paginada_y_busqueda(client, photos_world):
    h, tag = photos_world["h"], photos_world["tag"]
    r = client.get(f"/api/internal/pets/photos?q={tag}", headers=h).json()
    assert r["total"] == 13 and r["pets"] == 7 and len(r["items"]) == 10
    assert len(client.get(f"/api/internal/pets/photos?q={tag}&page=2", headers=h).json()["items"]) == 3
    # Por dueño
    assert client.get(f"/api/internal/pets/photos?q=Rocío {tag}", headers=h).json()["total"] == 13
    # Por mascota
    r = client.get(f"/api/internal/pets/photos?q=Toby2 {tag}", headers=h).json()
    assert r["total"] == 2 and r["items"][1]["filename"].endswith("-2.jpg")


def test_zip_solo_fotos_propias(client, photos_world):
    h, tag = photos_world["h"], photos_world["tag"]
    r = client.get(f"/api/internal/pets/photos/download?q={tag}", headers=h)
    assert r.status_code == 200 and r.headers["x-photos-count"] == "12"
    names = zipfile.ZipFile(io.BytesIO(r.content)).namelist()
    assert len(names) == 12 and not any("malo" in n for n in names)


def test_descarga_individual(client, auth, photos_world):
    h, pet = photos_world["h"], photos_world["pets"][0]
    r = client.get(f"/api/internal/pets/{pet['id']}/photos/1/download", headers=h)
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"
    assert "attachment" in r.headers["content-disposition"]
    assert client.get(f"/api/internal/pets/{photos_world['evil']['id']}/photos/0/download", headers=h).status_code == 404
    # Otro crematorio no la ve
    assert client.get(f"/api/internal/pets/{pet['id']}/photos/0/download", headers=auth("b")).status_code == 404

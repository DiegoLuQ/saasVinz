"""Quitar una foto de la mascota: no falla aunque el archivo no exista en la nube,
y conserva el archivo si otro registro (p. ej. el registro web) lo usa."""
import uuid

from app import models


def test_quitar_foto_de_mascota(client, auth, db):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Toby {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    a = f"https://example.invalid/tenant_x/library/submissions/a_{tag}.webp"
    b = f"https://example.invalid/tenant_x/library/submissions/b_{tag}.webp"
    pet = db.query(models.Pet).get(p["id"])
    pet.images, pet.image_url = [a, b], a
    db.commit()

    r = client.delete("/api/internal/pets/delete-image", headers=h, params={"image_path": a, "pet_id": p["id"]})
    assert r.status_code == 200, r.text
    db.expire_all()
    pet = db.query(models.Pet).get(p["id"])
    assert pet.images == [b] and pet.image_url == b

    # Una foto que no es de la mascota → 403; de otro tenant → 404
    r = client.delete("/api/internal/pets/delete-image", headers=h, params={"image_path": a, "pet_id": p["id"]})
    assert r.status_code == 403
    r = client.delete("/api/internal/pets/delete-image", headers=auth("b"), params={"image_path": b, "pet_id": p["id"]})
    assert r.status_code == 404

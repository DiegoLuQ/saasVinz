"""Regresión: eliminar un diseño de plantilla (`TemplateExport`) o una orden
sin borrar la mascota NO debe eliminar de R2 las fotos originales de la mascota
(`photo_1..3` ni `oc_details.images`) ni archivos aún referenciados."""


def test_delete_recipe_export_preserves_pet_photos(client, auth, db, monkeypatch):
    from app import models
    from app.api.internal.common.media_service import MediaService

    borradas: list[str] = []
    monkeypatch.setattr(
        MediaService,
        "delete_media_by_url",
        classmethod(lambda cls, _db, url: borradas.append(url) or True),
    )

    h = auth("a")
    c = client.post("/api/internal/customers", headers=h, json={"name": "Tutor Trixie"}).json()
    p = client.post(
        "/api/internal/pets",
        headers=h,
        json={"name": "Trixie", "species": "Felino", "customer_id": c["id"]},
    ).json()

    r2_photo1 = "https://pub-demo.r2.dev/tenant_1/submissions/sub_1_1.webp"
    r2_photo2 = "https://pub-demo.r2.dev/tenant_1/submissions/sub_1_2.webp"
    r2_photo3 = "https://pub-demo.r2.dev/tenant_1/submissions/sub_1_3.webp"
    r2_ia = "https://pub-demo.r2.dev/tenant_1/ia/ia_only_trixie.webp"

    pet = db.query(models.Pet).get(p["id"])
    pet.image_url = r2_photo1
    pet.images = [r2_photo1, r2_photo2, r2_photo3]
    db.commit()

    design_exp = models.TemplateExport(
        tenant_id=pet.tenant_id,
        pet_id=pet.id,
        title="Redes Trixie",
        kind="design",
        media_url=None,
        meta={
            "ratio": "4:5",
            "photos": {
                "photo_1": {"url": r2_photo1, "zoom": 1, "offset_x": 0, "offset_y": 0},
                "photo_2": {"url": r2_photo2, "zoom": 1, "offset_x": 0, "offset_y": 0},
                "photo_3": {"url": r2_photo3, "zoom": 1, "offset_x": 0, "offset_y": 0},
                "ai": {"url": r2_ia, "zoom": 1, "offset_x": 0, "offset_y": 0},
            },
        },
    )
    db.add(design_exp)
    db.commit()
    db.refresh(design_exp)

    try:
        res = client.delete(f"/api/internal/image-templates/exports/{design_exp.id}", headers=h)
        assert res.status_code == 200, res.text

        # Las fotos reales de la mascota nunca deben borrarse de R2
        assert r2_photo1 not in borradas
        assert r2_photo2 not in borradas
        assert r2_photo3 not in borradas
        # La ilustración /ia/ sin otras referencias sí se limpia
        assert borradas == [r2_ia]
    finally:
        client.delete(f"/api/internal/pets/{pet.id}", headers=h)


def test_delete_order_preserves_shared_pet_photos(client, auth, db, monkeypatch):
    from app import models
    from app.api.internal.common.media_service import MediaService

    borradas: list[str] = []
    monkeypatch.setattr(
        MediaService,
        "delete_media_by_url",
        classmethod(lambda cls, _db, url: borradas.append(url) or True),
    )

    h = auth("a")
    c = client.post("/api/internal/customers", headers=h, json={"name": "Tutor Orden"}).json()
    p = client.post(
        "/api/internal/pets",
        headers=h,
        json={"name": "Michi", "species": "Felino", "customer_id": c["id"]},
    ).json()

    shared_photo = "https://pub-demo.r2.dev/tenant_1/submissions/sub_michi.webp"
    pet = db.query(models.Pet).get(p["id"])
    pet.image_url = shared_photo
    pet.images = [shared_photo]
    db.commit()

    o = client.post("/api/internal/cremations", headers=h, json={"pet_id": pet.id, "status": "pendiente"})
    assert o.status_code in (200, 201), o.text
    order_id = o.json()["id"]

    details = db.query(models.CremationDetails).filter(models.CremationDetails.cremation_id == order_id).first()
    details.images = [shared_photo]
    db.commit()

    try:
        r = client.delete(f"/api/internal/cremations/{order_id}", headers=h)
        assert r.status_code == 200, r.text
        assert shared_photo not in borradas
    finally:
        client.delete(f"/api/internal/pets/{pet.id}", headers=h)


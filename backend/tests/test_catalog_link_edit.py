"""Editar un enlace del catálogo (botón «Editar» en Enlaces Generados): cambia etiqueta,
mensaje y vigencia sin cambiar la URL; otro crematorio no puede tocarlo."""


def test_editar_enlace_de_planes(client, auth):
    h = auth("a")
    r = client.post("/api/internal/catalog/links", headers=h,
                    json={"catalog_type": "plans", "name": "Viejo", "expires_in_hours": 240})
    assert r.status_code == 201, r.text
    link = r.json()
    try:
        e = client.patch(f"/api/internal/catalog/links/{link['id']}", headers=h, json={
            "name": "  Familia Pérez ", "message": "Te acompañamos", "renew_expiration": True, "expires_in_hours": None})
        assert e.status_code == 200, e.text
        d = e.json()
        assert (d["name"], d["message"], d["expires_at"], d["token"]) == ("Familia Pérez", "Te acompañamos", None, link["token"])

        # Solo cambia lo enviado; vigencia inválida para planes
        e = client.patch(f"/api/internal/catalog/links/{link['id']}", headers=h, json={"message": ""})
        assert (e.json()["name"], e.json()["message"]) == ("Familia Pérez", None)
        bad = client.patch(f"/api/internal/catalog/links/{link['id']}", headers=h,
                           json={"renew_expiration": True, "expires_in_hours": 24})
        assert bad.status_code == 400

        assert client.patch(f"/api/internal/catalog/links/{link['id']}", headers=auth("b"),
                            json={"name": "x"}).status_code == 404
    finally:
        client.delete(f"/api/internal/catalog/links/{link['id']}", headers=h)


def test_enlace_toggle_video(client, auth, db):
    from app.api.internal.admin.models import Tenant
    h = auth("a")

    # 1. Video info endpoint
    vinfo = client.get("/api/internal/catalog/links/video-info", headers=h)
    assert vinfo.status_code == 200
    assert "has_video" in vinfo.json()

    # Asignar un video dummy al tenant para probar la entrega pública
    tenant = db.query(Tenant).filter(Tenant.id == 1).first()
    if tenant:
        tenant.catalog_video = {
            "source": "upload",
            "url": "https://cdn.test/video.mp4",
            "duration": 25.0,
            "button_text": "Ver video",
        }
        db.commit()

    # 2. Crear enlace con show_video=False
    r = client.post("/api/internal/catalog/links", headers=h,
                    json={"catalog_type": "plans", "name": "Sin Video", "show_video": False})
    assert r.status_code == 201
    l_no_video = r.json()
    assert l_no_video["show_video"] is False

    # 3. Crear enlace con show_video=True (default)
    r2 = client.post("/api/internal/catalog/links", headers=h,
                     json={"catalog_type": "plans", "name": "Con Video"})
    assert r2.status_code == 201
    l_video = r2.json()
    assert l_video["show_video"] is True

    try:
        # 4. Probar endpoints públicos
        if tenant:
            pub_no = client.get(f"/api/public/catalog/{tenant.slug}/{l_no_video['token']}")
            assert pub_no.status_code == 200
            assert pub_no.json()["catalog_video"] is None

            pub_yes = client.get(f"/api/public/catalog/{tenant.slug}/{l_video['token']}")
            assert pub_yes.status_code == 200
            assert pub_yes.json()["catalog_video"] is not None

        # 5. Modificar enlace: cambiar show_video de False a True
        e = client.patch(f"/api/internal/catalog/links/{l_no_video['id']}", headers=h, json={"show_video": True})
        assert e.status_code == 200
        assert e.json()["show_video"] is True

        if tenant:
            pub_updated = client.get(f"/api/public/catalog/{tenant.slug}/{l_no_video['token']}")
            assert pub_updated.status_code == 200
            assert pub_updated.json()["catalog_video"] is not None
    finally:
        client.delete(f"/api/internal/catalog/links/{l_no_video['id']}", headers=h)
        client.delete(f"/api/internal/catalog/links/{l_video['id']}", headers=h)


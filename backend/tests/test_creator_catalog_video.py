"""Pruebas de video de bienvenida del catálogo público gestionado por SuperAdmin (admin.vinzer.cl)."""
from unittest.mock import patch
from app import models


def test_creator_save_and_delete_catalog_video(client, auth, db, world):
    h_creator = auth("creator")
    h_tenant = auth("a")

    # 1. Tenant común no puede llamar al endpoint del creador
    r_unauth = client.post("/api/internal/creator/tenants/crematorio-a/catalog-video", headers=h_tenant, data={"video_url": "https://vimeo.com/123456789"})
    assert r_unauth.status_code == 403

    # 2. Creador configura video vía enlace simulado
    mock_checked = {
        "source": "vimeo",
        "url": "https://player.vimeo.com/video/123456789",
        "duration": 25.0
    }
    with patch("app.services.form_video.check_link", return_value=mock_checked):
        r_save = client.post(
            "/api/internal/creator/tenants/crematorio-a/catalog-video",
            headers=h_creator,
            data={"video_url": "https://vimeo.com/123456789", "button_text": "Conoce nuestras instalaciones"}
        )
        assert r_save.status_code == 200, r_save.text
        data = r_save.json()["catalog_video"]
        assert data["source"] == "vimeo"
        assert data["duration"] == 25.0
        assert data["button_text"] == "Conoce nuestras instalaciones"

    # 3. Bootstrap y Detalle en Admin muestran el video
    r_boot = client.get("/api/internal/creator/tenants/crematorio-a/dashboard_bootstrap", headers=h_creator)
    assert r_boot.status_code == 200
    assert r_boot.json()["tenant"]["catalog_video"]["source"] == "vimeo"

    # 4. Catálogo público expone el video
    link = client.post("/api/internal/catalog/links", headers=h_tenant, json={"catalog_type": "products"})
    assert link.status_code == 201
    token = link.json()["token"]

    r_pub = client.get(f"/api/public/catalog/crematorio-a/{token}")
    assert r_pub.status_code == 200
    pub_data = r_pub.json()
    assert pub_data["catalog_video"] is not None
    assert pub_data["catalog_video"]["source"] == "vimeo"
    assert pub_data["catalog_video"]["button_text"] == "Conoce nuestras instalaciones"

    # 5. Creador elimina el video
    r_del = client.delete("/api/internal/creator/tenants/crematorio-a/catalog-video", headers=h_creator)
    assert r_del.status_code == 200

    r_pub2 = client.get(f"/api/public/catalog/crematorio-a/{token}")
    assert r_pub2.status_code == 200
    assert r_pub2.json()["catalog_video"] is None

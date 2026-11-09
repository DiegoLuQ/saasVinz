"""Página pública /tour editable desde Admin (sys_saas_config.tour_content)."""
URL = "/api/internal/creator/config/tour"


def test_tour_editable_por_superadmin(client, auth):
    h = auth("creator")
    try:
        # Un crematorio no puede editarlo
        assert client.put(URL, headers=auth("a"), json={"content": None}).status_code in (401, 403)

        body = {"content": {
            "video_url": "https://www.youtube.com/watch?v=abcdefghijk&t=5",
            "modules": [
                {"title": "Recepción y Código", "image_url": "https://cdn.example.com/a.webp", "tags": ["A", " ", "B"],
                 "highlights": ["Uno"], "video_time": "01:15"},
                {"id": "Recepción y Código", "title": "Otro módulo", "image_url": "javascript:alert(1)"},
            ],
        }}
        r = client.put(URL, headers=h, json=body)
        assert r.status_code == 200, r.text
        c = r.json()["content"]
        assert c["video_url"] == "https://www.youtube-nocookie.com/embed/abcdefghijk"
        m1, m2 = c["modules"]
        assert m1["id"] == "recepci-n-y-c-digo" or m1["id"].startswith("recep")
        assert m2["id"] != m1["id"]  # ids únicos
        assert m1["tags"] == ["A", "B"] and m1["short_label"] == "Recepción y"
        assert m2["image_url"] == ""  # solo http(s) o rutas propias

        pub = client.get("/api/public/tour").json()["content"]
        assert pub["modules"][0]["title"] == "Recepción y Código"

        # Validaciones
        bad = {"content": {"video_url": "https://evil.example.com/v.mp4", "modules": [{"title": "X"}]}}
        assert client.put(URL, headers=h, json=bad).status_code == 400
        assert client.put(URL, headers=h, json={"content": {"modules": []}}).status_code == 400
        assert client.put(URL, headers=h, json={"content": {"modules": [{"title": "X", "video_time": "abc"}]}}).status_code == 400
        vimeo = client.put(URL, headers=h, json={"content": {"video_url": "https://vimeo.com/123456789", "modules": [{"title": "X"}]}})
        assert vimeo.json()["content"]["video_url"] == "https://player.vimeo.com/video/123456789"
    finally:
        # Volver al original
        r = client.put(URL, headers=h, json={"content": None})
        assert r.status_code == 200 and r.json()["content"] is None
    assert client.get("/api/public/tour").json()["content"] is None

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

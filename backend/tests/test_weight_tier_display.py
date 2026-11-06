"""Ícono (imagen subida) y ejemplos de cada rango de peso: se guardan con los rangos
de la General y de cada tabla de precios, y el catálogo/formulario los reciben."""
from tests.test_plan_weight_prices import tabla  # noqa: F401  (fixture)
from tests.test_public_form import _png


def test_rangos_generales_con_icono_y_ejemplos(client, tabla):
    h = tabla["h"]
    r = client.post("/api/internal/maintenance/weight-icon", headers=h,
                    files={"file": ("perro.png", _png(), "image/png")})
    assert r.status_code == 200, r.text
    icon = r.json()["url"]
    assert icon
    r = client.put("/api/internal/maintenance/weight-pricing", headers=h, json={"tiers": [
        {"label": "Mini", "min_weight": 0, "max_weight": 1, "price": 0, "icon_url": icon, "examples": "  Aves,   roedores "},
        {"label": "Resto", "min_weight": 1.1, "max_weight": None, "price": 0},
    ]})
    assert r.status_code == 200, r.text
    pub = client.get("/api/public/tenant/crematorio-a").json()["weight_tiers"]
    assert (pub[0]["icon_url"], pub[0]["examples"]) == (icon, "Aves, roedores")
    assert pub[1]["icon_url"] is None and pub[1]["examples"] is None

    bad = client.put("/api/internal/maintenance/weight-pricing", headers=h, json={"tiers": [
        {"min_weight": 0, "max_weight": None, "price": 0, "icon_url": "javascript:alert(1)"}]})
    assert bad.status_code == 400
    assert client.post("/api/internal/maintenance/weight-icon", headers=h,
                       files={"file": ("x.gif", b"GIF89a", "image/gif")}).status_code == 400


def test_tabla_de_precios_guarda_icono_y_ejemplos(client, tabla, db):
    from app import models
    r = client.post("/api/internal/price-lists", headers=tabla["h"], json={
        "name": "Con íconos", "tiers": [{"max_weight": 1, "icon_url": "https://cdn.example/mini.webp", "examples": "Hámster"}]})
    assert r.status_code == 200, r.text
    t = r.json()["tiers"][0]
    assert (t["icon_url"], t["examples"]) == ("https://cdn.example/mini.webp", "Hámster")
    client.delete(f"/api/internal/price-lists/{r.json()['id']}", headers=tabla["h"])
    assert db.query(models.PriceList).filter(models.PriceList.name == "Con íconos").count() == 0


def test_biblioteca_de_iconos_solo_globales(client, auth, db, world):
    """El tenant ve los íconos globales de la categoría «tamanos», nunca los de otro crematorio."""
    from app.api.internal.common.models import MediaLibrary, MediaCategory
    assert db.query(MediaCategory).filter(MediaCategory.key == "tamanos").count() == 1
    glob = MediaLibrary(url="https://cdn.example/global-perro.webp", media_type="image", category="tamanos", tenant_id=None)
    otro = MediaLibrary(url="https://cdn.example/ajeno.webp", media_type="image", category="tamanos", tenant_id=world["tenant_b"])
    db.add_all([glob, otro])
    db.commit()
    try:
        r = client.get("/api/internal/media?category=tamanos&media_type=image&page_size=100", headers=auth("a"))
        assert r.status_code == 200, r.text
        urls = [i["url"] for i in r.json()["items"]]
        assert glob.url in urls and otro.url not in urls
    finally:
        db.delete(glob)
        db.delete(otro)
        db.commit()

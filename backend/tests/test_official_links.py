"""Enlaces oficiales (formulario, catálogo de planes y de productos) y la «tiendita
de recuerdos»: solo con los tres configurados; hasta 6 productos con el más vendido."""
import secrets
import uuid

from app import models
from app.api.internal.catalog.models import CatalogShareToken
from app.services import official_links
from app.services.email import render_vinzer_email
from tests.test_stock import _pet


def _link(db, tid, kind, expires=True):
    from datetime import timedelta
    from app.utils import tz
    t = CatalogShareToken(tenant_id=tid, token=secrets.token_urlsafe(16), catalog_type=kind, is_active=True,
                          views_count=0, name=f"{kind} oficial", expires_at=tz.get_now() + timedelta(days=2) if expires else None)
    db.add(t)
    db.commit()
    return t


def test_enlaces_oficiales_y_tiendita(client, auth, db, world):
    h = auth("a")
    tid = world["tenant_a"]
    tenant = db.query(models.Tenant).get(tid)
    tenant.official_links = None
    db.commit()

    st = client.get("/api/internal/official-links", headers=h).json()
    assert st["complete"] is False and set(st["missing"]) == {"form", "plans", "products"}
    assert client.get("/api/public/tenant/crematorio-a").json()["souvenir_store_url"] is None

    plans, prods = _link(db, tid, "plans"), _link(db, tid, "products")
    # Tipo equivocado → 400
    assert client.put("/api/internal/official-links", headers=h,
                      json={"form": "main", "plans_token_id": prods.id, "products_token_id": prods.id}).status_code == 400
    # Solo el admin
    r = client.put("/api/internal/official-links", headers=h,
                   json={"form": "main", "plans_token_id": plans.id, "products_token_id": prods.id})
    assert r.status_code == 200 and r.json()["complete"] is True, r.text
    db.expire_all()
    assert db.query(CatalogShareToken).get(prods.id).expires_at is None  # el oficial deja de vencer

    url = client.get("/api/public/tenant/crematorio-a").json()["souvenir_store_url"]
    assert url and url.endswith(f"/crematorio-a/{prods.token}")

    # Otro crematorio no puede usar estos enlaces
    assert client.put("/api/internal/official-links", headers=auth("b"),
                      json={"form": "main", "plans_token_id": plans.id, "products_token_id": prods.id}).status_code == 400

    # Desactivar el catálogo oficial apaga la tiendita
    prods.is_active = False
    db.commit()
    assert client.get("/api/public/tenant/crematorio-a").json()["souvenir_store_url"] is None
    assert "products" in client.get("/api/internal/official-links", headers=h).json()["missing"]


def test_recuerdos_mas_vendido_siempre(client, auth, db, world):
    h = auth("b")
    tid = world["tenant_b"]
    tag = uuid.uuid4().hex[:6]
    db.query(models.Product).filter(models.Product.tenant_id == tid).update({"is_active": False})
    db.commit()
    ids = []
    for i in range(8):
        p = client.post("/api/internal/products", headers=h, json={
            "name": f"Relicario {i} {tag}", "cost_price": 0, "sale_price": 10000 + i, "stock": 5,
            "image_url": f"https://cdn.test/{tag}/{i}.webp"}).json()
        ids.append(p["id"])
    sin_foto = client.post("/api/internal/products", headers=h, json={
        "name": f"Sin foto {tag}", "cost_price": 0, "sale_price": 1, "stock": 5}).json()
    best = ids[5]
    r = client.post("/api/internal/cremations", headers=h, json={"pet_id": _pet(client, h, tag), "status": "pendiente",
                    "products": [{"product_id": best, "quantity": 3, "unit_price": 1, "precio_costo": 0}]})
    assert r.status_code == 200, r.text

    for _ in range(5):
        chosen = official_links.souvenir_products(db, tid)
        assert len(chosen) == 6 and chosen[0].id == best
        assert sin_foto["id"] not in [p.id for p in chosen]

    html = render_vinzer_email("Recibimos tu solicitud", ["Hola"], products={
        "title": "Recuerdos para honrar a Luna", "url": "https://catalogo.test/x/y", "button_label": "Ver catálogo",
        "items": [{"name": p.name, "price": "$10.000", "image_url": p.image_url} for p in chosen]})
    assert "Recuerdos para honrar a Luna" in html and chosen[0].image_url in html and "https://catalogo.test/x/y" in html

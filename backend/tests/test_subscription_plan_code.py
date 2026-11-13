"""Código fijo del plan SaaS (sys_subscription_plans.code): renombrar un plan desde
Admin → Planes cambia el nombre en todo el sistema sin romper la lógica que antes
comparaba el nombre (marca blanca, plan FREE del registro…), y «Orden» manda."""
import uuid

from app import models
from app.services.plan_features import make_plan_code, plan_code, show_vinzer_brand


def _body(plan, **over):
    keys = ("name", "max_pets", "max_services", "max_plans", "max_products", "max_orders", "max_customers",
            "max_users", "max_partners", "allowed_modules", "can_delete", "can_export", "price", "display_order")
    return {**{k: getattr(plan, k) for k in keys}, **over}


def test_renombrar_plan_mantiene_codigo_y_logica(client, auth, db, world):
    h = auth("creator")
    free = db.get(models.SubscriptionPlan, world["free_plan_id"])
    tenant = db.query(models.Tenant).filter(models.Tenant.subscription_plan_id == free.id).first()
    assert show_vinzer_brand(tenant)  # FREE muestra la marca Vinzer

    try:
        r = client.put(f"/api/internal/creator/plans/{free.id}", headers=h, json=_body(free, name="Gratis"))
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "Gratis" and r.json()["code"] == "FREE"
        db.expire_all()
        tenant = db.get(models.Tenant, tenant.id)
        assert tenant.plan == "Gratis"              # copia antigua del nombre al día
        assert plan_code(tenant.subscription_plan) == "FREE"
        assert show_vinzer_brand(tenant)            # la regla por defecto sigue al código

        pub = client.get("/api/public/plans").json()
        row = next(p for p in pub if p["name"] == "Gratis")
        assert row["code"] == "FREE"

        # Nombre repetido (sin importar mayúsculas) = 400 amable
        pro = db.get(models.SubscriptionPlan, world["pro_plan_id"])
        r = client.put(f"/api/internal/creator/plans/{pro.id}", headers=h, json=_body(pro, name="gratis"))
        assert r.status_code == 400 and "Ya existe" in r.json()["detail"]
    finally:
        db.expire_all()
        free = db.get(models.SubscriptionPlan, world["free_plan_id"])
        client.put(f"/api/internal/creator/plans/{free.id}", headers=h, json=_body(free, name="FREE"))


def test_crear_plan_recibe_codigo_y_queda_al_final(client, auth, db):
    h = auth("creator")
    name = f"Plan Test {uuid.uuid4().hex[:4]}"
    top = max((p.display_order or 0) for p in db.query(models.SubscriptionPlan).all())
    r = client.post("/api/internal/creator/plans", headers=h, json={
        "name": name, "max_pets": 1, "max_services": 1, "max_plans": 1, "max_products": 1, "max_orders": 1,
        "max_customers": 1, "max_users": 1, "max_partners": 0, "allowed_modules": ["dashboard"],
        "can_delete": False, "can_export": False, "price": 0})
    assert r.status_code == 200, r.text
    data = r.json()
    try:
        assert data["code"] == name.upper().replace(" ", "_")
        assert data["display_order"] == top + 1

        # «Orden» se guarda y la lista sale ordenada por él
        plan = db.get(models.SubscriptionPlan, data["id"])
        r = client.put(f"/api/internal/creator/plans/{plan.id}", headers=h, json=_body(plan, display_order=0))
        assert r.status_code == 200 and r.json()["display_order"] == 0
        assert r.json()["code"] == data["code"]
        orders = [p["display_order"] for p in client.get("/api/internal/creator/plans", headers=h).json()]
        assert orders == sorted(orders) and orders[0] == 0
    finally:
        client.delete(f"/api/internal/creator/plans/{data['id']}", headers=h)


def test_make_plan_code_unico():
    assert make_plan_code("Pro Plus", set()) == "PRO_PLUS"
    assert make_plan_code("Pro", {"PRO"}) == "PRO_2"
    assert make_plan_code("  ", set()) == "PLAN"
    assert len(make_plan_code("x" * 50, set())) <= 20


def test_desactivar_plan_deja_de_ofrecerse(client, auth, db, world):
    """Admin → Planes «Desactivar»: sale de la web y del cambio de plan; quien ya lo
    tiene lo sigue viendo como su plan actual."""
    h = auth("creator")
    pro = db.get(models.SubscriptionPlan, world["pro_plan_id"])
    try:
        r = client.put(f"/api/internal/creator/plans/{pro.id}", headers=h, json=_body(pro, is_active=False))
        assert r.status_code == 200 and r.json()["is_active"] is False
        assert all(p["code"] != "PRO" for p in client.get("/api/public/plans").json())
        # El admin lo sigue viendo para reactivarlo
        assert any(p["id"] == pro.id for p in client.get("/api/internal/creator/plans", headers=h).json())
        # Un crematorio en PRO lo sigue viendo; uno en FREE no puede pedirlo
        ids_a = [p["id"] for p in client.get("/api/internal/billing/plans", headers=auth("a")).json()]
        assert pro.id in ids_a
        ids_free = [p["id"] for p in client.get("/api/internal/billing/plans", headers=auth("free")).json()]
        assert pro.id not in ids_free
        # Guardar sin is_active no lo reactiva
        db.expire_all()
        pro = db.get(models.SubscriptionPlan, world["pro_plan_id"])
        body = _body(pro); body.pop("display_order")
        r = client.put(f"/api/internal/creator/plans/{pro.id}", headers=h, json=body)
        assert r.json()["is_active"] is False
    finally:
        db.expire_all()
        pro = db.get(models.SubscriptionPlan, world["pro_plan_id"])
        client.put(f"/api/internal/creator/plans/{pro.id}", headers=h, json=_body(pro, is_active=True))

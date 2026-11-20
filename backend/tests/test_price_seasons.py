"""Temporadas de precios de los planes SaaS (sys_price_seasons).

Lanzamiento (vigente) → Regular a mano: los planes toman los precios y el % anual
de la temporada activa; los crematorios que ya contrataron mantienen su precio.
"""
from app import models
from app.services import plan_pricing

BASE = "/api/internal/creator/pricing/seasons"


def test_temporadas_lanzamiento_a_regular(client, auth, db, world):
    h = auth("creator")
    plan = (db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.price > 0)
            .order_by(models.SubscriptionPlan.price.desc()).first())
    old_price, old_annual = plan.price, plan.annual_price
    cfg = db.query(models.SaaSConfig).first()
    old_pct, old_launch = cfg.annual_discount_pct, cfg.annual_discount_launch
    tenant = db.get(models.Tenant, world["tenant_a"])
    old_contracted = (tenant.contracted_price, tenant.contracted_season)
    created = []
    try:
        # Solo el SuperAdmin
        assert client.get(BASE, headers=auth("a")).status_code in (401, 403)
        seasons = client.get(BASE, headers=h).json()["seasons"]
        launch = next(s for s in seasons if s["is_current"])
        assert launch["name"] == "Lanzamiento"

        # El crematorio contrató en el Lanzamiento: su precio queda congelado
        plan_pricing.lock_contracted_price(tenant, 119000, "monthly")
        db.commit()
        assert tenant.contracted_season == "Lanzamiento"

        # Nueva temporada «Regular» (no se activa sola)
        r = client.post(BASE, headers=h, json={"name": "Regular", "annual_discount_pct": 15,
                                               "prices": {str(plan.id): 292000}})
        assert r.status_code == 200, r.text
        regular = r.json()
        created.append(regular["id"])
        assert regular["is_current"] is False
        row = next(x for x in regular["rows"] if x["plan_id"] == plan.id)
        assert row["monthly"] == 292000 and row["annual"] == round(292000 * 12 * 0.85)
        db.expire_all()
        assert db.get(models.SubscriptionPlan, plan.id).price == old_price  # aún no cambia

        # Nombre duplicado / % fuera de rango
        assert client.post(BASE, headers=h, json={"name": "regular"}).status_code == 400
        assert client.post(BASE, headers=h, json={"name": "X", "annual_discount_pct": 99}).status_code == 400

        # Lanzamiento muestra tachado el precio Regular
        lp = {**launch, "compare_season_id": regular["id"],
              "prices": {str(x["plan_id"]): x["monthly"] for x in launch["rows"]}}
        assert client.put(f"{BASE}/{launch['id']}", headers=h, json=lp).status_code == 200
        pub = next(p for p in client.get("/api/public/plans").json() if p["name"] == plan.name)
        assert pub["compare_price"] == 292000
        info = client.get("/api/public/plans/annual-discount").json()
        assert info["season"] == "Lanzamiento" and info["compare_season"] == "Regular"

        # La vigente no se puede borrar
        assert client.delete(f"{BASE}/{launch['id']}", headers=h).status_code == 409

        # Activar Regular: todo el sistema toma sus precios y su % anual
        r = client.post(f"{BASE}/{regular['id']}/activate", headers=h)
        assert r.status_code == 200 and r.json()["is_current"] is True
        db.expire_all()
        p2 = db.get(models.SubscriptionPlan, plan.id)
        assert p2.price == 292000 and p2.annual_price == round(292000 * 12 * 0.85)
        cfg2 = db.query(models.SaaSConfig).first()
        assert cfg2.annual_discount_pct == 15
        pub = next(p for p in client.get("/api/public/plans").json() if p["name"] == plan.name)
        assert pub["price"] == 292000 and pub["compare_price"] is None
        # El crematorio del Lanzamiento mantiene su precio para siempre
        t2 = db.get(models.Tenant, world["tenant_a"])
        assert t2.contracted_price == 119000 and t2.contracted_season == "Lanzamiento"

        # Editar el precio del plan desde su tarjeta queda en la temporada vigente
        full = {k: getattr(p2, k) for k in ("name", "max_pets", "max_services", "max_plans", "max_products",
                                            "max_orders", "max_customers", "max_users", "max_partners",
                                            "allowed_modules", "can_delete", "can_export")}
        r = client.put(f"/api/internal/creator/plans/{plan.id}", headers=h, json={**full, "price": 299000})
        assert r.status_code == 200, r.text
        reg = next(s for s in client.get(BASE, headers=h).json()["seasons"] if s["id"] == regular["id"])
        assert next(x for x in reg["rows"] if x["plan_id"] == plan.id)["monthly"] == 299000
    finally:
        db.rollback()
        client.post(f"{BASE}/{launch['id']}/activate", headers=h)
        lp = client.get(BASE, headers=h).json()["seasons"]
        cur = next(s for s in lp if s["is_current"])
        client.put(f"{BASE}/{cur['id']}", headers=h, json={**cur, "compare_season_id": None,
                                                            "prices": {str(x["plan_id"]): x["monthly"] for x in cur["rows"]}})
        for sid in created:
            client.delete(f"{BASE}/{sid}", headers=h)
        db.expire_all()
        p = db.get(models.SubscriptionPlan, plan.id)
        p.price, p.annual_price = old_price, old_annual
        c = db.query(models.SaaSConfig).first()
        c.annual_discount_pct, c.annual_discount_launch = old_pct, old_launch
        t = db.get(models.Tenant, world["tenant_a"])
        t.contracted_price, t.contracted_season = old_contracted
        db.commit()

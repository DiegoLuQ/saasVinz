"""Fase 6: MRR, historial de planes, crematorios en riesgo/oportunidades y aviso de límite."""
import time
import uuid
from datetime import timedelta

import pytest

from app import models
from app.auth import get_password_hash
from app.services import limit_alerts
from app.services.business_metrics import mrr_for
from app.services.tenant_provisioning import provision_tenant
from app.utils import tz
from tests.conftest import PASSWORD, token_for


class _Plan:
    def __init__(self, price, annual=None):
        self.price, self.annual_price = price, annual


def test_mrr_mensual_anual_inactivo_y_gratis():
    assert mrr_for("active", _Plan(59990), None, "monthly") == 59990
    # Anual con precio congelado: se divide por 12.
    assert mrr_for("active", _Plan(59990, 539910), 480000, "annual") == 40000
    # Sin precio congelado se usa el de lista del ciclo.
    assert mrr_for("active", _Plan(59990, 539910), None, "annual") == round(539910 / 12, 2)
    assert mrr_for("suspended", _Plan(59990), None, "monthly") == 0
    assert mrr_for("active", _Plan(0), None, "monthly") == 0
    assert mrr_for("active", None, None, "monthly") == 0


@pytest.fixture
def tenant_medio(db, world):
    """Crematorio con un plan de 5 órdenes al mes (para el aviso del 80 %)."""
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == "MEDIO").first()
    if not plan:
        plan = models.SubscriptionPlan(name="MEDIO", price=29900, allowed_modules=["clientes", "mascotas", "ordenes", "servicios"],
                                       is_active=True, can_delete=True, can_export=False, features={},
                                       max_orders=5, max_users=4, max_pets=999, max_customers=999, max_services=10,
                                       max_products=10, max_plans=4, max_partners=0)
        db.add(plan)
        db.flush()
    slug = f"medio-{uuid.uuid4().hex[:6]}"
    tenant, admin = provision_tenant(db, subscription_plan=plan, admin_password_hash=get_password_hash(PASSWORD),
                                     name="Crematorio Medio", slug=slug, email=f"admin-{slug}@vinzer-pruebas.cl", phone="912345678")
    db.commit()
    return {"tenant": tenant.id, "admin": admin.id, "plan": plan.id}


def test_historial_registra_alta_cambio_de_plan_y_estado(db, world, tenant_medio):
    tid = tenant_medio["tenant"]
    events = db.query(models.TenantEvent).filter(models.TenantEvent.tenant_id == tid).all()
    assert [e.kind for e in events] == ["created"] and events[0].to_mrr == 29900

    tenant = db.query(models.Tenant).get(tid)
    tenant.subscription_plan_id = world["pro_plan_id"]
    db.commit()
    tenant.status = models.TenantStatus.suspended
    db.commit()

    events = db.query(models.TenantEvent).filter(models.TenantEvent.tenant_id == tid).order_by(models.TenantEvent.id).all()
    up, down = events[1], events[2]
    assert (up.kind, up.from_value, up.to_value) == ("plan_change", "MEDIO", "PRO")
    assert up.from_mrr == 29900 and up.to_mrr == 59990
    assert (down.kind, down.from_value, down.to_value) == ("status_change", "active", "suspended")
    assert down.from_mrr == 59990 and down.to_mrr == 0


def _order(client, h, name):
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Familia {name}"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": name, "species": "Canino", "customer_id": c["id"]}).json()
    r = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente"})
    assert r.status_code == 200, r.text


def _limit_notices(db, tid):
    db.expire_all()
    return db.query(models.Notification).filter(models.Notification.tenant_id == tid,
                                                models.Notification.type == "limit_warning").order_by(models.Notification.id).all()


def test_aviso_al_80_y_al_100_una_vez_por_mes(client, db, tenant_medio, sent_emails):
    tid = tenant_medio["tenant"]
    h = {"Authorization": f"Bearer {token_for(tenant_medio['admin'])}"}
    for i in range(3):
        _order(client, h, f"Uno {i}")
    assert _limit_notices(db, tid) == []

    _order(client, h, "Cuarta")  # 4 de 5 = 80 %
    notices = _limit_notices(db, tid)
    assert [n.data["level"] for n in notices] == ["warning"]
    assert "Te queda 1 orden" in notices[0].title and notices[0].audience == "owner"

    _order(client, h, "Quinta")  # 5 de 5
    assert [n.data["level"] for n in _limit_notices(db, tid)] == ["warning", "reached"]

    # Volver a revisar no repite el aviso del mes.
    assert limit_alerts.check_orders(db, tid) is None
    assert len(_limit_notices(db, tid)) == 2

    # Llega también un correo por cada nivel (se envía en segundo plano).
    for _ in range(40):
        if len(sent_emails) >= 2:
            break
        time.sleep(0.05)
    assert len(sent_emails) == 2


def test_metricas_solo_superadmin(client, auth):
    assert client.get("/api/internal/creator/business", headers=auth("a")).status_code == 403
    r = client.get("/api/internal/creator/business", headers=auth("creator"))
    assert r.status_code == 200
    data = r.json()
    assert {"mrr", "arr", "tenants", "by_plan", "series", "at_risk", "opportunities"} <= set(data)
    assert len(data["series"]) == 12


def test_en_riesgo_y_oportunidades(client, auth, db, tenant_medio):
    tid = tenant_medio["tenant"]
    h = {"Authorization": f"Bearer {token_for(tenant_medio['admin'])}"}
    for i in range(4):
        _order(client, h, f"Op {i}")

    data = client.get("/api/internal/creator/business", headers=auth("creator")).json()
    op = next(o for o in data["opportunities"] if o["id"] == tid)
    assert op["reasons"][0] == {"resource": "orders", "label": "Órdenes del mes", "usage": 4, "max": 5}
    assert op["suggested_plan"]["name"] == "PRO"
    assert all(r["id"] != tid for r in data["at_risk"])  # acaba de usarse

    # Sin uso hace 20 días: aparece en riesgo.
    old = tz.get_now() - timedelta(days=20)
    tenant = db.query(models.Tenant).get(tid)
    tenant.created_at = old
    for u in db.query(models.User).filter(models.User.tenant_id == tid):
        u.last_seen_at = old
    for o in db.query(models.Cremation).filter(models.Cremation.tenant_id == tid):
        o.created_at = old
    db.query(models.AuditLog).filter(models.AuditLog.tenant_id == tid).delete()
    db.commit()
    data = client.get("/api/internal/creator/business", headers=auth("creator")).json()
    risk = next(r for r in data["at_risk"] if r["id"] == tid)
    assert risk["days_inactive"] >= 19 and risk["mrr"] == 29900


def test_login_registra_ultimo_uso(client, db, tenant_medio):
    user = db.query(models.User).get(tenant_medio["admin"])
    assert client.post("/api/internal/auth/login", data={"username": user.email, "password": PASSWORD}).status_code == 200
    db.expire_all()
    assert db.query(models.User).get(tenant_medio["admin"]).last_seen_at is not None

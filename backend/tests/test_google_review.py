"""Invitación a la reseña de Google: aparte del aviso de fase final, 1 o 2 días
después de entregar a las 18:00 del crematorio (services/google_review.py)."""
import uuid
from datetime import datetime, timedelta

import pytest

from app import models
from app.services import google_review as gr
from app.utils import tz


@pytest.fixture
def setup(client, auth, db, world):
    """Plan con la característica, enlace de Google y una orden entregada."""
    h = auth("a")
    tenant = db.query(models.Tenant).get(world["tenant_a"])
    plan = tenant.effective_plan
    old_features = dict(plan.features or {})
    plan.features = {**old_features, gr.FEATURE_KEY: True}
    old_sm = tenant.social_media
    tenant.social_media = {"google_review": "https://g.page/r/test-review"}
    tenant.family_notices = {"on_finish": True}
    db.commit()

    tag = uuid.uuid4().hex[:6]
    c = client.post("/api/internal/customers", headers=h,
                    json={"name": f"Familia {tag}", "email": f"f-{tag}@vinzer-pruebas.cl", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Luna {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    oid = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente"}).json()["id"]
    yield {"h": h, "oid": oid, "tenant": tenant}
    db.expire_all()
    plan = db.query(models.SubscriptionPlan).get(plan.id)
    plan.features = old_features
    t = db.query(models.Tenant).get(world["tenant_a"])
    t.social_media = old_sm
    t.family_notices = {"on_finish": True}
    db.commit()


def _deliver(client, h, db, oid, when=None):
    steps = db.query(models.WorkflowStep).filter(models.WorkflowStep.is_active == True).all()  # noqa: E712
    for _ in range(len(steps) + 1):
        client.patch(f"/api/internal/operations/ops/orders/{oid}/advance", headers=h)
    r = client.patch(f"/api/internal/operations/ops/orders/{oid}/finalize", headers=h)
    assert r.status_code == 200, r.text
    if when:
        db.expire_all()
        sch = db.query(models.CremationScheduling).filter(models.CremationScheduling.cremation_id == oid).one()
        sch.completed_at = when
        db.commit()


def test_sin_caracteristica_no_esta_disponible(client, auth):
    """El SuperAdmin decide: sin marcar en el plan = no incluida."""
    h = auth("b")
    cfg = client.get("/api/internal/operations/review-config", headers=h).json()
    assert cfg["available"] is False
    r = client.put("/api/internal/operations/review-config", headers=h, json={"enabled": True, "delay_days": 1})
    assert r.status_code == 403


def test_programa_y_envia_a_las_18(client, db, setup, sent_emails):
    h, oid = setup["h"], setup["oid"]
    r = client.put("/api/internal/operations/review-config", headers=h, json={"enabled": True, "delay_days": 2})
    assert r.status_code == 200 and r.json()["delay_days"] == 2 and r.json()["has_link"] is True

    delivered = tz.get_now() + timedelta(minutes=1)  # después de activar la opción
    _deliver(client, h, db, oid, delivered)
    # El aviso de fase final no lleva la reseña
    assert sent_emails and "g.page" not in sent_emails[-1].body

    info = client.get(f"/api/internal/operations/ops/orders/{oid}/family-notices", headers=h).json()["review"]
    assert info["sent_at"] is None and info["scheduled_for"]
    due = datetime.fromisoformat(info["scheduled_for"])
    assert due.hour == 18 and (due.date() - delivered.date()).days == 2

    db.expire_all()
    assert oid not in gr.due_orders(db, now=due - timedelta(minutes=1))
    assert oid in gr.due_orders(db, now=due + timedelta(minutes=1))

    import asyncio
    n = len(sent_emails)
    assert asyncio.run(gr.send_review_email(db, oid))["sent"] is True
    assert len(sent_emails) == n + 1 and "https://g.page/r/test-review" in sent_emails[-1].body
    assert asyncio.run(gr.send_review_email(db, oid))["reason"] == "already_sent"  # una sola vez

    info = client.get(f"/api/internal/operations/ops/orders/{oid}/family-notices", headers=h).json()["review"]
    assert info["sent_at"]


def test_no_envia_si_se_cancela_y_enviar_ahora(client, db, setup, sent_emails):
    h, oid = setup["h"], setup["oid"]
    client.put("/api/internal/operations/review-config", headers=h, json={"enabled": True, "delay_days": 1})
    _deliver(client, h, db, oid, tz.get_now() - timedelta(days=2))
    db.query(models.Cremation).filter(models.Cremation.id == oid).update({"status": "cancelado"})
    db.commit()
    db.expire_all()
    assert oid not in gr.due_orders(db)

    # «Enviar ahora» desde la orden la adelanta igual
    r = client.post(f"/api/internal/operations/ops/orders/{oid}/family-notices/review", headers=h)
    assert r.status_code == 200, r.text
    assert "Dejar mi opinión en Google" in sent_emails[-1].body


def test_ordenes_entregadas_antes_de_activar_no_se_invitan(client, db, setup):
    h, oid = setup["h"], setup["oid"]
    _deliver(client, h, db, oid, tz.get_now() - timedelta(days=3))
    client.put("/api/internal/operations/review-config", headers=h, json={"enabled": True, "delay_days": 1})
    db.expire_all()
    assert oid not in gr.due_orders(db)
    info = client.get(f"/api/internal/operations/ops/orders/{oid}/family-notices", headers=h).json()["review"]
    assert info["reason"] == "before_enabled"

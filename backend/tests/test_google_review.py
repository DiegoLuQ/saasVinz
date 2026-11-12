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


def test_lista_enviadas_y_errores_con_reintentos(client, db, setup, sent_emails, monkeypatch):
    """Configuración → Reseñas en Google: lista programadas / enviadas ✓ / con error.
    Un rechazo del servidor de correo queda registrado y se reintenta hasta MAX_ATTEMPTS."""
    import asyncio
    from fastapi_mail import FastMail

    h, oid = setup["h"], setup["oid"]
    client.put("/api/internal/operations/review-config", headers=h, json={"enabled": True, "delay_days": 1})
    _deliver(client, h, db, oid, tz.get_now() + timedelta(minutes=1))

    lst = client.get("/api/internal/operations/review-emails", headers=h).json()
    row = next(i for i in lst["items"] if i["cremation_id"] == oid)
    assert row["state"] == "scheduled" and row["email"] and row["pet_name"]

    async def boom(self, message, *a, **k):
        raise ConnectionError("550 mailbox unavailable")
    monkeypatch.setattr(FastMail, "send_message", boom)
    db.expire_all()
    r = asyncio.run(gr.send_review_email(db, oid))
    assert r["sent"] is False and r["reason"] == "smtp_error" and "550" in r["error"]

    row = next(i for i in client.get("/api/internal/operations/review-emails", headers=h).json()["items"]
               if i["cremation_id"] == oid)
    assert row["state"] == "retrying" and row["attempts"] == 1 and "550" in row["last_error"]
    # «Enviar ahora» con el servidor caído = 502 con el motivo
    rr = client.post(f"/api/internal/operations/ops/orders/{oid}/family-notices/review", headers=h)
    assert rr.status_code == 502 and "550" in rr.json()["detail"]
    asyncio.run(gr.send_review_email(db, oid))
    due = datetime.fromisoformat(row["scheduled_for"])
    db.expire_all()
    assert oid not in gr.due_orders(db, now=due + timedelta(minutes=1))  # agotó los 3 intentos
    failed = client.get("/api/internal/operations/review-emails?state=failed", headers=h).json()["items"]
    assert any(i["cremation_id"] == oid and i["state"] == "failed" for i in failed)

    # Vuelve el servidor: «Enviar ahora» lo envía y queda ✓
    monkeypatch.undo()
    from fastapi_mail import FastMail as FM

    async def ok(self, message, *a, **k):
        sent_emails.append(message)
    monkeypatch.setattr(FM, "send_message", ok)
    assert client.post(f"/api/internal/operations/ops/orders/{oid}/family-notices/review", headers=h).status_code == 200
    sent = client.get("/api/internal/operations/review-emails?state=sent", headers=h).json()
    row = next(i for i in sent["items"] if i["cremation_id"] == oid)
    assert row["state"] == "sent" and row["sent_at"] and row["last_error"] is None
    notices = client.get(f"/api/internal/operations/ops/orders/{oid}/family-notices", headers=h).json()["notices"]
    assert {n["status"] for n in notices if n["kind"] == "review"} == {"sent", "failed"}

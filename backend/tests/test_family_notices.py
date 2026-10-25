"""Avisos a la familia (correo al entrar a una fase, al concluir, WhatsApp) y encuesta."""
import uuid

import pytest

from app import models


@pytest.fixture
def order(client, auth, db, world):
    """Orden del crematorio A con cliente con correo y celular, sin iniciar."""
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    c = client.post("/api/internal/customers", headers=h,
                    json={"name": f"Familia {tag}", "email": f"familia-{tag}@vinzer-pruebas.cl", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Toby {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    o = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente"})
    assert o.status_code == 200, o.text
    tenant = db.query(models.Tenant).get(world["tenant_a"])
    tenant.family_notices = {"on_finish": True}
    db.commit()
    return o.json()["id"]


def _advance(client, h, oid):
    r = client.patch(f"/api/internal/operations/ops/orders/{oid}/advance", headers=h)
    assert r.status_code == 200, r.text


def test_correo_al_entrar_a_la_fase_y_al_concluir(client, auth, db, world, order, sent_emails):
    h = auth("a")
    steps = db.query(models.WorkflowStep).filter(models.WorkflowStep.tenant_id == world["tenant_a"]) \
        .order_by(models.WorkflowStep.order_index).all()
    assert steps[-1].notify_family and not any(s.notify_family for s in steps[:-1])

    for _ in steps:
        _advance(client, h, order)
    asuntos = [m.subject for m in sent_emails]
    assert len(asuntos) == 1 and steps[-1].name in asuntos[0]
    assert sent_emails[0].reply_to  # las respuestas van al crematorio

    # Retroceder y volver a entrar no repite el correo automático.
    client.patch(f"/api/internal/operations/ops/orders/{order}/revert", headers=h)
    _advance(client, h, order)
    assert len(sent_emails) == 1

    r = client.patch(f"/api/internal/operations/ops/orders/{order}/finalize", headers=h)
    assert r.status_code == 200, r.text
    assert len(sent_emails) == 2 and "Gracias" in sent_emails[1].subject
    assert "?encuesta=1" in sent_emails[1].body

    avisos = client.get(f"/api/internal/operations/ops/orders/{order}/family-notices", headers=h).json()["notices"]
    assert {(n["kind"], n["channel"]) for n in avisos} == {("step", "email"), ("finish", "email")}


def test_whatsapp_arma_el_enlace_y_queda_registrado(client, auth, order):
    h = auth("a")
    _advance(client, h, order)
    r = client.post(f"/api/internal/operations/ops/orders/{order}/family-notices/whatsapp", headers=h, json={})
    assert r.status_code == 200, r.text
    assert r.json()["url"].startswith("https://wa.me/56912345678?text=")
    avisos = client.get(f"/api/internal/operations/ops/orders/{order}/family-notices", headers=h).json()["notices"]
    assert any(n["channel"] == "whatsapp" for n in avisos)


def test_otro_crematorio_no_puede_avisar(client, auth, order):
    r = client.post(f"/api/internal/operations/ops/orders/{order}/family-notices/whatsapp", headers=auth("b"), json={})
    assert r.status_code == 404


def test_encuesta_una_vez_y_solo_entregada(client, auth, db, order):
    h = auth("a")
    cr = db.query(models.Cremation).get(order)
    db.refresh(cr)
    token = cr.details.tracking_token
    pet = cr.pet.name.replace(" ", "-")
    url = f"/api/public/tracking/crematorio-a/{pet}/{token}"

    # Antes de concluir no se puede responder.
    assert client.post(f"{url}/feedback", json={"rating": 5}).status_code == 400
    steps = db.query(models.WorkflowStep).filter(models.WorkflowStep.tenant_id == cr.tenant_id).count()
    for _ in range(steps):
        _advance(client, h, order)
    client.patch(f"/api/internal/operations/ops/orders/{order}/finalize", headers=h)

    info = client.get(url).json()
    assert info["feedback_enabled"] and info["feedback"] is None
    assert client.post(f"{url}/feedback", json={"rating": 6}).status_code == 422
    r = client.post(f"{url}/feedback", json={"rating": 5, "comment": "  Muy   buena atención "})
    assert r.status_code == 200, r.text
    assert client.post(f"{url}/feedback", json={"rating": 1}).status_code == 409
    assert client.post(f"/api/public/tracking/crematorio-a/otro-nombre/{token}/feedback", json={"rating": 1}).status_code == 404
    assert client.get(url).json()["feedback"] == {"rating": 5, "comment": "Muy buena atención"}

    resumen = client.get("/api/internal/operations/feedback/summary", headers=h).json()
    assert resumen["count"] >= 1 and resumen["distribution"]["5"] >= 1
    # El otro crematorio no ve esa respuesta.
    assert client.get("/api/internal/operations/feedback/summary", headers=auth("b")).json()["count"] == 0

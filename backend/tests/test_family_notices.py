"""Avisos a la familia (correo al entrar a una fase, al concluir, WhatsApp) y encuesta."""
import uuid

import pytest

from app import models
from app.api.internal.catalog.models import CatalogShareToken


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


def test_avanzar_no_envia_correo_y_el_aviso_manual_si(client, auth, db, world, order, sent_emails):
    """Avanzar de fase no avisa solo: el panel pregunta (modal) y el aviso es manual."""
    h = auth("a")
    steps = db.query(models.WorkflowStep).filter(models.WorkflowStep.tenant_id == world["tenant_a"]) \
        .order_by(models.WorkflowStep.order_index).all()
    cr = db.query(models.Cremation).get(order)
    cr.pet.image_url = "https://cdn.vinzer-pruebas.cl/toby.webp"
    db.commit()

    for _ in steps:
        _advance(client, h, order)
    assert sent_emails == []  # ni siquiera en la fase con notify_family

    info = client.get(f"/api/internal/operations/ops/orders/{order}/family-notices", headers=h).json()
    assert info["email"] and info["phone"] and info["pet_name"].startswith("Toby")
    assert info["owner_name"].startswith("Familia") and info["pet_photo"] == "https://cdn.vinzer-pruebas.cl/toby.webp"
    assert info["step_name"] == steps[-1].name

    r = client.post(f"/api/internal/operations/ops/orders/{order}/family-notices/email", headers=h, json={})
    assert r.status_code == 200, r.text
    assert len(sent_emails) == 1 and steps[-1].name in sent_emails[0].subject
    body = sent_emails[0].body
    assert "toby.webp" in body and "Etapa actual" in body and "hrs" in body
    assert "/track/" in body
    assert sent_emails[0].reply_to  # las respuestas van al crematorio

    r = client.patch(f"/api/internal/operations/ops/orders/{order}/finalize", headers=h)
    assert r.status_code == 200, r.text
    assert len(sent_emails) == 2 and "ya descansa en casa" in sent_emails[1].subject
    assert "Ver recuerdos y certificado" in sent_emails[1].body

    avisos = client.get(f"/api/internal/operations/ops/orders/{order}/family-notices", headers=h).json()["notices"]
    assert {(n["kind"], n["channel"]) for n in avisos} == {("step", "email"), ("finish", "email")}


def test_correo_de_fase_incluye_catalogo_solo_si_existe(client, auth, db, world, order, sent_emails):
    h = auth("a")
    db.query(CatalogShareToken).filter(CatalogShareToken.tenant_id == world["tenant_a"],
                                              CatalogShareToken.catalog_type == "products")         .update({"is_active": False})
    db.commit()
    _advance(client, h, order)
    client.post(f"/api/internal/operations/ops/orders/{order}/family-notices/email", headers=h, json={})
    assert "Ver catálogo completo de recuerdos" not in sent_emails[-1].body

    db.add(CatalogShareToken(tenant_id=world["tenant_a"], token=uuid.uuid4().hex[:20],
                                    catalog_type="products", is_active=True))
    db.commit()
    client.post(f"/api/internal/operations/ops/orders/{order}/family-notices/email", headers=h, json={})
    assert "Ver catálogo completo de recuerdos" in sent_emails[-1].body and "catalogo." in sent_emails[-1].body


def test_sin_correo_el_aviso_por_correo_falla(client, auth, db, order):
    h = auth("a")
    _advance(client, h, order)
    cr = db.query(models.Cremation).get(order)
    cr.pet.customer.email = None
    db.commit()
    info = client.get(f"/api/internal/operations/ops/orders/{order}/family-notices", headers=h).json()
    assert info["email"] is None and info["phone"]
    r = client.post(f"/api/internal/operations/ops/orders/{order}/family-notices/email", headers=h, json={})
    assert r.status_code == 422


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


def test_seguimiento_entrega_hasta_3_fotos(client, db, order):
    """El seguimiento devuelve las fotos de la mascota (principal primero, sin repetir, máx. 3)."""
    cr = db.query(models.Cremation).get(order)
    db.refresh(cr)
    pet = cr.pet
    pet.image_url = "https://cdn.example/f1.webp"
    pet.images = ["https://cdn.example/f1.webp", "https://cdn.example/f2.webp",
                  "https://cdn.example/f3.webp", "https://cdn.example/f4.webp"]
    db.commit()
    url = f"/api/public/tracking/crematorio-a/{pet.name.replace(' ', '-')}/{cr.details.tracking_token}"
    r = client.get(url)
    assert r.status_code == 200, r.text
    assert r.json()["pet_images"] == ["https://cdn.example/f1.webp", "https://cdn.example/f2.webp", "https://cdn.example/f3.webp"]
    # Zona horaria del crematorio: la página muestra las horas en ella, no en la del dispositivo
    assert r.json()["timezone"] == "America/Santiago"


def test_modal_propone_la_siguiente_etapa_y_acepta_mensaje(client, auth, db, world, order, sent_emails):
    """El panel pregunta ANTES de avanzar: muestra la etapa siguiente y un mensaje editable."""
    h = auth("a")
    steps = db.query(models.WorkflowStep).filter(models.WorkflowStep.tenant_id == world["tenant_a"],
                                                 models.WorkflowStep.is_active == True) \
        .order_by(models.WorkflowStep.order_index).all()  # noqa: E712
    info = client.get(f"/api/internal/operations/ops/orders/{order}/family-notices", headers=h).json()
    assert info["step_id"] is None and info["next_step_id"] == steps[0].id
    assert steps[0].name in info["next_message"]

    _advance(client, h, order)
    msg = "Hola Familia, Toby ya se encuentra resguardado en nuestras instalaciones."
    r = client.post(f"/api/internal/operations/ops/orders/{order}/family-notices/email", headers=h,
                    json={"step_id": steps[0].id, "message": msg})
    assert r.status_code == 200, r.text
    assert "resguardado en nuestras instalaciones" in sent_emails[-1].body
    w = client.post(f"/api/internal/operations/ops/orders/{order}/family-notices/whatsapp", headers=h,
                    json={"step_id": steps[0].id, "message": msg}).json()
    assert w["message"].startswith(msg) and "/track/" in w["message"]


def test_aperturas_del_seguimiento_guardan_el_estado(client, db, order):
    """KPIs: cada apertura guarda el estado de la orden (en proceso / entregada / cancelada)."""
    import hashlib
    from sqlalchemy import text
    cr = db.query(models.Cremation).get(order)
    db.refresh(cr)
    token = cr.details.tracking_token
    url = f"/api/public/tracking/crematorio-a/{cr.pet.name.replace(' ', '-')}/{token}"
    key = hashlib.sha256(token.encode()).hexdigest()

    def views(stage):
        return db.execute(text("SELECT count(*) FROM sys_public_link_views WHERE resource_key = :k AND stage = :s"),
                          {"k": key, "s": stage}).scalar()

    before = {s: views(s) for s in ("in_progress", "delivered", "cancelled")}
    assert client.get(url).status_code == 200
    for status, stage in (("entregado", "delivered"), ("cancelado", "cancelled")):
        cr.status = status
        db.commit()
        assert client.get(url).status_code == 200      # la familia puede seguir entrando
    assert all(views(s) == before[s] + 1 for s in before)


def test_finish_email_template_completo(client, auth, db, world, order, sent_emails):
    """Verifica que el correo de entrega contenga pre-encabezado, certificado, recuerdos y bloque de Google Reviews."""
    h = auth("a")
    tenant = db.query(models.Tenant).get(world["tenant_a"])
    tenant.city = "Calama"
    tenant.address = "Av. Balmaceda 3726"
    tenant.social_media = {"google_review": "https://g.page/r/test-review"}
    db.commit()

    steps = db.query(models.WorkflowStep).filter(models.WorkflowStep.tenant_id == world["tenant_a"]) \
        .order_by(models.WorkflowStep.order_index).all()
    for _ in steps:
        _advance(client, h, order)

    r = client.patch(f"/api/internal/operations/ops/orders/{order}/finalize", headers=h)
    assert r.status_code == 200, r.text
    assert len(sent_emails) == 1
    mail = sent_emails[0]
    assert "ya descansa en casa" in mail.subject
    assert "Servicio conmemorativo completado con amor y respeto." in mail.body
    assert "entrega del ánfora y los recuerdos" in mail.body
    assert "Certificado Oficial de Cremación" in mail.body
    assert "🐾 Ver recuerdos y certificado de" in mail.body
    assert "¿Te brindamos tranquilidad en este proceso?" in mail.body
    assert "Calama" in mail.body
    assert "💬 Compartir mi opinión en Google" in mail.body
    assert "https://g.page/r/test-review" in mail.body
    assert "Av. Balmaceda 3726" in mail.body


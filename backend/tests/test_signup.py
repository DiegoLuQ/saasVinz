"""Registro autoservicio FREE: validaciones, confirmación por correo y crematorio creado."""
import uuid

from app import models

BASE = {"business_name": "Crematorio Registro", "admin_name": "Ana Pérez", "phone": "+56912345678",
        "password": "Segura123", "accept_terms": True, "recaptcha_token": "x"}


def _payload(**over):
    tag = uuid.uuid4().hex[:6]
    return {**BASE, "slug": f"registro-{tag}", "email": f"ana-{tag}@vinzer-pruebas.cl", **over}


def test_validaciones_del_formulario(client):
    casos = {
        "sin términos": _payload(accept_terms=False),
        "clave corta": _payload(password="123"),
        "celular chileno con 8 dígitos": _payload(phone="+5691234567"),
        "celular con letras": _payload(phone="+5691234abcd"),
        "código fuera de Sudamérica": _payload(phone="+34612345678"),
        "correo sin @": _payload(email="anacrematorio.cl"),
        "nombre con html": _payload(admin_name="<b>Ana</b>"),
        "dirección reservada": _payload(slug="admin"),
    }
    for nombre, body in casos.items():
        r = client.post("/api/public/signup", json=body)
        assert r.status_code == 422, f"{nombre}: {r.status_code} {r.text}"


def test_registro_confirmacion_y_crematorio_free(client, db, world, sent_emails):
    body = _payload()
    r = client.post("/api/public/signup", json=body)
    assert r.status_code == 200, r.text
    # Nada se crea hasta confirmar; sale un solo correo con el enlace.
    assert db.query(models.Tenant).filter(models.Tenant.slug == body["slug"]).first() is None
    assert len(sent_emails) == 1
    html = sent_emails[0].body
    token = html.split("/confirmar-cuenta?t=")[1].split('"')[0]

    r = client.post("/api/public/signup/confirm", json={"token": token})
    assert r.status_code == 200, r.text
    assert "saasc_token" in r.cookies
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == body["slug"]).first()
    assert tenant.signup_source == "self" and tenant.subscription_plan_id == world["free_plan_id"]
    assert tenant.terms_accepted_at is not None
    steps = db.query(models.WorkflowStep).filter(models.WorkflowStep.tenant_id == tenant.id).order_by(models.WorkflowStep.order_index).all()
    assert len(steps) == 5 and steps[-1].notify_family
    # Regalo de bienvenida: 1 crédito IA en el bolsillo extra, registrado en el historial.
    bal = db.query(models.AiCreditBalance).filter(models.AiCreditBalance.tenant_id == tenant.id).one()
    assert bal.extra_remaining == 1
    assert db.query(models.AiCreditLedger).filter(models.AiCreditLedger.tenant_id == tenant.id,
                                                  models.AiCreditLedger.reason == "gift").count() == 1

    # El mismo enlace otra vez: la cuenta ya existe.
    assert client.post("/api/public/signup/confirm", json={"token": token}).status_code == 409
    # Enlace inventado.
    assert client.post("/api/public/signup/confirm", json={"token": "abc"}).status_code == 400


def test_correo_ya_registrado_no_se_revela(client, sent_emails):
    r = client.post("/api/public/signup", json=_payload(email="admin-crematorio-a@vinzer-pruebas.cl"))
    assert r.status_code == 200
    # Mismo mensaje, y al correo le llega «ya tienes una cuenta» (no un enlace de registro).
    assert len(sent_emails) == 1 and "Ya tienes una cuenta" in sent_emails[0].subject


def test_sugerencia_y_disponibilidad_de_direccion(client):
    r = client.get("/api/public/signup/slug", params={"name": "Crematorio A"}).json()
    assert r["available"] and r["slug"] != "crematorio-a"  # ya existe en los datos de prueba
    assert client.get("/api/public/signup/slug", params={"slug": "crematorio-a"}).json()["available"] is False

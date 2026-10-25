"""Correos de los formularios públicos (demostración y memorial gratuito) y su anti-spam."""
import asyncio

import app.api.public.leads.router as leads_router
from app.core.config import settings
from app.services.email import ContactFormData, send_contact_email

LEAD = {"recaptcha_token": "x", "nombre": "Ana <script>alert(1)</script>", "empresa": "Crematorio <b>Sol</b>",
        "telefono": "912345678"}


def test_lead_de_demo_con_plantilla_y_texto_escapado(client, sent_emails):
    r = client.post("/api/public/leads/demo", json=LEAD)
    assert r.status_code == 200, r.text
    assert len(sent_emails) == 1
    html = sent_emails[0].body
    assert "<script>" not in html and "&lt;script&gt;" in html  # lo que escribe la persona no se interpreta
    assert "https://wa.me/56912345678" in html                     # botón «Responder por WhatsApp»
    assert "Nueva solicitud de demostración" in html


def test_recaptcha_obligatorio_en_produccion(client, monkeypatch, sent_emails):
    """Antes la excepción de desarrollo miraba ENV (no existe en producción): el
    anti-spam quedaba apagado. Ahora se usa ENVIRONMENT (settings.IS_PRODUCTION)."""
    async def falla(_token):
        return False

    monkeypatch.setattr(leads_router, "verify_recaptcha", falla)
    monkeypatch.setattr(type(settings), "IS_PRODUCTION", property(lambda self: True))
    assert client.post("/api/public/leads/demo", json=LEAD).status_code == 403
    assert sent_emails == []


def test_memorial_avisa_a_vinzer_y_confirma_a_la_familia(sent_emails):
    data = ContactFormData(nombre_cliente="Ana Pérez", email="ana@vinzer-pruebas.cl", telefono="912345678",
                           nombre_mascota="Luna", especie="Felino", raza="", fecha_nacimiento="2015-01-01",
                           fecha_fallecimiento="2026-10-01T00:00:00Z", mensaje="Siempre en nuestro corazón")
    asyncio.run(send_contact_email(data, "https://img.vinzer-pruebas.cl/luna.webp"))
    aviso, confirmacion = sent_emails
    assert "Memorial gratuito: Luna" in aviso.subject
    assert [r.email for r in aviso.reply_to] == ["ana@vinzer-pruebas.cl"]  # responder le llega a la familia
    assert "luna.webp" in aviso.body                    # la foto se ve en el correo (antes «ver adjunto» sin adjunto)
    assert [r.email for r in confirmacion.recipients] == ["ana@vinzer-pruebas.cl"]
    assert "Recibimos tu solicitud" in confirmacion.subject

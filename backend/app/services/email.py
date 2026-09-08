"""
Servicio de envío de correos electrónicos asíncrono.
Usa fastapi-mail para enviar notificaciones de formularios de contacto.
"""
import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

mail_config = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", ""),
    MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

fm = FastMail(mail_config)


class ContactFormData(BaseModel):
    nombre_cliente: str
    email: str
    telefono: str
    nombre_mascota: str
    especie: str
    raza: str
    fecha_nacimiento: str
    fecha_fallecimiento: str
    mensaje: str
    foto_base64: Optional[str] = None


async def send_contact_email(data: ContactFormData):
    """
    Envía un email de notificación con los datos del formulario de contacto.
    Destinatario: la dirección configurada en MAIL_FROM (admin).
    """
    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 8px 0; font-weight: 700;">🕊️ Nueva Solicitud de Memorial Gratuito</h1>
            <p style="color: #bfdbfe; font-size: 13px; margin: 0;">Plan Recuerdo — Formulario de Contacto</p>
        </div>

        <div style="padding: 28px 24px;">
            <!-- Pet Info -->
            <div style="background: #ffffff; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                <h2 style="font-size: 14px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0; border-bottom: 2px solid #dbeafe; padding-bottom: 8px;">
                    🐾 Datos de la Mascota
                </h2>
                <table style="width: 100%; font-size: 14px; color: #334155;">
                    <tr><td style="padding: 6px 0; font-weight: 600; width: 140px;">Nombre:</td><td>{data.nombre_mascota}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: 600;">Especie:</td><td>{data.especie}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: 600;">Raza:</td><td>{data.raza}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: 600;">Nacimiento:</td><td>{data.fecha_nacimiento}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: 600;">Fallecimiento:</td><td>{data.fecha_fallecimiento}</td></tr>
                </table>
            </div>

            <!-- Client Info -->
            <div style="background: #ffffff; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                <h2 style="font-size: 14px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0; border-bottom: 2px solid #dbeafe; padding-bottom: 8px;">
                    👤 Datos del Cliente
                </h2>
                <table style="width: 100%; font-size: 14px; color: #334155;">
                    <tr><td style="padding: 6px 0; font-weight: 600; width: 140px;">Nombre:</td><td>{data.nombre_cliente}</td></tr>
                    <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td><a href="mailto:{data.email}" style="color: #3b82f6;">{data.email}</a></td></tr>
                    <tr><td style="padding: 6px 0; font-weight: 600;">Teléfono:</td><td>{data.telefono}</td></tr>
                </table>
            </div>

            <!-- Message -->
            <div style="background: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
                <h2 style="font-size: 14px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0; border-bottom: 2px solid #dbeafe; padding-bottom: 8px;">
                    💬 Mensaje
                </h2>
                <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0; white-space: pre-wrap;">{data.mensaje}</p>
            </div>

            {"<p style='margin-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;'>📸 El cliente adjuntó una fotografía (ver adjunto).</p>" if data.foto_base64 else ""}
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                Enviado desde el formulario de contacto de Vinzer · Plan Recuerdo
            </p>
        </div>
    </div>
    """

    message = MessageSchema(
        subject=f"🕊️ Solicitud Memorial Gratuito — {data.nombre_mascota} ({data.nombre_cliente})",
        recipients=[os.getenv("MAIL_FROM", "")],
        body=html_body,
        subtype=MessageType.html,
    )

    try:
        await fm.send_message(message)
        print(f"✅ Email enviado para solicitud de {data.nombre_cliente}")
    except Exception as e:
        print(f"❌ Error enviando email: {e}")


class DemoLeadData(BaseModel):
    """Lead comercial del formulario de demo de la landing (3 campos)."""
    nombre: str
    empresa: str
    telefono: str
    origen: Optional[str] = None


async def send_demo_lead_email(data: DemoLeadData):
    """
    Notifica un nuevo lead del formulario "Solicitar Demostración Guiada".
    Destinatario: la dirección configurada en MAIL_FROM (admin).
    """
    whatsapp_digits = "".join(ch for ch in (data.telefono or "") if ch.isdigit())
    whatsapp_link = f"https://wa.me/{whatsapp_digits}" if whatsapp_digits else ""

    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0b0a24, #19B5FE); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 8px 0; font-weight: 700;">Nueva solicitud de demostracion</h1>
            <p style="color: #bfe8ff; font-size: 13px; margin: 0;">Landing Vinzer &middot; Formulario express</p>
        </div>

        <div style="padding: 28px 24px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 14px 0; font-size: 14px; color: #0f172a;">
                    <strong style="display:block; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Nombre</strong>
                    {data.nombre}
                </p>
                <p style="margin: 0 0 14px 0; font-size: 14px; color: #0f172a;">
                    <strong style="display:block; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Crematorio / Empresa</strong>
                    {data.empresa}
                </p>
                <p style="margin: 0; font-size: 14px; color: #0f172a;">
                    <strong style="display:block; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#64748b;">Telefono / WhatsApp</strong>
                    {data.telefono}
                </p>
            </div>

            {f'<div style="text-align:center; margin-top:20px;"><a href="{whatsapp_link}" style="display:inline-block; background:#25D366; color:#052e16; text-decoration:none; padding:12px 24px; border-radius:10px; font-weight:700; font-size:13px;">Responder por WhatsApp</a></div>' if whatsapp_link else ''}

            <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 24px;">
                Origen: {data.origen or 'landing'}
            </p>
        </div>
    </div>
    """

    message = MessageSchema(
        subject=f"Demo Vinzer — {data.empresa} ({data.nombre})",
        recipients=[os.getenv("MAIL_FROM", "")],
        body=html_body,
        subtype=MessageType.html,
    )

    try:
        await fm.send_message(message)
        print(f"[OK] Email enviado para lead de demo: {data.empresa}")
    except Exception as e:
        print(f"[ERROR] Error enviando email de lead: {e}")

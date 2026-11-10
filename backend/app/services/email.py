"""
Servicio de envío de correos electrónicos asíncrono.
Usa fastapi-mail para enviar notificaciones de formularios de contacto.
"""
import os
from urllib.parse import quote
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# SMTP (Hostinger: smtp.hostinger.com, 587 = STARTTLS o 465 = SSL). El puerto 465
# usa SSL directo; cualquier otro, STARTTLS. MAIL_FROM_NAME = nombre del remitente.
_MAIL_PORT = int(os.getenv("MAIL_PORT", "587") or 587)
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Vinzer") or "Vinzer"


def _mail_config(from_name: str) -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
        MAIL_FROM=os.getenv("MAIL_FROM", "") or os.getenv("MAIL_USERNAME", ""),
        MAIL_FROM_NAME=from_name,
        MAIL_PORT=_MAIL_PORT,
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        MAIL_STARTTLS=_MAIL_PORT != 465,
        MAIL_SSL_TLS=_MAIL_PORT == 465,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


mail_config = _mail_config(MAIL_FROM_NAME)
fm = FastMail(mail_config)


def notification_recipients() -> list[str]:
    """Destino de los mensajes de los formularios públicos: el «Correo para recibir
    mensajes» de Configuración → Datos del SaaS (sys_saas_config.notification_email,
    uno o varios separados por coma) o, si está vacío, MAIL_FROM."""
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        try:
            cfg = db.query(models.SaaSConfig).first()
            raw = (cfg.notification_email or '') if cfg else ''
        finally:
            db.close()
        emails = [e.strip() for e in raw.split(',') if e.strip()]
        if emails:
            return emails
    except Exception as e:  # sin base disponible se usa el correo del sistema
        print(f"⚠️ No se pudo leer el correo de notificaciones: {e}")
    return [os.getenv("MAIL_FROM", "")]


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


async def send_contact_email(data: ContactFormData, photo_url: str | None = None) -> None:
    """Solicitud de memorial gratuito (Plan Recuerdo): aviso a Vinzer y confirmación a la familia.
    Al aviso se responde directo a la familia (Reply-To = su correo)."""
    rows = [
        ("Mascota", data.nombre_mascota), ("Especie", data.especie), ("Raza", data.raza),
        ("Nacimiento", data.fecha_nacimiento[:10]), ("Partida", data.fecha_fallecimiento[:10]),
        ("Familia", data.nombre_cliente), ("Correo", data.email), ("Teléfono", data.telefono),
        ("Mensaje", data.mensaje),
    ]
    digits = "".join(ch for ch in (data.telefono or "") if ch.isdigit())
    if len(digits) == 9 and digits.startswith("9"):
        digits = "56" + digits
    try:
        await send_action_email(
            notification_recipients(), f"Memorial gratuito: {data.nombre_mascota} ({data.nombre_cliente})",
            "Nueva solicitud de memorial",
            [f"{data.nombre_cliente} pidió un memorial gratuito para {data.nombre_mascota}. Queda pendiente de revisión en el admin (Memoriales)."],
            "Responder por WhatsApp" if len(digits) >= 10 else None,
            f"https://wa.me/{digits}" if len(digits) >= 10 else None,
            "Si respondes este correo, la respuesta le llega directo a la familia.",
            kicker="Plan Recuerdo", reply_to=data.email or None, rows=rows, image_url=photo_url,
        )
    except Exception as e:  # noqa: BLE001
        print(f"❌ Error enviando el aviso de memorial: {e}")
    if data.email:
        try:
            await send_action_email(
                data.email, f"Recibimos tu solicitud para {data.nombre_mascota}", f"Recibimos tu solicitud",
                [f"Hola {data.nombre_cliente.split(' ')[0]}:",
                 f"Gracias por confiarnos el recuerdo de {data.nombre_mascota}. Nuestro equipo revisará la información y te avisaremos cuando su memorial esté listo.",
                 "Si quieres agregar algo o tienes una duda, responde este correo."],
                kicker="Memorial", image_url=photo_url,
            )
        except Exception as e:  # noqa: BLE001
            print(f"❌ Error enviando la confirmación a la familia: {e}")


class DemoLeadData(BaseModel):
    """Lead comercial del formulario de demo de la landing (3 campos)."""
    nombre: str
    empresa: str
    telefono: str
    origen: Optional[str] = None


async def send_demo_lead_email(data: DemoLeadData) -> None:
    """Lead del formulario «Demostración guiada» de la landing (nombre, empresa, teléfono)."""
    digits = "".join(ch for ch in (data.telefono or "") if ch.isdigit())
    if len(digits) == 9 and digits.startswith("9"):
        digits = "56" + digits
    wa = f"https://wa.me/{digits}?text=" + quote(f"Hola {data.nombre.split(' ')[0]}, te escribo de Vinzer por la demostración que pediste para {data.empresa}.") if len(digits) >= 10 else None
    try:
        await send_action_email(
            notification_recipients(), f"Demo Vinzer: {data.empresa} ({data.nombre})", "Nueva solicitud de demostración",
            [f"{data.nombre} de {data.empresa} pidió una demostración guiada de Vinzer."],
            "Responder por WhatsApp" if wa else None, wa,
            "Escríbele pronto: los leads se enfrían rápido.",
            kicker="Nuevo lead", rows=[("Nombre", data.nombre), ("Crematorio / empresa", data.empresa),
                                       ("Teléfono / WhatsApp", data.telefono), ("Origen", data.origen or "landing")],
        )
    except Exception as e:  # noqa: BLE001
        print(f"[ERROR] Error enviando email de lead: {e}")


async def send_vet_password_reset_email(to_email: str, vet_name: str, reset_url: str) -> None:
    """Enlace para restablecer la contraseña del portal veterinario (vence en 30 min)."""
    await send_password_reset_email(
        to_email, vet_name, reset_url,
        portal="Portal Veterinario", subject="Restablece tu contraseña del Portal Veterinario",
    )


async def send_password_reset_email(to_email: str, user_name: str, reset_url: str, *, portal: str, subject: str) -> None:
    """Enlace para restablecer la contraseña (vence en 30 min, uso único)."""
    greeting = f"Hola {user_name}:" if user_name else "Hola:"
    await send_action_email(
        to_email, subject, "Restablecer contraseña",
        [greeting,
         f"Recibimos una solicitud para restablecer la contraseña de tu cuenta ({portal}). "
         "Usa el botón; el enlace vence en 30 minutos y sirve una sola vez."],
        "Crear nueva contraseña", reset_url,
        "Si no solicitaste este cambio, ignora este correo: tu contraseña actual sigue funcionando.",
        kicker=portal,
    )


# ---------------------------------------------------------------------------
# Plantilla de marca de Vinzer para los correos transaccionales
# ---------------------------------------------------------------------------
# Encabezado con el logo y el nombre; eslogan y canales de contacto en el pie.
# Todo sale de Configuración Global → Datos del SaaS (sys_saas_config). HTML con
# tablas y estilos en línea: es lo que respetan Gmail, Outlook y Apple Mail.

def _brand() -> dict:
    """Nombre, logo, eslogan y canales de contacto de Vinzer (con valores por defecto)."""
    from app.core.config import settings
    data = {"name": "Vinzer", "logo": None, "eslogan": None, "whatsapp": None, "correo": None, "redes": [],
            "web": settings.FRONTEND_URL.rstrip("/")}
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        try:
            cfg = db.query(models.SaaSConfig).first()
        finally:
            db.close()
        if cfg:
            data.update(name=cfg.name or "Vinzer", logo=cfg.logo, eslogan=cfg.eslogan,
                        whatsapp=cfg.whatsapp, correo=cfg.correo,
                        redes=[r for r in (cfg.redes_sociales or []) if isinstance(r, dict) and r.get("link")])
    except Exception as e:  # sin base: el correo sale igual, con lo mínimo
        print(f"⚠️ No se pudieron leer los datos de Vinzer para el correo: {e}")
    return data


def _social_url(name: str, link: str) -> str:
    link = (link or "").strip()
    if link.startswith(("http://", "https://")):
        return link
    handle = link.lstrip("@")
    bases = {"instagram": "https://instagram.com/", "facebook": "https://facebook.com/",
             "tiktok": "https://tiktok.com/@", "linkedin": "https://linkedin.com/in/", "youtube": "https://youtube.com/@"}
    base = bases.get((name or "").strip().lower())
    if base and "/" not in handle and "." not in handle:
        return base + handle
    return "https://" + handle


def render_vinzer_email(
    title: str,
    paragraphs: list[str],
    button_label: str | None = None,
    button_url: str | None = None,
    footer: str | None = None,
    kicker: str | None = None,
    brand: dict | None = None,
    rows: list[tuple[str, str]] | None = None,
    image_url: str | None = None,
    products: dict | None = None,
    highlight: dict | None = None,
    preheader: str | None = None,
    review_card: dict | None = None,
) -> str:
    """HTML del correo. Los textos son planos (se escapan).

    Por defecto con la marca de Vinzer; con `brand` (mismas claves que _brand()
    + "powered_by": True) sale con la marca de un crematorio, p. ej. los avisos
    a las familias (services/family_notices.py)."""
    import html as _html
    from datetime import date
    esc = _html.escape
    b = {**_brand(), **brand} if brand else _brand()
    name = esc(b["name"])

    logo_src = b["logo"] if (b["logo"] or "").startswith(("http://", "https://")) else None
    logo = (f'<img src="{esc(logo_src, quote=True)}" alt="{name}" height="40" '
            f'style="height: 40px; width: auto; vertical-align: middle; border: 0; margin-right: 10px;">'
            if logo_src else "")
    photo = (f'<p style="margin: 0 0 18px 0; text-align: center;"><img src="{esc(image_url, quote=True)}" alt="" width="220" '
             f'style="max-width: 220px; width: 100%; height: auto; border-radius: 14px; border: 0;"></p>' if image_url else "")
    paras = "".join(f'<p style="margin: 0 0 14px 0;">{esc(p)}</p>' for p in paragraphs if p)
    if highlight:
        # Dato clave del correo (p. ej. la etapa del servicio) visible al abrirlo, antes de la foto
        meta = (f'<p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;">{esc(highlight["meta"])}</p>'
                if highlight.get("meta") else "")
        body = (
            '<div style="margin: 0 0 20px 0; padding: 16px 18px; border-radius: 14px; background: #f0fdfa; '
            'border: 1px solid #99f6e4; text-align: center;">'
            f'<p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #0f766e;">{esc(highlight.get("label") or "")}</p>'
            f'<p style="margin: 0; font-size: 21px; line-height: 1.3; font-weight: 800; color: #0A192F;">{esc(highlight.get("value") or "")}</p>'
            f'{meta}</div>' + photo + paras
        )
    else:
        body = paras + photo
    if rows:
        cells = "".join(
            f'<tr><td style="padding: 8px 12px 8px 0; color: #64748b; font-size: 13px; vertical-align: top; white-space: nowrap;">{esc(k)}</td>'
            f'<td style="padding: 8px 0; color: #0f172a; font-size: 14px; white-space: pre-wrap;">{esc(v or "—")}</td></tr>'
            for k, v in rows)
        body += (f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%" '
                 f'style="margin: 4px 0 16px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">{cells}</table>')
    button = ""
    if button_label and button_url:
        url = esc(button_url, quote=True)
        button = (
            '<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px auto;"><tr>'
            '<td style="border-radius: 12px; background: #14b8a6;">'
            f'<a href="{url}" style="display: inline-block; padding: 13px 30px; font-weight: 700; '
            f'font-size: 15px; color: #06201c; text-decoration: none;">{esc(button_label)}</a>'
            '</td></tr></table>'
            '<p style="margin: 0 0 14px 0; font-size: 12px; color: #64748b; word-break: break-all;">'
            '¿No funciona el botón? Copia este enlace en tu navegador:<br>'
            f'<a href="{url}" style="color: #0e7490;">{esc(button_url)}</a></p>'
        )
    # Bloque de productos (p. ej. «Recuerdos para honrar a X»): {title, subtitle, items:
    # [{name, price, image_url}], button_label, url}. Grilla de 3 columnas (2 en móvil no
    # es posible en todos los clientes: celdas de 33 %).
    shop = ""
    if products and products.get("url"):
        purl = esc(products["url"], quote=True)
        cells = []
        for it in (products.get("items") or [])[:6]:
            price = f'<div style="font-size: 12px; color: #0e7490; font-weight: 700;">{esc(it.get("price") or "")}</div>' if it.get("price") else ""
            cells.append(
                f'<td width="33%" style="padding: 6px; vertical-align: top; text-align: center;">'
                f'<a href="{purl}" style="text-decoration: none; color: #0f172a;">'
                f'<img src="{esc(it["image_url"], quote=True)}" alt="{esc(it.get("name") or "")}" width="150" '
                f'style="width: 100%; max-width: 150px; height: auto; border-radius: 12px; border: 1px solid #e2e8f0; display: block; margin: 0 auto 6px auto;">'
                f'<div style="font-size: 12px; line-height: 1.35; font-weight: 600;">{esc(it.get("name") or "")}</div>{price}</a></td>'
            )
        while len(cells) % 3:
            cells.append('<td width="33%" style="padding: 6px;"></td>')
        rows_html = "".join(f"<tr>{''.join(cells[i:i + 3])}</tr>" for i in range(0, len(cells), 3))
        grid = f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%">{rows_html}</table>' if cells else ""
        sub = f'<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">{esc(products.get("subtitle") or "")}</p>' if products.get("subtitle") else ""
        # Botón suave (borde) o sólido
        btn_td = ('border-radius: 12px; border: 2px solid #0ea5e9; background: #ffffff;' if products.get("soft")
                  else 'border-radius: 12px; background: #0ea5e9;')
        btn_color = "#0369a1" if products.get("soft") else "#ffffff"
        shop = (
            '<div style="margin: 26px 0 6px 0; padding: 20px 14px; border-radius: 16px; background: #f0f9ff; border: 1px solid #bae6fd; text-align: center;">'
            f'<p style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: #0A192F;">{esc(products.get("title") or "")}</p>'
            f'{sub}'
            f'{grid}'
            '<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 14px auto 0 auto;"><tr>'
            f'<td style="{btn_td}">'
            f'<a href="{purl}" style="display: inline-block; padding: 11px 24px; font-weight: 700; font-size: 14px; color: {btn_color}; text-decoration: none;">'
            f'{esc(products.get("button_label") or "Ver catálogo")}</a></td></tr></table></div>'
        )

    # Bloque de reseña (Google Reviews / Opinión)
    review_html = ""
    if review_card and review_card.get("url"):
        r_url = esc(review_card["url"], quote=True)
        r_title = esc(review_card.get("title") or "¿Te brindamos tranquilidad en este proceso?")
        r_text = esc(review_card.get("text") or "")
        r_btn = esc(review_card.get("button_label") or "Compartir mi opinión en Google")
        stars = review_card.get("stars", "⭐ ⭐ ⭐ ⭐ ⭐")
        review_html = (
            '<div style="margin: 26px 0 16px 0; padding: 22px 20px; border-radius: 16px; '
            'background: #fffbeb; border: 1px solid #fde68a; text-align: center;">'
            f'<div style="font-size: 18px; margin-bottom: 8px; letter-spacing: 2px;">{stars}</div>'
            f'<p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 800; color: #78350f;">{r_title}</p>'
            f'<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.55; color: #92400e;">{r_text}</p>'
            '<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;"><tr>'
            '<td style="border-radius: 12px; background: #d97706;">'
            f'<a href="{r_url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 26px; font-weight: 700; '
            f'font-size: 14px; color: #ffffff; text-decoration: none;">{r_btn}</a>'
            '</td></tr></table>'
            '</div>'
        )

    note = (f'<p style="margin: 18px 0 0 0; padding-top: 16px; border-top: 1px solid #e2e8f0; '
            f'font-size: 13px; color: #64748b; white-space: pre-line;">{esc(footer)}</p>' if footer else "")
    kicker_html = (f'<p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 2px; '
                   f'text-transform: uppercase; color: #0e7490;">{esc(kicker)}</p>' if kicker else "")

    preheader_html = (
        f'<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">'
        f'{esc(preheader)}'
        f'</div>'
        if preheader else ""
    )

    # Canales de contacto del pie
    link_style = "color: #5eead4; text-decoration: none;"
    links = []
    if b.get("address"):
        links.append(f'<span style="color: #cbd5e1;">{esc(b["address"])}</span>')
    if b["whatsapp"]:
        digits = "".join(ch for ch in b["whatsapp"] if ch.isdigit())
        links.append(f'<a href="https://wa.me/{digits}" style="{link_style}">WhatsApp {esc(b["whatsapp"])}</a>')
    if b["correo"]:
        links.append(f'<a href="mailto:{esc(b["correo"], quote=True)}" style="{link_style}">{esc(b["correo"])}</a>')
    if b["web"]:
        host = b["web"].split("://", 1)[-1]
        links.append(f'<a href="{esc(b["web"], quote=True)}" style="{link_style}">{esc(host)}</a>')
    redes = " &nbsp;·&nbsp; ".join(
        f'<a href="{esc(_social_url(r.get("name"), r["link"]), quote=True)}" style="color: #94a3b8; text-decoration: none;">'
        f'{esc(r.get("name") or r["link"])}</a>'
        for r in b["redes"]
    )
    eslogan = (f'<p style="margin: 0 0 12px 0; font-size: 14px; font-style: italic; color: #e2e8f0;">'
               f'«{esc(b["eslogan"])}»</p>' if b["eslogan"] else "")
    redes_html = f'<p style="margin: 0 0 8px 0;">{redes}</p>' if redes else ""
    links_html = " &nbsp;·&nbsp; ".join(links)
    if brand:  # correo de un crematorio a sus familias
        legal = f"Este es un correo automático de {name}, por favor no respondas a este mensaje."
        if b.get("powered_by"):
            legal += '<br>Con tecnología de <a href="https://vinzer.cl" style="color: #94a3b8;">Vinzer</a>'
    else:
        legal = (f"© {date.today().year} {name} · Software para crematorios de mascotas.<br>"
                 "Este es un correo automático: si necesitas ayuda, escríbenos por WhatsApp o al correo de arriba.")

    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; background: #eef2f6;">
{preheader_html}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eef2f6; padding: 24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0;">
  <tr><td style="background: #0A192F; padding: 22px 28px;">
    {logo}<span style="font-size: 22px; font-weight: 800; color: #ffffff; vertical-align: middle;">{name}</span>
  </td></tr>
  <tr><td style="height: 4px; background-color: #14b8a6; line-height: 4px; font-size: 0;">&nbsp;</td></tr>
  <tr><td style="padding: 30px 28px 26px 28px; color: #0f172a; font-size: 15px; line-height: 1.65;">
    {kicker_html}
    <h1 style="margin: 0 0 18px 0; font-size: 22px; line-height: 1.3; color: #0A192F;">{esc(title)}</h1>
    {body}{button}{review_html}{shop}{note}
  </td></tr>
  <tr><td style="background: #0A192F; padding: 24px 28px; text-align: center; font-size: 13px; line-height: 1.7; color: #94a3b8;">
    {eslogan}
    <p style="margin: 0 0 8px 0;">{links_html}</p>
    {redes_html}
    <p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b;">{legal}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>"""


async def send_action_email(
    to: list[str] | str,
    subject: str,
    title: str,
    paragraphs: list[str],
    button_label: str | None = None,
    button_url: str | None = None,
    footer: str | None = None,
    kicker: str | None = None,
    brand: dict | None = None,
    reply_to: str | None = None,
    rows: list[tuple[str, str]] | None = None,
    image_url: str | None = None,
    attachments: list | None = None,
    products: dict | None = None,
    highlight: dict | None = None,
    preheader: str | None = None,
    review_card: dict | None = None,
) -> None:
    """Correo transaccional: título, párrafos (texto plano) y un botón opcional.
    Con `brand` sale con la marca de un crematorio («Crematorio X vía Vinzer»);
    `reply_to` = a quién llegan las respuestas. La cuenta que envía es no-reply,
    así que sin `reply_to` las respuestas van al correo de Vinzer (Datos del SaaS)."""
    html_body = render_vinzer_email(title, paragraphs, button_label, button_url, footer, kicker, brand, rows, image_url, products,
                                    highlight, preheader, review_card)
    if not reply_to:
        reply_to = _brand().get("correo") or None
    await fm.send_message(MessageSchema(
        subject=subject,
        recipients=[to] if isinstance(to, str) else to,
        body=html_body,
        subtype=MessageType.html,
        reply_to=[reply_to] if reply_to else [],
        # Remitente: «Vinzer» o, con marca de crematorio, «Crematorio X vía Vinzer» (misma cuenta).
        from_name=f"{brand['name']} vía {MAIL_FROM_NAME}"[:70] if brand and brand.get("name") else None,
        attachments=attachments or [],  # UploadFile o rutas (fastapi-mail)
    ))

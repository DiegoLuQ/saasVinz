"""
IA para plantillas de imagen (redes sociales): armado de prompts con los datos
de la mascota, límite de caracteres y registro de uso (los créditos están en
app/services/ai_credits.py).

Los prompts base viven en la DB (sys_image_templates.ai_text_prompt /
ai_image_prompt) y los edita el SuperAdmin. Las constantes DEFAULT_* solo se
usan cuando una plantilla aún no tiene prompt propio.
"""
import re
from datetime import date, datetime
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.core.config import settings
from app.utils import tz

MAX_TEXT_CHARS = 500
MAX_PROMPT_CHARS = 3000

DEFAULT_TEXT_PROMPT = (
    "Escribe una dedicatoria breve y cálida para una publicación de Instagram de un "
    "crematorio de mascotas, en memoria de {nombre}, un/a {especie} {raza} de {edad}. "
    "Partió el {fecha_partida}. Detalles de su familia: {detalles}. "
    "Tono sereno, agradecido y respetuoso del duelo, sin dramatismo."
)

DEFAULT_IMAGE_PROMPT = (
    "Transforma esta foto de {nombre} ({especie} {raza}) en una ilustración artística "
    "estilo acuarela suave, con luz cálida y un fondo de nubes celestiales. Conserva "
    "fielmente los rasgos, colores y marcas de la mascota. Sin texto ni marcas de agua."
)

# Variables disponibles en los prompts (espejo en el frontend: lib/admin/imageTemplates/constants.ts).
PLACEHOLDERS = {
    "nombre": "Nombre de la mascota",
    "especie": "Especie",
    "raza": "Raza",
    "edad": "Edad (ej. 5 años)",
    "tamano": "Tamaño / tramo de peso",
    "fecha_nacimiento": "Fecha de nacimiento",
    "fecha_partida": "Fecha de partida",
    "crematorio": "Nombre del crematorio",
    "detalles": "Detalles que escribe el tenant al generar",
    "max_caracteres": "Límite de caracteres del texto",
}

_MONTHS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]
_PLACEHOLDER_RE = re.compile(r"\{(\w+)\}")


def _fmt_date(value) -> str:
    if not value:
        return ""
    if isinstance(value, datetime):
        value = value.date()
    if not isinstance(value, date):
        return ""
    return f"{value.day} de {_MONTHS[value.month - 1]} de {value.year}"


def _age_text(pet) -> str:
    years = pet.age
    if years is None and pet.birth_date:
        end = pet.death_date or tz.get_now()
        years = end.year - pet.birth_date.year - (
            (end.month, end.day) < (pet.birth_date.month, pet.birth_date.day)
        )
    if years is None or years < 0:
        return ""
    if years == 0:
        return "menos de un año"
    return f"{years} año" if years == 1 else f"{years} años"


def build_context(pet: Optional[models.Pet], tenant: Optional[models.Tenant], details: str = "",
                  max_chars: int = MAX_TEXT_CHARS) -> dict:
    """Variables para los prompts. Solo datos de la mascota: nunca datos de contacto del tutor."""
    ctx = {k: "" for k in PLACEHOLDERS}
    if pet is not None:
        ctx.update({
            "nombre": pet.name or "",
            "especie": pet.species or "",
            "raza": pet.breed or "",
            "edad": _age_text(pet),
            "tamano": pet.size or "",
            "fecha_nacimiento": _fmt_date(pet.birth_date),
            "fecha_partida": _fmt_date(pet.death_date),
        })
    ctx["crematorio"] = (tenant.name if tenant else "") or ""
    ctx["detalles"] = (details or "").strip()[:500] or "sin detalles adicionales"
    ctx["max_caracteres"] = str(max_chars)
    return ctx


def render_prompt(template: str, ctx: dict) -> str:
    """Reemplaza {variable}. Las desconocidas se dejan tal cual para que el admin las note."""
    return _PLACEHOLDER_RE.sub(lambda m: ctx.get(m.group(1), m.group(0)), template or "").strip()


def text_prompt_of(tpl: models.ImageTemplate) -> str:
    return (tpl.ai_text_prompt or "").strip() or DEFAULT_TEXT_PROMPT


def image_prompt_of(tpl: models.ImageTemplate) -> str:
    return (tpl.ai_image_prompt or "").strip() or DEFAULT_IMAGE_PROMPT


def max_chars_of(tpl: models.ImageTemplate) -> int:
    return max(20, min(tpl.ai_text_max_chars or MAX_TEXT_CHARS, MAX_TEXT_CHARS))


def text_system_instruction(max_chars: int) -> str:
    return (
        "Eres redactor/a de un crematorio de mascotas en Chile. Escribes en español neutro, "
        "con respeto por el duelo de la familia. Responde SOLO con el texto final, sin "
        "comillas, títulos, emojis ni hashtags (salvo que el pedido los solicite). "
        f"El texto debe tener como máximo {max_chars} caracteres contando espacios."
    )


def clamp_text(text: str, max_chars: int) -> str:
    """Normaliza y garantiza el límite cortando en el fin de frase más cercano."""
    clean = re.sub(r"\s+", " ", text or "").strip().strip('"“”«»').strip()
    if len(clean) <= max_chars:
        return clean
    cut = clean[:max_chars]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "), cut.rfind("."))
    if end >= max_chars * 0.5:
        return cut[: end + 1].strip()
    space = cut[: max_chars - 1].rfind(" ")
    return (cut[:space] if space > 0 else cut[: max_chars - 1]).rstrip(",;:") + "…"


def log_generation(db: Session, *, tenant_id: int, user_id: Optional[int], template_id: Optional[int],
                   pet_id: Optional[int], kind: str, model: str, prompt: str,
                   success: bool, error: Optional[str] = None,
                   cost_usd: Optional[float] = None, duration_ms: Optional[int] = None,
                   session_id: Optional[int] = None, output_text: Optional[str] = None,
                   pending_image: Optional[str] = None) -> models.AiGeneration:
    row = models.AiGeneration(
        tenant_id=tenant_id, user_id=user_id, template_id=template_id, pet_id=pet_id,
        kind=kind, model=model, prompt=prompt, success=success, error=(error or None),
        cost_usd=cost_usd if success else None, duration_ms=duration_ms, session_id=session_id,
        output_text=output_text, pending_image=pending_image,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# Generación (compartida por el endpoint del tenant y la prueba del SuperAdmin)
# ---------------------------------------------------------------------------

_MIME_BY_EXT = {"jpg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}
_GEMINI_RATIOS = {"1:1", "4:5", "3:4", "4:3", "9:16", "16:9"}


async def generate_limited_text(db: Session, prompt: str, max_chars: int):
    """Genera con la plataforma de texto (con respaldo si la principal falla) y
    garantiza el límite: un reintento pidiendo acortar y luego corte seguro.
    Devuelve (texto, plataforma que respondió)."""
    from app.services import ai_providers
    from app.services.ai_errors import AiError

    system = text_system_instruction(max_chars)

    async def call(rp):
        text = clamp_text(await ai_providers.generate_text(rp, prompt, system=system), 10_000)
        if len(text) > max_chars:
            try:
                text = clamp_text(await ai_providers.generate_text(
                    rp, f"Acorta este texto a como máximo {max_chars} caracteres, conservando el sentido:\n\n{text}",
                    system=system, temperature=0.3,
                ), 10_000)
            except AiError:
                pass  # se corta de forma segura abajo
        return clamp_text(text, max_chars)

    return await ai_providers.with_fallback(db, "text", call)


def mime_of(content: bytes) -> str:
    from app.utils.upload_validation import detect_image_type

    ext = detect_image_type(content)
    if ext is None or ext == "gif":
        raise HTTPException(status_code=400, detail="La foto debe ser JPG, PNG o WEBP.")
    return _MIME_BY_EXT[ext]


async def load_stored_photo(url: str) -> bytes:
    """Lee una foto ya guardada por la plataforma (R2 o storage local).

    Solo se aceptan URLs propias para no convertir el endpoint en un proxy
    abierto (SSRF). Cualquier otra foto debe subirse como archivo.
    """
    import os
    import httpx
    from app.utils.r2 import normalize_image_url
    from app.utils.upload_validation import MAX_IMAGE_BYTES

    full = normalize_image_url(url or "")
    r2_base = (settings.R2_PUBLIC_URL or "").rstrip("/")
    if r2_base and full.startswith(r2_base + "/"):
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(full)
        if resp.status_code != 200 or len(resp.content) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="No se pudo leer la foto guardada. Súbela nuevamente.")
        return resp.content

    if full.startswith("/storage/"):
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "storage"))
        path = os.path.abspath(os.path.join(root, full[len("/storage/"):]))
        if path.startswith(root + os.sep) and os.path.isfile(path):
            with open(path, "rb") as f:
                return f.read()

    raise HTTPException(status_code=400, detail="Sube la foto de la mascota para generar la ilustración.")


def to_webp_data_url(content: bytes, max_dim: int = 2160, quality: int = 85) -> str:
    """Procesa en memoria (orientación EXIF, máx. `max_dim` px, WebP con alfa) y
    devuelve un data URL. No toca disco ni la nube."""
    import base64
    import io
    from PIL import Image, ImageOps

    img = ImageOps.exif_transpose(Image.open(io.BytesIO(content)))
    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    img = img.convert("RGBA" if has_alpha else "RGB")
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


async def illustrate(db: Session, *, prompt: str, photo: bytes, aspect_ratio: Optional[str]):
    """Genera la ilustración con la plataforma de imagen (con respaldo si la
    principal falla).

    Devuelve (data URL WebP optimizado, costo USD, plataforma que respondió).
    Aún NO se guarda en la nube: el tenant confirma en un modal y recién ahí se
    guarda en tenant_{id}/ia/ (save_to_tenant_ia).
    """
    from app.services import ai_providers

    ratio = aspect_ratio if aspect_ratio in _GEMINI_RATIOS else None
    mime = mime_of(photo)
    (out_bytes, _out_mime, cost), rp = await ai_providers.with_fallback(
        db, "image", lambda rp: ai_providers.generate_image(rp, prompt, photo, mime, ratio))
    return to_webp_data_url(out_bytes), cost, rp


def save_to_tenant_ia(db: Session, *, tenant_id: int, content: bytes, description: str) -> str:
    """Guarda una imagen del tenant en tenant_{id}/ia/ como WebP optimizado (modo
    'template' de MediaService) y la registra en la Biblioteca de Medios. Devuelve la URL."""
    import os
    import uuid
    from app.api.internal.common.media_service import MediaService
    from app.utils.upload_validation import detect_image_type

    ext = detect_image_type(content)
    if ext is None:
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida.")
    os.makedirs("temp_uploads", exist_ok=True)
    temp_path = os.path.join("temp_uploads", f"ia_{uuid.uuid4().hex}.{ext}")
    with open(temp_path, "wb") as f:
        f.write(content)
    try:
        item = MediaService.upload_media(
            db=db, local_path=temp_path, media_type="image", category="ia", ratio="original",
            description=description[:250], alt_text=description[:250],
            processing_mode="template", tenant_id=tenant_id,
        )
        return item.url
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ---------------------------------------------------------------------------
# Datos para los elementos de la plantilla (mascota, dueño, crematorio)
# ---------------------------------------------------------------------------

def _handle(value: Optional[str], prefix: str = "@") -> str:
    """'https://instagram.com/crematorio/' o 'crematorio' → '@crematorio'."""
    v = (value or "").strip()
    if not v:
        return ""
    if "/" in v:
        v = [p for p in v.split("?")[0].rstrip("/").split("/") if p][-1]
    v = v.lstrip("@")
    return f"{prefix}{v}" if v else ""


def _website(value: Optional[str]) -> str:
    v = (value or "").strip()
    for p in ("https://", "http://"):
        if v.lower().startswith(p):
            v = v[len(p):]
    return v.rstrip("/")


def _life_range(pet) -> str:
    by = pet.birth_date.year if pet and pet.birth_date else None
    dy = pet.death_date.year if pet and pet.death_date else None
    if not by and not dy:
        return ""
    return f"{by or '…'} — {dy or '…'}"


def template_bindings(pet: Optional[models.Pet], owner: Optional[models.Customer],
                      tenant: Optional[models.Tenant]) -> dict:
    """Valores de todos los elementos de datos de una plantilla (mismas claves
    que TextBinding en el frontend, más `tenant_logo` como URL de imagen)."""
    social = (tenant.social_media if tenant and isinstance(tenant.social_media, dict) else {}) or {}
    whatsapp = "".join(c for c in str(social.get("whatsapp") or "") if c.isdigit() or c == "+")
    return {
        # Mascota
        "pet_name": (pet.name if pet else "") or "",
        "species": (pet.species if pet else "") or "",
        "breed": (pet.breed if pet else "") or "",
        "age": _age_text(pet) if pet else "",
        "size": (pet.size if pet else "") or "",
        "birth_date": _fmt_date(pet.birth_date) if pet else "",
        "death_date": _fmt_date(pet.death_date) if pet else "",
        "life_range": _life_range(pet),
        # Dueño
        "owner_name": (owner.name if owner else "") or "",
        "owner_phone": (owner.phone if owner else "") or "",
        "owner_email": (owner.email if owner else "") or "",
        # Crematorio
        "tenant_name": (tenant.name if tenant else "") or "",
        "tenant_rut": (tenant.rut if tenant else "") or "",
        "tenant_phone": (tenant.phone if tenant else "") or "",
        "tenant_email": (tenant.email if tenant else "") or "",
        "tenant_address": (tenant.address if tenant else "") or "",
        "tenant_city": ", ".join(x for x in [(tenant.city if tenant else ""), (tenant.region if tenant else "")] if x),
        "tenant_legal_rep": (tenant.legal_rep_name if tenant else "") or "",
        # Redes sociales
        "tenant_instagram": _handle(social.get("instagram")),
        "tenant_facebook": _handle(social.get("facebook"), prefix=""),
        "tenant_tiktok": _handle(social.get("tiktok")),
        "tenant_youtube": _handle(social.get("youtube")),
        "tenant_website": _website(social.get("website")),
        "tenant_whatsapp": whatsapp,
        # Imagen
        "tenant_logo": (tenant.logo_url if tenant else "") or "",
    }

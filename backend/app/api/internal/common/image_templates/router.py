"""
Plantillas de imagen para redes (Instagram) — lado del tenant.

El tenant usa las plantillas del SuperAdmin: elige mascota, sube fotos,
encuadra y exporta. La IA (texto e ilustración desde la foto real) se paga
con créditos (app/services/ai_credits.py): 1 crédito = 1 diseño con N
intentos; cada clic de generar = 1 intento ("texto + ilustración" incluido).
Los prompts base vienen de la plantilla; el tenant puede retocarlos.
"""
import asyncio
import time
from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.internal.admin.image_templates.schemas import ImageTemplateInDB, AiTextResult, AiImageResult, SavedImageResult
from app.auth import get_current_user
from app.core.rate_limiter import limiter
from app.database import get_db
from app.services import ai_credits, ai_providers, gemini, image_template_ai as ai
from app.utils import tz
from app.utils.upload_validation import read_and_validate_image
from app.api.deps_features import check_feature

router = APIRouter()

# "Diseños para Redes (IA)": característica del plan (sin flag = permitido). Bloquea
# generar con IA y guardar ilustración/diseño; las lecturas y la subida de la tarjeta
# digital quedan abiertas (las usan "Generar todo" y la ficha de la orden).
REDES_FEATURE = check_feature("certificados:redes", default=True)

class AiPromptsRequest(BaseModel):
    pet_id: Optional[int] = None
    details: str = Field("", max_length=500)


class AiPromptsResponse(BaseModel):
    text_prompt: str
    image_prompt: str
    max_chars: int


class AiTextRequest(AiPromptsRequest):
    # Prompt ya resuelto y retocado por el tenant. Vacío = el de la plantilla.
    prompt: Optional[str] = Field(None, max_length=ai.MAX_PROMPT_CHARS)
    session_id: Optional[int] = None
    # Reintento sin costo del texto que falló en el mismo diseño (no cuenta intento).
    free_retry: bool = False


class AiSessionRequest(BaseModel):
    pet_id: Optional[int] = None


class AiGenerationResult(BaseModel):
    """Resultado de una generación (texto, ilustración o ambos): cada parte puede
    fallar por separado. `session` = estado del crédito (intentos restantes)."""
    text: Optional[AiTextResult] = None
    text_error: Optional[str] = None
    image: Optional[AiImageResult] = None
    image_error: Optional[str] = None
    session: dict


def _visible(tenant_id: int):
    """Globales (tenant_id NULL) + las exclusivas de este tenant."""
    return or_(models.ImageTemplate.tenant_id.is_(None), models.ImageTemplate.tenant_id == tenant_id)


def _active_template(db: Session, template_id: int, tenant_id: int) -> models.ImageTemplate:
    tpl = db.query(models.ImageTemplate).filter(
        models.ImageTemplate.id == template_id,
        models.ImageTemplate.is_active.is_(True),
        _visible(tenant_id),
    ).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return tpl


def _pet(db: Session, tenant_id: int, pet_id: Optional[int]) -> Optional[models.Pet]:
    if pet_id is None:
        return None
    pet = db.query(models.Pet).filter(models.Pet.id == pet_id, models.Pet.tenant_id == tenant_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    return pet


def _tenant(db: Session, tenant_id: int) -> Optional[models.Tenant]:
    return db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()


def _ensure_configured(db: Session, kind: str) -> ai_providers.ResolvedProvider:
    rp = ai_providers.resolve(db, kind)
    if rp is None:
        raise HTTPException(status_code=503, detail="La generación con IA no está disponible por ahora.")
    return rp


class ImageTemplatePage(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ImageTemplateInDB]


@router.get("", response_model=ImageTemplatePage)
def list_active_image_templates(
    page: int = 1,
    page_size: int = 8,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    """Plantillas visibles para el crematorio, paginadas (las más recientes primero)."""
    page = max(1, page)
    page_size = min(max(1, page_size), 60)
    query = db.query(models.ImageTemplate).filter(models.ImageTemplate.is_active.is_(True), _visible(tenant_id))
    total = query.count()
    rows = (query.order_by(models.ImageTemplate.created_at.desc(), models.ImageTemplate.id.desc())
            .offset((page - 1) * page_size).limit(page_size).all())
    return {"total": total, "page": page, "page_size": page_size, "items": rows}


@router.get("/ai/usage")
def ai_usage(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    """Plataformas disponibles y saldo de créditos IA del crematorio."""
    return {
        "configured": ai_providers.resolve(db, "text") is not None,
        "image_configured": ai_providers.resolve(db, "image") is not None,
        "credits": ai_credits.summary(db, _tenant(db, tenant_id)),
        # Duración promedio reciente (segundos) para mostrar cuánto suele tardar.
        "avg_seconds": _avg_seconds(db, tenant_id),
    }


def _avg_seconds(db: Session, tenant_id: int) -> dict:
    since = tz.get_now() - timedelta(days=30)
    rows = dict(
        db.query(models.AiGeneration.kind, func.avg(models.AiGeneration.duration_ms))
        .filter(models.AiGeneration.tenant_id == tenant_id, models.AiGeneration.success.is_(True),
                models.AiGeneration.duration_ms.isnot(None), models.AiGeneration.created_at >= since)
        .group_by(models.AiGeneration.kind).all()
    )
    return {k: (round(float(rows[k]) / 1000) if rows.get(k) else None) for k in ("text", "image")}


@router.get("/render-data")
def render_data(
    pet_id: Optional[int] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    """Valores de los elementos de datos (mascota, dueño y crematorio) para el lienzo."""
    pet = _pet(db, tenant_id, pet_id)
    owner = None
    if pet is not None and pet.customer_id:
        owner = db.query(models.Customer).filter(
            models.Customer.id == pet.customer_id, models.Customer.tenant_id == tenant_id,
        ).first()
    return ai.template_bindings(pet, owner, _tenant(db, tenant_id))


@router.post("/{template_id}/use")
def register_image_template_use(
    template_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    """Cuenta una exportación. Con usage_count > 0 la plantilla queda bloqueada para edición."""
    tpl = _active_template(db, template_id, tenant_id)
    tpl.usage_count = (tpl.usage_count or 0) + 1
    db.commit()
    return {"usage_count": tpl.usage_count}


@router.post("/{template_id}/ai/prompts", response_model=AiPromptsResponse)
def resolve_ai_prompts(
    template_id: int,
    payload: AiPromptsRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    """Prompts de la plantilla con los datos de la mascota, para que el tenant los revise."""
    tpl = _active_template(db, template_id, tenant_id)
    max_chars = ai.max_chars_of(tpl)
    ctx = ai.build_context(_pet(db, tenant_id, payload.pet_id), _tenant(db, tenant_id), payload.details, max_chars)
    return AiPromptsResponse(
        text_prompt=ai.render_prompt(ai.text_prompt_of(tpl), ctx),
        image_prompt=ai.render_prompt(ai.image_prompt_of(tpl), ctx),
        max_chars=max_chars,
    )


@router.get("/{template_id}/ai/session")
def current_ai_session(
    template_id: int,
    pet_id: Optional[int] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    """Diseño (crédito) aún vigente para esta plantilla y mascota, para retomarlo
    sin gastar otro crédito (ej. al recargar la página). null si no hay."""
    _active_template(db, template_id, tenant_id)
    pet_filter = (models.AiDesignSession.pet_id == pet_id) if pet_id is not None else models.AiDesignSession.pet_id.is_(None)
    rows = (db.query(models.AiDesignSession)
            .filter(models.AiDesignSession.tenant_id == tenant_id,
                    models.AiDesignSession.template_id == template_id, pet_filter)
            .order_by(models.AiDesignSession.created_at.desc()).limit(5).all())
    for row in rows:
        info = ai_credits.session_info(row)
        if info["active"]:
            return info
    return None


@router.post("/{template_id}/ai/session", dependencies=[Depends(REDES_FEATURE)])
def open_ai_session(
    template_id: int,
    payload: AiSessionRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """Usa 1 crédito y abre un diseño con N intentos (el usuario ya confirmó)."""
    tpl = _active_template(db, template_id, tenant_id)
    _pet(db, tenant_id, payload.pet_id)
    if ai_providers.resolve(db, "text") is None and ai_providers.resolve(db, "image") is None:
        raise HTTPException(status_code=503, detail="La generación con IA no está disponible por ahora.")
    session = ai_credits.open_session(db, _tenant(db, tenant_id), template_id=tpl.id,
                                      pet_id=payload.pet_id, user_id=current_user.id)
    return ai_credits.session_info(session)


async def _photo_from(file: Optional[UploadFile], photo_url: Optional[str]) -> bytes:
    if file is not None:
        photo, _ext = await read_and_validate_image(file)
        return photo
    if photo_url:
        return await ai.load_stored_photo(photo_url)
    raise HTTPException(status_code=400, detail="Sube la foto de la mascota para generar la ilustración.")


def _ms(started: float) -> int:
    return int((time.monotonic() - started) * 1000)


async def _gen_text(db: Session, rp, *, tpl, tenant, pet, details: str, prompt_override: Optional[str],
                    session_id: int, user_id: int) -> AiTextResult:
    """Genera y registra el texto (con su duración). Si falla, registra el error y relanza AiError."""
    max_chars = ai.max_chars_of(tpl)
    ctx = ai.build_context(pet, tenant, details, max_chars)
    prompt = ai.render_prompt((prompt_override or "").strip() or ai.text_prompt_of(tpl), ctx)
    log = dict(tenant_id=tenant.id, user_id=user_id, template_id=tpl.id, pet_id=pet.id if pet else None,
               kind="text", prompt=prompt, session_id=session_id)
    started = time.monotonic()
    try:
        text, used = await ai.generate_limited_text(db, prompt, max_chars)
    except gemini.GeminiError as e:
        ai.log_generation(db, **log, model=rp.model[:80], success=False, error=str(e), duration_ms=_ms(started))
        raise
    duration = _ms(started)
    # output_text: permite recuperar el texto si la respuesta no llega al navegador.
    # model/costo: los de la plataforma que respondió (puede ser un respaldo).
    ai.log_generation(db, **log, model=used.model[:80], success=True, cost_usd=used.cost_per_use,
                      duration_ms=duration, output_text=text)
    return AiTextResult(text=text, chars=len(text), max_chars=max_chars, duration_ms=duration)


async def _gen_image(db: Session, rp, *, tpl, tenant, pet, details: str, prompt_override: Optional[str],
                     aspect_ratio: Optional[str], photo: bytes, session_id: int, user_id: int) -> AiImageResult:
    """Genera y registra la ilustración (aún sin guardar: el tenant confirma en un modal).
    Queda en pending_image hasta que se guarde o descarte, para poder recuperarla."""
    ctx = ai.build_context(pet, tenant, details)
    prompt = ai.render_prompt((prompt_override or "").strip() or ai.image_prompt_of(tpl), ctx)
    log = dict(tenant_id=tenant.id, user_id=user_id, template_id=tpl.id, pet_id=pet.id if pet else None,
               kind="image", prompt=prompt, session_id=session_id)
    started = time.monotonic()
    try:
        url, cost, used = await ai.illustrate(db, prompt=prompt, photo=photo, aspect_ratio=aspect_ratio)
    except gemini.GeminiError as e:
        ai.log_generation(db, **log, model=rp.model[:80], success=False, error=str(e), duration_ms=_ms(started))
        raise
    duration = _ms(started)
    gen = ai.log_generation(db, **log, model=used.model[:80], success=True, cost_usd=cost,
                            duration_ms=duration, pending_image=url)
    return AiImageResult(url=url, generation_id=gen.id, duration_ms=duration)


def _session_payload(db: Session, session_id: int) -> dict:
    row = db.query(models.AiDesignSession).filter(models.AiDesignSession.id == session_id).first()
    return ai_credits.session_info(row) if row else {}


@router.post("/{template_id}/ai/text", response_model=AiGenerationResult, dependencies=[Depends(REDES_FEATURE)])
@limiter.limit("10/minute")
async def generate_ai_text(
    request: Request,
    template_id: int,
    payload: AiTextRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """1 intento: solo el texto (o reintento sin costo si el último texto del diseño falló)."""
    rp = _ensure_configured(db, "text")
    tpl = _active_template(db, template_id, tenant_id)
    pet = _pet(db, tenant_id, payload.pet_id)
    tenant = _tenant(db, tenant_id)
    free = False
    if payload.free_retry:
        if not payload.session_id or not ai_credits.can_retry_text_free(db, payload.session_id):
            raise HTTPException(status_code=400, detail="No hay un texto fallido reciente para reintentar sin costo.")
        free = True
    session = ai_credits.reserve_attempt(db, tenant_id, payload.session_id, template_id=tpl.id,
                                         pet_id=payload.pet_id, free=free)
    try:
        result = await _gen_text(db, rp, tpl=tpl, tenant=tenant, pet=pet, details=payload.details,
                                 prompt_override=payload.prompt, session_id=session.id, user_id=current_user.id)
    except gemini.GeminiError as e:
        if not free:
            ai_credits.release_attempt(db, session.id)
        raise HTTPException(status_code=502, detail=str(e))
    return AiGenerationResult(text=result, session=_session_payload(db, session.id))


@router.post("/{template_id}/ai/image", response_model=AiGenerationResult, dependencies=[Depends(REDES_FEATURE)])
@limiter.limit("5/minute")
async def generate_ai_image(
    request: Request,
    template_id: int,
    session_id: Optional[int] = Form(None),
    pet_id: Optional[int] = Form(None),
    details: str = Form("", max_length=500),
    prompt: Optional[str] = Form(None, max_length=ai.MAX_PROMPT_CHARS),
    aspect_ratio: Optional[str] = Form(None),
    photo_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """1 intento: ilustración desde la foto real (archivo subido o foto ya guardada)."""
    rp = _ensure_configured(db, "image")
    tpl = _active_template(db, template_id, tenant_id)
    pet = _pet(db, tenant_id, pet_id)
    photo = await _photo_from(file, photo_url)
    tenant = _tenant(db, tenant_id)
    session = ai_credits.reserve_attempt(db, tenant_id, session_id, template_id=tpl.id, pet_id=pet_id)
    try:
        result = await _gen_image(db, rp, tpl=tpl, tenant=tenant, pet=pet, details=details, prompt_override=prompt,
                                  aspect_ratio=aspect_ratio, photo=photo, session_id=session.id,
                                  user_id=current_user.id)
    except gemini.GeminiError as e:
        ai_credits.release_attempt(db, session.id)
        raise HTTPException(status_code=502, detail=str(e))
    return AiGenerationResult(image=result, session=_session_payload(db, session.id))


@router.post("/{template_id}/ai/both", response_model=AiGenerationResult, dependencies=[Depends(REDES_FEATURE)])
@limiter.limit("5/minute")
async def generate_ai_both(
    request: Request,
    template_id: int,
    session_id: Optional[int] = Form(None),
    pet_id: Optional[int] = Form(None),
    details: str = Form("", max_length=500),
    text_prompt: Optional[str] = Form(None, max_length=ai.MAX_PROMPT_CHARS),
    image_prompt: Optional[str] = Form(None, max_length=ai.MAX_PROMPT_CHARS),
    aspect_ratio: Optional[str] = Form(None),
    photo_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """1 intento: texto e ilustración en paralelo. Si fallan los dos, se devuelve el intento."""
    text_rp = _ensure_configured(db, "text")
    image_rp = _ensure_configured(db, "image")
    tpl = _active_template(db, template_id, tenant_id)
    pet = _pet(db, tenant_id, pet_id)
    photo = await _photo_from(file, photo_url)
    tenant = _tenant(db, tenant_id)
    session = ai_credits.reserve_attempt(db, tenant_id, session_id, template_id=tpl.id, pet_id=pet_id)

    common = dict(tpl=tpl, tenant=tenant, pet=pet, details=details, session_id=session.id, user_id=current_user.id)
    text_res, image_res = await asyncio.gather(
        _gen_text(db, text_rp, prompt_override=text_prompt, **common),
        _gen_image(db, image_rp, prompt_override=image_prompt, aspect_ratio=aspect_ratio, photo=photo, **common),
        return_exceptions=True,
    )
    out = AiGenerationResult(session={})
    if isinstance(text_res, AiTextResult):
        out.text = text_res
    else:
        out.text_error = str(text_res) if isinstance(text_res, gemini.GeminiError) else "No se pudo generar el texto."
    if isinstance(image_res, AiImageResult):
        out.image = image_res
    else:
        out.image_error = str(image_res) if isinstance(image_res, gemini.GeminiError) else "No se pudo generar la ilustración."
    if out.text is None and out.image is None:
        ai_credits.release_attempt(db, session.id)
    out.session = _session_payload(db, session.id)
    return out


@router.get("/{template_id}/ai/recover")
def recover_generation(
    template_id: int,
    pet_id: Optional[int] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    """Última ilustración y último texto del diseño vigente (plantilla + mascota) que
    no llegaron al navegador o aún no se guardaron/descartaron. No gasta intentos."""
    _active_template(db, template_id, tenant_id)
    # Limpieza: las ilustraciones pendientes de diseños ya vencidos no se recuperan.
    expired = select(models.AiDesignSession.id).where(
        models.AiDesignSession.tenant_id == tenant_id, models.AiDesignSession.expires_at <= tz.get_now())
    (db.query(models.AiGeneration)
       .filter(models.AiGeneration.tenant_id == tenant_id, models.AiGeneration.pending_image.isnot(None),
               models.AiGeneration.session_id.in_(expired))
       .update({models.AiGeneration.pending_image: None}, synchronize_session=False))
    db.commit()

    session = current_ai_session(template_id, pet_id, db, tenant_id)
    if not session:
        return {"session": None, "image": None, "text": None}
    gens = (db.query(models.AiGeneration)
            .filter(models.AiGeneration.session_id == session["id"], models.AiGeneration.success.is_(True))
            .order_by(models.AiGeneration.created_at.desc()).all())
    image = next((g for g in gens if g.kind == "image" and g.pending_image), None)
    text = next((g for g in gens if g.kind == "text" and g.output_text), None)
    return {
        "session": session,
        "image": {"generation_id": image.id, "url": image.pending_image, "created_at": image.created_at} if image else None,
        "text": {"generation_id": text.id, "text": text.output_text, "created_at": text.created_at} if text else None,
    }


@router.post("/{template_id}/ai/generations/{generation_id}/discard")
def discard_generation(
    template_id: int,
    generation_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    """El tenant descartó la ilustración: ya no se ofrece recuperarla."""
    gen = db.query(models.AiGeneration).filter(
        models.AiGeneration.id == generation_id, models.AiGeneration.tenant_id == tenant_id,
    ).first()
    if gen is None:
        raise HTTPException(status_code=404, detail="Generación no encontrada")
    gen.pending_image = None
    db.commit()
    return {"status": "discarded"}


@router.post("/{template_id}/save", response_model=SavedImageResult, dependencies=[Depends(REDES_FEATURE)])
@limiter.limit("20/minute")
async def save_template_image(
    request: Request,
    template_id: int,
    kind: str = Form(..., pattern="^illustration$"),
    pet_id: Optional[int] = Form(None),
    generation_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """Guarda en tenant_{id}/ia/ (WebP optimizado) una ilustración IA que el tenant
    confirmó. Es la única imagen que se guarda: el diseño final se guarda como receta
    (POST /{id}/designs) y se dibuja al verlo o descargarlo."""
    tpl = _active_template(db, template_id, tenant_id)
    pet = _pet(db, tenant_id, pet_id)
    content, _ext = await read_and_validate_image(file)

    gen = None
    if kind == "illustration":
        if generation_id is None:
            raise HTTPException(status_code=400, detail="Falta la generación de la ilustración.")
        gen = db.query(models.AiGeneration).filter(
            models.AiGeneration.id == generation_id,
            models.AiGeneration.tenant_id == tenant_id,
            models.AiGeneration.kind == "image",
            models.AiGeneration.success.is_(True),
        ).first()
        if gen is None:
            raise HTTPException(status_code=404, detail="Generación no encontrada")
        if gen.media_url:
            gen.pending_image = None
            db.commit()
            return SavedImageResult(url=gen.media_url)

    pet_name = pet.name if pet else "sin mascota"
    description = (f"Ilustración IA · {pet_name}" if kind == "illustration"
                   else f"Diseño final · {tpl.name} · {pet_name}")
    url = ai.save_to_tenant_ia(db, tenant_id=tenant_id, content=content, description=description)
    if gen is not None:
        gen.media_url = url
        gen.pending_image = None  # ya está guardada: no hace falta recuperarla
        db.commit()
    # Queda listado en «Mis diseños generados» (diseños e ilustraciones IA).
    db.add(models.TemplateExport(
        tenant_id=tenant_id, template_id=tpl.id, pet_id=pet.id if pet else None,
        title=(f"{tpl.name} · {pet_name}" if kind == "design" else description)[:250],
        media_url=url, created_by=current_user.id, kind=kind,
    ))
    db.commit()
    return SavedImageResult(url=url)


# ---------------------------------------------------------------------------
# Mis diseños: diseños finales exportados por el crematorio
# ---------------------------------------------------------------------------

@router.get("/exports")
def list_exports(
    q: Optional[str] = None,
    kind: Optional[str] = None,
    template_id: Optional[int] = None,
    pet_id: Optional[int] = None,
    unassigned: bool = False,
    page: int = 1,
    page_size: int = 24,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    page = max(1, page)
    page_size = min(max(1, page_size), 60)
    query = db.query(models.TemplateExport).filter(models.TemplateExport.tenant_id == tenant_id)
    # Uno o varios tipos separados por coma (ej. "design,digital").
    kinds = [k for k in (kind or "").split(",") if k in ("design", "illustration", "digital")]
    if kinds:
        query = query.filter(models.TemplateExport.kind.in_(kinds))
    if template_id is not None:
        query = query.filter(models.TemplateExport.template_id == template_id)
    if pet_id is not None:
        query = query.filter(models.TemplateExport.pet_id == pet_id)
    elif unassigned:
        # Lo creado sin mascota: se puede asignar desde la orden (lateral de Recepción y Pedidos).
        query = query.filter(models.TemplateExport.pet_id.is_(None))
    if q and q.strip():
        query = query.filter(models.TemplateExport.title.ilike(f"%{q.strip()[:80]}%"))
    total = query.count()
    rows = (query.order_by(models.TemplateExport.created_at.desc(), models.TemplateExport.id.desc())
            .offset((page - 1) * page_size).limit(page_size).all())
    return {
        "total": total, "page": page, "page_size": page_size,
        "items": [{
            "id": r.id, "title": r.title, "kind": r.kind, "template_id": r.template_id, "pet_id": r.pet_id,
            "url": r.media_url, "meta": r.meta, "created_at": r.created_at,
        } for r in rows],
    }


@router.post("/exports/upload")
@limiter.limit("20/minute")
async def upload_export(
    request: Request,
    kind: str = Form(..., pattern="^digital$"),
    title: str = Form(..., min_length=1, max_length=250),
    pet_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """Guarda en tenant_{id}/ia/ (WebP optimizado) una imagen que no viene de una
    plantilla de redes, p. ej. la tarjeta digital de homenaje de «Generar todo»,
    y la registra en «Mis diseños generados»."""
    _pet(db, tenant_id, pet_id)
    content, _ext = await read_and_validate_image(file)
    url = ai.save_to_tenant_ia(db, tenant_id=tenant_id, content=content, description=title)
    row = models.TemplateExport(tenant_id=tenant_id, template_id=None, pet_id=pet_id, title=title[:250],
                                media_url=url, created_by=current_user.id, kind=kind)
    db.add(row)
    db.commit()
    return {"id": row.id, "url": url}


class ExportPetIn(BaseModel):
    pet_id: Optional[int] = None


@router.patch("/exports/{export_id}")
def assign_export_pet(
    export_id: int,
    payload: ExportPetIn,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("mascotas", "edit")),
):
    """Asigna (o quita) la mascota de lo creado en Diseños para Redes: así aparece
    en las órdenes de esa mascota (lateral de Recepción y Pedidos, registros)."""
    row = db.query(models.TemplateExport).filter(
        models.TemplateExport.id == export_id, models.TemplateExport.tenant_id == tenant_id,
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")
    pet = _pet(db, tenant_id, payload.pet_id)
    row.pet_id = pet.id if pet else None
    # El título termina en «· <mascota>»: se actualiza con la nueva.
    base = row.title.rsplit(" · ", 1)[0] if " · " in (row.title or "") else (row.title or "Diseño")
    row.title = f"{base} · {pet.name if pet else 'sin mascota'}"[:250]
    db.commit()
    return {"id": row.id, "pet_id": row.pet_id, "title": row.title}


@router.delete("/exports/{export_id}")
def delete_export(
    export_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """Elimina el diseño: borra la imagen de la nube/biblioteca y el registro."""
    role = getattr(current_user.role, "value", current_user.role)
    if role not in ("admin", "creator"):
        raise HTTPException(status_code=403, detail="Solo el administrador del crematorio puede eliminar diseños.")
    row = db.query(models.TemplateExport).filter(
        models.TemplateExport.id == export_id, models.TemplateExport.tenant_id == tenant_id,
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")
    if row.media_url:
        from app.api.internal.common.media_service import MediaService
        MediaService.delete_media_by_url(db, row.media_url)
    db.delete(row)
    db.commit()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Diseño final como receta (sin archivo)
# ---------------------------------------------------------------------------

class PhotoFillIn(BaseModel):
    url: Optional[str] = Field(None, max_length=1000)
    zoom: float = Field(1, ge=0.1, le=10)
    offset_x: float = Field(0, ge=-5000, le=5000)
    offset_y: float = Field(0, ge=-5000, le=5000)


class LayerOverrideIn(BaseModel):
    """Ajuste del crematorio a una capa, solo en este diseño (% del lienzo)."""
    hidden: Optional[bool] = None
    x: Optional[float] = Field(None, ge=-50, le=150)
    y: Optional[float] = Field(None, ge=-50, le=150)
    width: Optional[float] = Field(None, ge=1, le=300)
    height: Optional[float] = Field(None, ge=1, le=300)
    rotation: Optional[float] = Field(None, ge=-360, le=360)


class DesignRecipe(BaseModel):
    ratio: str = Field("4:5", max_length=10)
    ai_text: str = Field("", max_length=1000)
    phrase: str = Field("", max_length=500)
    pet_name: str = Field("", max_length=120)
    date: str = Field("", max_length=60)
    photos: dict[str, PhotoFillIn] = Field(default_factory=dict)
    # Capas ocultas / movidas / redimensionadas en este diseño, por id de capa.
    overrides: dict[str, LayerOverrideIn] = Field(default_factory=dict, max_length=60)


class DesignCreate(BaseModel):
    pet_id: Optional[int] = None
    recipe: DesignRecipe


def _stored_url(url: Optional[str]) -> Optional[str]:
    """Solo URLs ya guardadas (http o rutas propias): nunca data:/blob: del navegador."""
    if not url or url.startswith(("data:", "blob:")):
        return None
    return url


@router.post("/{template_id}/designs", dependencies=[Depends(REDES_FEATURE)])
def save_design(
    template_id: int,
    payload: DesignCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """Registra el diseño final en «Mis diseños» sin subir ninguna imagen: guarda la
    receta (formato, textos y fotos ya guardadas) para dibujarlo cuando se necesite."""
    tpl = _active_template(db, template_id, tenant_id)
    pet = _pet(db, tenant_id, payload.pet_id)
    recipe = payload.recipe.model_dump()
    layer_ids = {l.get("id") for l in ((tpl.definition or {}).get("layers") or []) if isinstance(l, dict)}
    recipe["overrides"] = {
        lid: {k: v for k, v in o.items() if v is not None}
        for lid, o in recipe["overrides"].items() if lid in layer_ids
    }
    recipe["overrides"] = {lid: o for lid, o in recipe["overrides"].items() if o}
    recipe["photos"] = {
        slot: {**fill, "url": _stored_url(fill.get("url"))}
        for slot, fill in recipe["photos"].items() if slot in ("photo_1", "photo_2", "photo_3", "ai")
    }
    pet_name = pet.name if pet else "sin mascota"
    row = models.TemplateExport(
        tenant_id=tenant_id, template_id=tpl.id, pet_id=pet.id if pet else None,
        title=f"{tpl.name} · {pet_name}"[:250], media_url=None, meta=recipe,
        created_by=current_user.id, kind="design",
    )
    db.add(row)
    db.commit()
    return {"id": row.id}


@router.get("/{template_id:int}", response_model=ImageTemplateInDB)
def get_image_template(
    template_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
):
    """Una plantilla visible para el crematorio (para dibujar diseños guardados)."""
    tpl = db.query(models.ImageTemplate).filter(models.ImageTemplate.id == template_id, _visible(tenant_id)).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return tpl

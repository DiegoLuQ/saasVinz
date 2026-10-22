"""
SuperAdmin router for global image templates.

Image templates are visual layouts (text + photo placeholder over background)
that tenants can later reuse to generate pet memorial images. Templates are
global (no tenant_id). Once a template has been used by any tenant
(usage_count > 0) it becomes read-only and cannot be edited or deleted.
"""
import os
import time
import uuid
from datetime import datetime
from types import SimpleNamespace
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import get_current_creator
from app.api.internal.admin.image_templates.schemas import (
    ImageTemplateCreate,
    ImageTemplateUpdate,
    ImageTemplateInDB,
    AiTextTestRequest,
    AiTextResult,
    AiImageResult,
)
from app.api.internal.common.media_service import MediaService
from app.services import ai_providers, gemini, image_template_ai as ai
from app.utils.upload_validation import read_and_validate_image

router = APIRouter()


def _check_tenant(db: Session, tenant_id: Optional[int]) -> None:
    if tenant_id is not None and not db.query(models.Tenant.id).filter(models.Tenant.id == tenant_id).first():
        raise HTTPException(status_code=400, detail="El crematorio elegido para la plantilla exclusiva no existe")


def _get_or_404(db: Session, template_id: int) -> models.ImageTemplate:
    tpl = db.query(models.ImageTemplate).filter(models.ImageTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return tpl


@router.get("", response_model=List[ImageTemplateInDB])
def list_image_templates(
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    return (
        db.query(models.ImageTemplate)
        .order_by(models.ImageTemplate.created_at.desc())
        .all()
    )


@router.get("/{template_id}", response_model=ImageTemplateInDB)
def get_image_template(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    return _get_or_404(db, template_id)


@router.post("", response_model=ImageTemplateInDB)
def create_image_template(
    payload: ImageTemplateCreate,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    _check_tenant(db, payload.tenant_id)
    tpl = models.ImageTemplate(**payload.model_dump())
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.patch("/{template_id}", response_model=ImageTemplateInDB)
def update_image_template(
    template_id: int,
    payload: ImageTemplateUpdate,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    tpl = _get_or_404(db, template_id)
    if tpl.is_locked:
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta plantilla ya fue utilizada por uno o más tenants y no "
                "puede editarse. Duplica la plantilla para crear una nueva versión."
            ),
        )

    data = payload.model_dump(exclude_unset=True)
    if "tenant_id" in data:
        _check_tenant(db, data["tenant_id"])
    for key, value in data.items():
        setattr(tpl, key, value)

    db.commit()
    db.refresh(tpl)
    return tpl


@router.post("/{template_id}/duplicate", response_model=ImageTemplateInDB)
def duplicate_image_template(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    src = _get_or_404(db, template_id)
    clone = models.ImageTemplate(
        name=f"{src.name} (copia)",
        description=src.description,
        default_phrase=src.default_phrase,
        supported_ratios=list(src.supported_ratios or []),
        definition=dict(src.definition or {}),
        thumbnail_url=src.thumbnail_url,
        ai_text_prompt=src.ai_text_prompt,
        ai_image_prompt=src.ai_image_prompt,
        ai_text_max_chars=src.ai_text_max_chars,
        tenant_id=src.tenant_id,
        is_active=True,
        usage_count=0,
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone


class ExampleImageRequest(BaseModel):
    url: Optional[str] = Field(None, max_length=1000)


@router.put("/{template_id}/example")
def set_example_image(
    template_id: int,
    payload: ExampleImageRequest,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Imagen de ejemplo (thumbnail_url) que ven los crematorios al elegir la
    plantilla. Se puede cambiar aunque la plantilla esté en uso (bloqueada):
    no altera el diseño. url null = quitarla."""
    tpl = _get_or_404(db, template_id)
    tpl.thumbnail_url = (payload.url or "").strip() or None
    db.commit()
    db.refresh(tpl)
    return ImageTemplateInDB.model_validate(tpl)


@router.delete("/{template_id}")
def delete_image_template(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    tpl = _get_or_404(db, template_id)
    if tpl.is_locked:
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta plantilla ya fue utilizada y no puede eliminarse. "
                "Puedes desactivarla para ocultarla de los tenants."
            ),
        )
    db.delete(tpl)
    db.commit()
    return {"status": "deleted", "message": "Plantilla eliminada correctamente"}


# ---------------------------------------------------------------------------
# Recursos del editor: subida de fondos/adornos y prueba de prompts IA
# ---------------------------------------------------------------------------

@router.post("/upload-asset")
async def upload_image_template_asset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Sube un fondo o adorno de una plantilla global, optimizado y convertido a WebP.

    El editor lo llama recién al GUARDAR la plantilla: mientras se edita, las
    imágenes nuevas solo existen en el navegador (no se sube nada a la nube).
    """
    content, ext = await read_and_validate_image(file)
    os.makedirs("temp_uploads", exist_ok=True)
    temp_path = os.path.join("temp_uploads", f"{uuid.uuid4().hex}.{ext}")
    with open(temp_path, "wb") as f:
        f.write(content)
    try:
        # GLOBAL a propósito (sin tenant_id): lo usan todas las plantillas.
        item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="image_templates",
            ratio="original",
            description="Recurso de plantilla de imagen",
            alt_text="Recurso de plantilla de imagen",
            processing_mode="template",
        )
        return {"url": item.url, "width": item.width, "height": item.height}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _ensure_ai_configured(db: Session, kind: str) -> None:
    if ai_providers.resolve(db, kind) is None:
        what = "ilustraciones" if kind == "image" else "textos"
        raise HTTPException(
            status_code=503,
            detail=f"No hay plataforma de IA para {what}: configúrala en Configuración Global → Plataformas IA.",
        )


def _sample_pet():
    """Mascota de ejemplo para probar prompts sin tocar datos de tenants."""
    return SimpleNamespace(
        name="Luna", species="perro", breed="mestiza", size="mediano", age=12,
        birth_date=datetime(2014, 3, 2), death_date=datetime(2026, 9, 14),
    )


@router.get("/ai/meta")
def image_templates_ai_meta(db: Session = Depends(get_db), _creator=Depends(get_current_creator)):
    text_chain = ai_providers.resolve_all(db, "text")
    image_chain = ai_providers.resolve_all(db, "image")

    def describe(chain):
        if not chain:
            return "sin configurar"
        backups = len(chain) - 1
        extra = f" (+{backups} respaldo{'s' if backups > 1 else ''})" if backups else ""
        return f"{chain[0].label} · {chain[0].model}{extra}"

    return {
        "configured": bool(text_chain),
        "image_configured": bool(image_chain),
        "text_model": describe(text_chain),
        "image_model": describe(image_chain),
        "max_text_chars": ai.MAX_TEXT_CHARS,
        "placeholders": ai.PLACEHOLDERS,
        "default_text_prompt": ai.DEFAULT_TEXT_PROMPT,
        "default_image_prompt": ai.DEFAULT_IMAGE_PROMPT,
    }


@router.post("/ai/test-text", response_model=AiTextResult)
async def test_ai_text(
    payload: AiTextTestRequest,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    _ensure_ai_configured(db, "text")
    ctx = ai.build_context(_sample_pet(), SimpleNamespace(name="Crematorio Demo"),
                           "le encantaba dormir al sol y correr en la playa", payload.max_chars)
    started = time.monotonic()
    try:
        text, _used = await ai.generate_limited_text(db, ai.render_prompt(payload.prompt, ctx), payload.max_chars)
    except gemini.GeminiError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return AiTextResult(text=text, chars=len(text), max_chars=payload.max_chars,
                        duration_ms=int((time.monotonic() - started) * 1000))


@router.post("/ai/test-image", response_model=AiImageResult)
async def test_ai_image(
    prompt: str = Form(..., min_length=1, max_length=3000),
    aspect_ratio: Optional[str] = Form(None),
    photo_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Foto de prueba: archivo local o una imagen de la biblioteca (`photo_url`, sin volver a subirla)."""
    _ensure_ai_configured(db, "image")
    if file is not None:
        photo, _ext = await read_and_validate_image(file)
    elif photo_url:
        photo = await ai.load_stored_photo(photo_url)
    else:
        raise HTTPException(status_code=400, detail="Elige una foto de prueba.")
    ctx = ai.build_context(_sample_pet(), SimpleNamespace(name="Crematorio Demo"))
    try:
        # Prueba: el resultado vuelve como data URL y no se guarda en la nube.
        started = time.monotonic()
        url, _cost, _used = await ai.illustrate(db, prompt=ai.render_prompt(prompt, ctx), photo=photo, aspect_ratio=aspect_ratio)
    except gemini.GeminiError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return AiImageResult(url=url, duration_ms=int((time.monotonic() - started) * 1000))


# ---------------------------------------------------------------------------
# Uso de las plantillas: quién las usa y los últimos creados
# ---------------------------------------------------------------------------

@router.get("/stats/usage")
def image_templates_usage(
    latest: int = 5,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Por plantilla: crematorios que la usan (con sus cantidades y último uso),
    totales de diseños / ilustraciones guardadas / generaciones IA y los últimos
    `latest` creados. Cruza todos los tenants (tablas con RLS → bypass)."""
    from sqlalchemy import func
    from app.core.tenant_context import apply_bypass_rls

    apply_bypass_rls(db)
    latest = min(max(1, latest), 12)
    exp = models.TemplateExport
    gen = models.AiGeneration

    per_tenant = (
        db.query(exp.template_id, exp.tenant_id, exp.kind, func.count(exp.id), func.max(exp.created_at))
        .filter(exp.template_id.isnot(None))
        .group_by(exp.template_id, exp.tenant_id, exp.kind).all()
    )
    ai_counts = (
        db.query(gen.template_id, gen.tenant_id, func.count(gen.id))
        .filter(gen.template_id.isnot(None), gen.success.is_(True))
        .group_by(gen.template_id, gen.tenant_id).all()
    )

    # Últimos N por plantilla (ROW_NUMBER sobre created_at).
    rn = func.row_number().over(partition_by=exp.template_id, order_by=(exp.created_at.desc(), exp.id.desc())).label("rn")
    # Solo los que tienen imagen (los diseños nuevos son recetas sin archivo).
    sub = db.query(exp.id, rn).filter(exp.template_id.isnot(None), exp.media_url.isnot(None)).subquery()
    latest_rows = (
        db.query(exp).join(sub, sub.c.id == exp.id).filter(sub.c.rn <= latest)
        .order_by(exp.template_id, exp.created_at.desc()).all()
    )

    # Último diseño completo por plantilla (receta o archivo): la tarjeta lo muestra
    # en vez del diseño con datos de ejemplo.
    rn_d = func.row_number().over(partition_by=exp.template_id, order_by=(exp.created_at.desc(), exp.id.desc())).label("rn")
    sub_d = db.query(exp.id, rn_d).filter(exp.template_id.isnot(None), exp.kind == "design").subquery()
    latest_designs = db.query(exp).join(sub_d, sub_d.c.id == exp.id).filter(sub_d.c.rn == 1).all()

    tenant_ids = ({r[1] for r in per_tenant} | {r[1] for r in ai_counts} | {r.tenant_id for r in latest_rows}
                  | {r.tenant_id for r in latest_designs})
    names = dict(db.query(models.Tenant.id, models.Tenant.name).filter(models.Tenant.id.in_(tenant_ids or {0})).all())

    stats: dict = {}

    def entry(tpl_id):
        return stats.setdefault(tpl_id, {"tenants": {}, "designs": 0, "illustrations": 0, "ai_generations": 0, "latest": []})

    def tenant_row(e, tid):
        return e["tenants"].setdefault(tid, {
            "tenant_id": tid, "tenant_name": names.get(tid, f"Crematorio #{tid}"),
            "designs": 0, "illustrations": 0, "ai_generations": 0, "last_used_at": None,
        })

    for tpl_id, tid, kind, count, last in per_tenant:
        e = entry(tpl_id)
        t = tenant_row(e, tid)
        key = "designs" if kind == "design" else "illustrations"
        e[key] += count
        t[key] += count
        if last and (t["last_used_at"] is None or last > t["last_used_at"]):
            t["last_used_at"] = last
    for tpl_id, tid, count in ai_counts:
        e = entry(tpl_id)
        e["ai_generations"] += count
        tenant_row(e, tid)["ai_generations"] += count
    if latest_designs:
        tenants_by_id = {t.id: t for t in db.query(models.Tenant).filter(
            models.Tenant.id.in_({r.tenant_id for r in latest_designs})).all()}
        pets = {p.id: p for p in db.query(models.Pet).filter(
            models.Pet.id.in_({r.pet_id for r in latest_designs if r.pet_id} or {0})).all()}
        owners = {c.id: c for c in db.query(models.Customer).filter(
            models.Customer.id.in_({p.customer_id for p in pets.values() if p.customer_id} or {0})).all()}
        for r in latest_designs:
            pet = pets.get(r.pet_id)
            entry(r.template_id)["latest_design"] = {
                "id": r.id, "url": r.media_url, "meta": r.meta, "title": r.title,
                "tenant_name": names.get(r.tenant_id), "created_at": r.created_at,
                # Datos actuales (mascota, dueño, crematorio) para redibujar la receta.
                "bindings": ai.template_bindings(pet, owners.get(pet.customer_id) if pet else None,
                                                 tenants_by_id.get(r.tenant_id)) if not r.media_url else None,
            }
    for r in latest_rows:
        entry(r.template_id)["latest"].append({
            "id": r.id, "url": r.media_url, "title": r.title, "kind": r.kind,
            "tenant_name": names.get(r.tenant_id), "created_at": r.created_at,
        })

    out = {}
    for tpl_id, e in stats.items():
        tenants = sorted(e["tenants"].values(),
                         key=lambda t: (t["designs"] + t["illustrations"], t["ai_generations"]), reverse=True)
        out[str(tpl_id)] = {
            "tenants_count": len(tenants),
            "designs": e["designs"],
            "illustrations": e["illustrations"],
            "ai_generations": e["ai_generations"],
            "tenants": tenants,
            "latest": e["latest"],
            "latest_design": e.get("latest_design"),
        }
    return out


# ---------------------------------------------------------------------------
# Borrar todo lo creado con una plantilla (diseños, ilustraciones IA y archivos)
# ---------------------------------------------------------------------------

@router.get("/{template_id}/exports/preview")
def template_exports_preview(template_id: int, db: Session = Depends(get_db), _creator=Depends(get_current_creator)):
    """Qué se borraría: cantidades, archivos, peso y crematorios afectados."""
    from app.core.tenant_context import apply_bypass_rls
    from app.services import template_exports_purge

    apply_bypass_rls(db)
    tpl = _get_or_404(db, template_id)
    return {"template_id": tpl.id, "usage_count": tpl.usage_count or 0, **template_exports_purge.preview(db, tpl.id)}


@router.delete("/{template_id}/exports")
def template_exports_purge_all(template_id: int, unlock: bool = True, db: Session = Depends(get_db),
                               _creator=Depends(get_current_creator)):
    """Borra en todos los crematorios los diseños e ilustraciones de la plantilla y
    sus archivos en R2. Con `unlock`, la plantilla vuelve a poder editarse."""
    from app.core.tenant_context import apply_bypass_rls
    from app.services import template_exports_purge

    apply_bypass_rls(db)
    tpl = _get_or_404(db, template_id)
    return template_exports_purge.purge(db, tpl, unlock=unlock)

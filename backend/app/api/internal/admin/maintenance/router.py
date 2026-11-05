import logging
import os
import tempfile
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app import auth
from app.api.deps import get_tenant_id, get_current_user
from app.auth import get_current_admin
from app.api.internal.admin.rbac.router import check_permission
from app.api.internal.admin.maintenance import backups
from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from app.services.public_form_config import (
    DEFAULT_FIELDS, MAX_WEIGHT_TIERS, WEIGHT_PRICING_MODES, clean_weight_prices, form_config_with_meta,
    get_weight_tiers, normalize_form_config, uses_price_table, resolve_tier_inputs,
    clean_tier_examples, clean_tier_icon,
)
from app.services import form_video
from app.api.deps_features import check_feature

logger = logging.getLogger(__name__)

# Configuración → "Formulario y Pesos" es una característica del plan (sin flag = permitido).
FORM_FEATURE = check_feature("configuracion:formulario", default=True)

router = APIRouter()

router.include_router(backups.router, prefix="/backups", tags=["Backups"])

# ===== TABLE CONFIGURATION ENDPOINTS =====

@router.get("/table-config/{table_name}", response_model=schemas.TableConfigInDB)
def get_table_config(
    table_name: str,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "view"))
):
    """Get column configuration for a specific table"""
    config = db.query(models.TableConfiguration).filter(
        models.TableConfiguration.tenant_id == tenant_id,
        models.TableConfiguration.table_name == table_name
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    return config

@router.post("/table-config", response_model=schemas.TableConfigInDB)
def create_or_update_table_config(
    config_in: schemas.TableConfigCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "view"))
):
    """Create or update table column configuration"""
    existing = db.query(models.TableConfiguration).filter(
        models.TableConfiguration.tenant_id == tenant_id,
        models.TableConfiguration.table_name == config_in.table_name
    ).first()
    
    if existing:
        existing.columns_config = config_in.columns_config
        db.commit()
        apply_bypass_rls(db)
        db.refresh(existing)
        apply_tenant_rls(db, tenant_id)
        return existing
    else:
        new_config = models.TableConfiguration(
            tenant_id=tenant_id,
            table_name=config_in.table_name,
            columns_config=config_in.columns_config
        )
        db.add(new_config)
        db.commit()
        apply_bypass_rls(db)
        db.refresh(new_config)
        apply_tenant_rls(db, tenant_id)
        return new_config

# ===== WEIGHT PRICING ENDPOINTS =====
# Tramos "hasta X kg" (máx. MAX_WEIGHT_TIERS). Los usa el recargo por peso de
# las órdenes internas y el selector de tamaño del formulario/catálogo público.

@router.get("/weight-pricing", response_model=List[schemas.WeightPricingInDB])
def get_weight_pricing_rules(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: models.User = Depends(auth.get_current_user)  # Lo consumen los formularios de orden de varios roles
):
    """Tramos de peso ordenados por límite superior (el abierto al final)."""
    return get_weight_tiers(db, tenant_id)

@router.put("/weight-pricing", response_model=List[schemas.WeightPricingInDB])
def replace_weight_pricing_rules(
    payload: schemas.WeightPricingReplace,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "edit")),
    _f: bool = Depends(FORM_FEATURE)
):
    """Guarda la tabla completa de tramos.

    Cada tramo trae su rango "desde – hasta" escrito por el crematorio (ej.
    0–4, 4,1–7). Ningún tramo puede empezar antes de que termine el anterior
    (sin solapes). Solo el último puede quedar abierto (max_weight = null →
    "X kg o más"). Si un tramo no trae min_weight se usa el máximo del
    anterior (clientes antiguos). Las filas existentes se reutilizan por
    posición para conservar sus IDs (borradores del formulario público).
    """
    tiers = payload.tiers
    resolved = resolve_tier_inputs(tiers)  # (tramo, min_weight)

    existing = get_weight_tiers(db, tenant_id)
    for idx, (t, min_w) in enumerate(resolved):
        row = existing[idx] if idx < len(existing) else models.WeightPricing(tenant_id=tenant_id)
        row.label = (t.label or "").strip() or None
        row.min_weight = min_w
        row.max_weight = t.max_weight
        row.price = t.price
        row.icon_url = clean_tier_icon(t.icon_url)
        row.examples = clean_tier_examples(t.examples)
        if idx >= len(existing):
            db.add(row)
    for row in existing[len(tiers):]:
        db.delete(row)

    db.commit()
    apply_tenant_rls(db, tenant_id)
    return get_weight_tiers(db, tenant_id)


# ===== PRECIO POR PLAN Y PESO =====
# Modo "table" (form_config.weight_pricing_mode): cada plan tiene su precio por
# tramo en srv_plans.weight_prices. Celda vacía = precio base del plan.

class PlanWeightPricesRow(BaseModel):
    plan_id: int
    prices: Dict[str, Optional[float]] = Field(default_factory=dict)


class PlanWeightPricesUpdate(BaseModel):
    plans: List[PlanWeightPricesRow] = Field(default_factory=list)


def _plan_weight_prices_payload(db: Session, tenant_id: int) -> dict:
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    plans = db.query(models.Plan).filter(models.Plan.tenant_id == tenant_id).order_by(
        models.Plan.sort_order.asc(), models.Plan.price.asc(), models.Plan.name.asc()
    ).all()
    tier_ids = {t.id for t in get_weight_tiers(db, tenant_id)}
    return {
        "mode": "table" if uses_price_table(tenant) else "surcharge",
        "plans": [
            {"plan_id": p.id, "name": p.name, "group_name": p.group_name, "price": p.price or 0, "is_active": bool(p.is_active),
             "prices": clean_weight_prices(p.weight_prices, tier_ids) or {}}
            for p in plans
        ],
    }


@router.get("/plan-weight-prices")
def get_plan_weight_prices(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: models.User = Depends(auth.get_current_user)  # lo usa el formulario de orden
):
    """Modo de precio por peso y la tabla plan × tramo."""
    return _plan_weight_prices_payload(db, tenant_id)


@router.put("/plan-weight-prices")
def update_plan_weight_prices(
    payload: PlanWeightPricesUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "edit")),
    _f: bool = Depends(FORM_FEATURE)
):
    """Guarda los precios por tramo de los planes enviados (los demás no cambian)."""
    tier_ids = {t.id for t in get_weight_tiers(db, tenant_id)}
    ids = [r.plan_id for r in payload.plans]
    plans = {p.id: p for p in db.query(models.Plan).filter(
        models.Plan.tenant_id == tenant_id, models.Plan.id.in_(ids or [0])
    ).all()}
    for row in payload.plans:
        plan = plans.get(row.plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan no encontrado")
        plan.weight_prices = clean_weight_prices(row.prices, tier_ids)
    db.commit()
    apply_tenant_rls(db, tenant_id)
    return _plan_weight_prices_payload(db, tenant_id)


# ===== PUBLIC FORM CONFIGURATION =====

class FormFieldSetting(BaseModel):
    visible: bool = True
    required: bool = False

class FormConfigUpdate(BaseModel):
    phases: Dict[str, bool] = Field(default_factory=dict)
    fields: Dict[str, FormFieldSetting] = Field(default_factory=dict)
    show_weight_prices: bool = False
    show_service_prices: bool = False
    show_plan_request_button: bool = True  # catálogo de planes: botón «Solicitar este plan»
    weight_pricing_mode: str = "surcharge"  # "surcharge" (recargo por tramo) | "table" (precio por plan y peso)
    memories: Dict[str, bool] = Field(default_factory=dict)
    delivery_notice: Optional[str] = None
    welcome_modal: Optional[Dict[str, Any]] = None
    custom_forms: Optional[List[Dict[str, Any]]] = None

@router.get("/form-config")
def get_form_config(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "view"))
):
    """Campos configurables del formulario público con su estado actual."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return {**form_config_with_meta(tenant.form_config), "video_allowed": form_video.tenant_can_use_form_video(tenant)}

@router.put("/form-config")
def update_form_config(
    payload: FormConfigUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "edit")),
    _f: bool = Depends(FORM_FEATURE)
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if payload.weight_pricing_mode not in WEIGHT_PRICING_MODES:
        raise HTTPException(status_code=400, detail="Modo de precio por peso inválido")
    unknown = set(payload.fields) - set(DEFAULT_FIELDS)
    if unknown:
        raise HTTPException(status_code=400, detail=f"Campos desconocidos: {', '.join(sorted(unknown))}")

    # Se guarda normalizado (obligatorio implica visible); claves ausentes = defecto.
    old_cfg = normalize_form_config(tenant.form_config)
    new_cfg = normalize_form_config({
        "phases": payload.phases,
        "fields": {k: v.model_dump() for k, v in payload.fields.items()},
        "show_weight_prices": payload.show_weight_prices,
        "show_service_prices": payload.show_service_prices,
        "show_plan_request_button": payload.show_plan_request_button,
        "weight_pricing_mode": payload.weight_pricing_mode,
        "memories": payload.memories,
        "delivery_notice": payload.delivery_notice,
        "welcome_modal": payload.welcome_modal,
        "custom_forms": payload.custom_forms,
    })
    # Videos nuevos: plan PRO/ULTRA y duración comprobada; los subidos que ya no se usan se borran.
    unused_keys = form_video.validate_new_config(tenant, old_cfg, new_cfg)
    tenant.form_config = new_cfg
    db.commit()
    if unused_keys:
        from app.utils.r2 import delete_file_from_r2
        from app.core.config import settings
        for key in unused_keys:
            delete_file_from_r2(settings.R2_BUCKET_NAME, key)
    return {**form_config_with_meta(tenant.form_config), "video_allowed": form_video.tenant_can_use_form_video(tenant)}


class FormVideoLink(BaseModel):
    url: str = Field(..., max_length=500)


@router.post("/form-video/link")
def check_form_video_link(
    payload: FormVideoLink,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "edit")),
    _f: bool = Depends(FORM_FEATURE)
):
    """Valida un enlace de Vimeo / Cloudflare Stream (≤ 30 s). No guarda nada."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    form_video.require_form_video_plan(tenant)
    return form_video.check_link(payload.url)


TIER_ICON_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
TIER_ICON_MAX = 2 * 1024 * 1024


@router.post("/weight-icon")
def upload_weight_tier_icon(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "edit")),
    _f: bool = Depends(FORM_FEATURE)
):
    """Sube el ícono de un rango de peso (tarjetas de tamaño del catálogo). Devuelve su URL;
    se guarda en el rango al guardar los rangos (General o tabla de precios)."""
    from app.api.internal.common.media_service import MediaService
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in TIER_ICON_EXTS:
        raise HTTPException(status_code=400, detail="Formato no admitido. Usa PNG, JPG o WebP.")
    content = file.file.read(TIER_ICON_MAX + 1)
    if len(content) > TIER_ICON_MAX:
        raise HTTPException(status_code=400, detail="La imagen supera 2 MB.")
    tmp = os.path.join(tempfile.gettempdir(), f"tiericon_{uuid.uuid4().hex}{ext}")
    try:
        with open(tmp, "wb") as out:
            out.write(content)
        item = MediaService.upload_media(
            db=db, local_path=tmp, media_type="image", category="tamanos", ratio="original",
            description="Ícono de rango de peso", alt_text="Ícono de tamaño",
            processing_mode="optimized", custom_prefix="tamano", tenant_id=tenant_id,
        )
        return {"url": item.url}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("weight-icon upload failed")
        raise HTTPException(status_code=500, detail=f"No se pudo procesar la imagen: {e}")
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


@router.post("/form-video")
def upload_form_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "edit")),
    _f: bool = Depends(FORM_FEATURE)
):
    """Sube el video de bienvenida (≤ 30 s). Se llama al guardar la configuración;
    queda en R2 y se referencia desde form_config en el mismo guardado."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    form_video.require_form_video_plan(tenant)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".mp4", ".mov", ".webm", ".m4v"}:
        raise HTTPException(status_code=400, detail="Formato no admitido. Usa MP4, MOV o WebM.")
    tmp = os.path.join(tempfile.gettempdir(), f"formvideo_in_{uuid.uuid4().hex}{ext}")
    try:
        size = 0
        with open(tmp, "wb") as out:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > form_video.MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="El video pesa más de 80 MB.")
                out.write(chunk)
        return form_video.process_upload(tmp, tenant_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error procesando video de bienvenida (tenant %s)", tenant_id)
        raise HTTPException(status_code=500, detail="No se pudo procesar el video.")
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)

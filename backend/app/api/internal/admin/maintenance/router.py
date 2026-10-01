from fastapi import APIRouter, Depends, HTTPException
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
from typing import Dict, List
from pydantic import BaseModel, Field
from app.services.public_form_config import (
    DEFAULT_FIELDS, MAX_WEIGHT_TIERS, form_config_with_meta, get_weight_tiers, normalize_form_config,
)

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
    admin: models.User = Depends(check_permission("configuracion", "edit"))
):
    """Guarda la tabla completa de tramos.

    Cada tramo trae solo su límite superior; el mínimo es el máximo del tramo
    anterior (el primero parte en 0), así no quedan huecos ni solapes. Solo el
    último puede quedar abierto (max_weight = null → "más de X kg").
    Las filas existentes se reutilizan por posición para conservar sus IDs
    (borradores del formulario público que ya eligieron un tramo).
    """
    tiers = payload.tiers
    if len(tiers) > MAX_WEIGHT_TIERS:
        raise HTTPException(status_code=400, detail=f"Máximo {MAX_WEIGHT_TIERS} rangos de peso")

    prev_max = 0.0
    for idx, t in enumerate(tiers):
        is_last = idx == len(tiers) - 1
        if t.max_weight is None:
            if not is_last:
                raise HTTPException(status_code=400, detail="Solo el último rango puede quedar abierto (sin máximo)")
            continue
        if t.max_weight <= prev_max:
            raise HTTPException(
                status_code=400,
                detail=f"Rango {idx + 1}: el máximo debe ser mayor que {prev_max:g} kg"
            )
        if t.max_weight > 500:
            raise HTTPException(status_code=400, detail=f"Rango {idx + 1}: máximo fuera de rango (500 kg)")
        prev_max = t.max_weight

    existing = get_weight_tiers(db, tenant_id)
    prev_max = 0.0
    for idx, t in enumerate(tiers):
        row = existing[idx] if idx < len(existing) else models.WeightPricing(tenant_id=tenant_id)
        row.label = (t.label or "").strip() or None
        row.min_weight = prev_max
        row.max_weight = t.max_weight
        row.price = t.price
        if idx >= len(existing):
            db.add(row)
        if t.max_weight is not None:
            prev_max = t.max_weight
    for row in existing[len(tiers):]:
        db.delete(row)

    db.commit()
    apply_tenant_rls(db, tenant_id)
    return get_weight_tiers(db, tenant_id)


# ===== PUBLIC FORM CONFIGURATION =====

class FormFieldSetting(BaseModel):
    visible: bool = True
    required: bool = False

class FormConfigUpdate(BaseModel):
    fields: Dict[str, FormFieldSetting] = Field(default_factory=dict)
    show_weight_prices: bool = False

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
    return form_config_with_meta(tenant.form_config)

@router.put("/form-config")
def update_form_config(
    payload: FormConfigUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "edit"))
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    unknown = set(payload.fields) - set(DEFAULT_FIELDS)
    if unknown:
        raise HTTPException(status_code=400, detail=f"Campos desconocidos: {', '.join(sorted(unknown))}")

    # Se guarda normalizado (obligatorio implica visible); claves ausentes = defecto.
    tenant.form_config = normalize_form_config({
        "fields": {k: v.model_dump() for k, v in payload.fields.items()},
        "show_weight_prices": payload.show_weight_prices,
    })
    db.commit()
    return form_config_with_meta(tenant.form_config)

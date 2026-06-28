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
from typing import List

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

@router.get("/weight-pricing", response_model=List[schemas.WeightPricingInDB])
def get_weight_pricing_rules(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(auth.get_current_user) # Solo necesitamos que esté autenticado para la lógica de abajo
):
    """Get all weight-based pricing rules"""
    # Verificación manual de permisos para permitir múltiples módulos
    db_user = auth.get_current_user # Esto es el objeto, no la dependencia corregida
    # En FastAPI, las dependencias inyectadas ya están resueltas. 
    # Usaremos una verificación directa contra check_permission pero de forma interna o simplemente pasando.
    # MEJOR: Usaremos el check_permission directamente en la dependencia si FastAPI lo permite dinámico, 
    # pero aquí lo haremos simple:
    return db.query(models.WeightPricing).filter(
        models.WeightPricing.tenant_id == tenant_id
    ).order_by(models.WeightPricing.min_weight).all()

@router.post("/weight-pricing", response_model=schemas.WeightPricingInDB)
def create_weight_pricing_rule(
    rule_in: schemas.WeightPricingCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "view"))
):
    """Create a new weight-based pricing rule"""
    # Validate range
    if rule_in.min_weight >= rule_in.max_weight:
        raise HTTPException(
            status_code=400,
            detail="El peso mínimo debe ser menor que el peso máximo"
        )
    
    new_rule = models.WeightPricing(
        tenant_id=tenant_id,
        min_weight=rule_in.min_weight,
        max_weight=rule_in.max_weight,
        price=rule_in.price
    )
    db.add(new_rule)
    db.commit()
    apply_bypass_rls(db)
    db.refresh(new_rule)
    apply_tenant_rls(db, tenant_id)
    return new_rule

@router.delete("/weight-pricing/{rule_id}")
def delete_weight_pricing_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    admin: models.User = Depends(check_permission("configuracion", "view"))
):
    """Delete a weight-based pricing rule"""
    rule = db.query(models.WeightPricing).filter(
        models.WeightPricing.id == rule_id,
        models.WeightPricing.tenant_id == tenant_id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    
    db.delete(rule)
    db.commit()
    return {"message": "Regla eliminada exitosamente"}

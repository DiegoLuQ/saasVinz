from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.api.deps import get_current_user, get_tenant_id
import shutil
import os
import uuid
from typing import Optional
from app.api.internal.common.media_service import MediaService

from app.api.internal.payments.service import payment_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/me/deactivate")
async def deactivate_my_tenant(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Desactiva la renovación del tenant actual:
    1. Cancela la suscripción en Polar.sh si existe (al final del periodo).
    2. Registra el estado de suscripción como 'canceled' localmente.
    3. MANTIENE el status como 'active' para que pueda seguir operando hasta el fin del periodo pagado.
    """
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    # 1. Cancelar en Polar.sh si hay una suscripción activa
    if tenant.polar_subscription_id:
        try:
            await payment_service.cancel_subscription(tenant.polar_subscription_id)
            logger.info(f"Subscription {tenant.polar_subscription_id} set to cancel at period end for tenant {tenant.id}")
        except Exception as e:
            logger.error(f"Error cancelling Polar subscription for tenant {tenant.id}: {str(e)}")
            # No bloqueamos el proceso si falla la comunicación con Polar, 
            # pero el usuario debería saberlo si es un error crítico.

    # 2. Actualizar status de suscripción local
    # IMPORTANTE: No cambiamos tenant.status a 'suspended' aún.
    # El status general se mantiene 'active' para permitir acceso al panel.
    tenant.polar_cancel_at_period_end = True
    
    db.commit()
    
    return {
        "status": "active", 
        "subscription_status": tenant.subscription_status,
        "message": "La renovación automática ha sido cancelada. Mantendrás acceso total hasta el fin de tu periodo actual."
    }

@router.get("/me", response_model=schemas.TenantInDB)
def get_my_tenant(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Obtiene la información del tenant actual."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return tenant

@router.patch("/me", response_model=schemas.TenantInDB)
def update_my_tenant(
    tenant_update: schemas.TenantUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Actualiza la información del tenant actual."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    update_data = tenant_update.dict(exclude_unset=True)
    
    # Check for duplicate Slug
    # Check for duplicate Slug (only if changed)
    if 'slug' in update_data and update_data['slug']:
        new_slug = update_data['slug']
        if new_slug != tenant.slug:
            print(f"DEBUG: Checking new slug '{new_slug}' (was '{tenant.slug}')")
            existing_slug = db.query(models.Tenant).filter(
                models.Tenant.slug == new_slug
            ).first()
            
            if existing_slug:
                 print(f"DEBUG: Found duplicate slug with tenant_id {existing_slug.id}")
                 raise HTTPException(status_code=400, detail="La URL personalizada (slug) ya está en uso por otra empresa. Por favor elige otro.")
    
    # Handle billing notification channels update
    if 'billing_notify_channels' in update_data:
        billing_channels = update_data.pop('billing_notify_channels')
        if tenant.billing_info:
            tenant.billing_info.billing_notify_channels = billing_channels
        else:
            # Create if not exists (should rarely happen given migration)
            billing_info = models.TenantBillingInfo(
                tenant_id=tenant.id, 
                billing_notify_channels=billing_channels
            )
            db.add(billing_info)

    for key, value in update_data.items():
        setattr(tenant, key, value)
    
    db.commit()
    db.refresh(tenant)
    return tenant

def ensure_tenant_dirs(tenant_id: int):
    """Asegura que existan las carpetas base para un tenant."""
    base_dir = f"app/static/tenants/{tenant_id}"
    subdirs = ["logos", "disenos", "template_assets", "uploads/pets", "uploads/products", "uploads/cremations"]
    for subdir in subdirs:
        os.makedirs(os.path.join(base_dir, subdir), exist_ok=True)
    return base_dir

@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sube el logo de la empresa usando el MediaService unificado."""
    # Temporales para el MediaService
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{ext}")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")

        # El MediaService ya se encarga de:
        # 1. Preservar transparencia
        # 2. Convertir a WebP
        # 3. Compresión iterativa (< 500KB)
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="logos",
            ratio="original", # Logotipos no se cortan
            description=f"Logo de {tenant.name}",
            alt_text=f"Logo {tenant.name}",
            processing_mode="optimized",
            custom_prefix=f"logo_{tenant.slug}",
            tenant_id=tenant.id
        )
        
        # Eliminar logo anterior del storage si existe (vía MediaLibrary)
        if tenant.logo_url:
            from app.api.internal.common.models import MediaLibrary
            old_item = db.query(MediaLibrary).filter(MediaLibrary.url == tenant.logo_url).first()
            if old_item:
                MediaService.delete_media(db, old_item)

        tenant.logo_url = media_item.url
        db.commit()
        
        return {"logo_url": media_item.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el logo: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

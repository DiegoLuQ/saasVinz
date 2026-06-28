from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, auth
from app.utils import tz
from app.api.deps import get_tenant_id
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta
import secrets

router = APIRouter()

class TemporaryTokenResponse(BaseModel):
    id: int
    token: str
    expires_at: datetime
    is_active: bool
    created_at: datetime
    created_by_email: str | None = None
    
    class Config:
        from_attributes = True

class GenerateTokenResponse(BaseModel):
    token: str
    expires_at: datetime
    url: str

@router.post("/generate", response_model=GenerateTokenResponse)
def generate_temporary_token(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Genera un token temporal de 3 días para compartir el formulario público.
    Solo accesible para roles admin y recepcion.
    """
    # Verificar rol
    if current_user.role not in [models.UserRole.admin, models.UserRole.recepcion, models.UserRole.creator]:
        raise HTTPException(
            status_code=403, 
            detail="Solo administradores, recepcionistas y creadores pueden generar enlaces temporales"
        )
    
    # Obtener el tenant para construir la URL
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    
    # Generar token único
    token = secrets.token_urlsafe(32)
    
    # Calcular expiración (3 días desde ahora)
    expires_at = tz.get_now() + timedelta(days=3)
    
    # Crear registro en BD
    temp_token = models.TemporaryFormToken(
        tenant_id=tenant_id,
        token=token,
        created_by_user_id=current_user.id,
        expires_at=expires_at,
        is_active=True
    )
    
    db.add(temp_token)
    db.flush()  # Get auto-generated ID/timestamps without ending transaction
    
    # Capture data before commit expires the instance
    token_value = temp_token.token
    token_expires_at = temp_token.expires_at
    
    db.commit()
    
    # Construir URL
    # Formato: http://localhost:3002/form/{slug}?token={token}
    base_url = "http://localhost:3002"  # Esto debería venir de configuración
    url = f"{base_url}/form/{tenant.slug}?token={token_value}"
    
    return GenerateTokenResponse(
        token=token_value,
        expires_at=token_expires_at,
        url=url
    )

@router.get("/", response_model=List[TemporaryTokenResponse])
def get_active_tokens(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Lista todos los tokens activos del tenant.
    Solo accesible para admin y recepcion.
    """
    if current_user.role not in [models.UserRole.admin, models.UserRole.recepcion, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # Obtener tokens activos y no expirados
    now = tz.get_now()
    tokens = db.query(models.TemporaryFormToken).filter(
        models.TemporaryFormToken.tenant_id == tenant_id,
        models.TemporaryFormToken.is_active == True,
        models.TemporaryFormToken.expires_at > now
    ).order_by(models.TemporaryFormToken.created_at.desc()).all()
    
    result = []
    for token in tokens:
        created_by_email = None
        if token.created_by:
            created_by_email = token.created_by.email
            
        result.append(TemporaryTokenResponse(
            id=token.id,
            token=token.token,
            expires_at=token.expires_at,
            is_active=token.is_active,
            created_at=token.created_at,
            created_by_email=created_by_email
        ))
    
    return result

@router.delete("/{token_id}")
def revoke_token(
    token_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Revoca un token temporal antes de su expiración.
    Solo accesible para admin y recepcion.
    """
    if current_user.role not in [models.UserRole.admin, models.UserRole.recepcion, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    token = db.query(models.TemporaryFormToken).filter(
        models.TemporaryFormToken.id == token_id,
        models.TemporaryFormToken.tenant_id == tenant_id
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="Token no encontrado")
    
    # Marcar como inactivo
    token.is_active = False
    db.commit()
    
    return {"message": "Token revocado exitosamente"}

@router.post("/cleanup")
def cleanup_expired_tokens(
    db: Session = Depends(get_db)
):
    """
    Limpia tokens expirados (tarea de mantenimiento).
    Este endpoint debería llamarse periódicamente por un cron job.
    """
    now = tz.get_now()
    
    # Marcar como inactivos los tokens expirados
    expired_count = db.query(models.TemporaryFormToken).filter(
        models.TemporaryFormToken.expires_at <= now,
        models.TemporaryFormToken.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    
    return {"message": f"Se marcaron {expired_count} tokens expirados como inactivos"}

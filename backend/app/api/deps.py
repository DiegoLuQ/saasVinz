from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, auth
from typing import Optional

oauth2_scheme = auth.oauth2_scheme

def get_current_user(db: Session = Depends(get_db), token: Optional[str] = Depends(oauth2_scheme)):
    """
    Proxy a auth.get_current_user para mantener compatibilidad con imports existentes.
    """
    return auth.get_current_user(db=db, token=token)

async def get_tenant_id(
    current_user: models.User = Depends(get_current_user),
    x_tenant_id: Optional[int] = Header(None)
):
    """
    Resuelve el tenant_id actual.
    - Usuarios normales: Siempre usan su propio tenant_id (seguridad).
    - SuperAdmin (Creator): Pueden usar el Header X-Tenant-ID para ver datos de otros tenants.
    """
    # 1. Si NO es SuperAdmin, forzamos su propio tenant_id
    if current_user.role != "creator" and current_user.role != models.UserRole.creator:
        if current_user.tenant_id is None:
            raise HTTPException(status_code=400, detail="Usuario sin empresa asociada.")
        return current_user.tenant_id
    
    # 2. Si ES SuperAdmin, buscamos el header
    if x_tenant_id is not None:
        return x_tenant_id
            
    # 3. Si es SuperAdmin pero no envió header, error (el dashboard de creador usa rutas que NO dependen de get_tenant_id)
    raise HTTPException(
        status_code=400, 
        detail="Como SuperAdmin, debes especificar un X-Tenant-ID en el header para acceder a recursos de inquilinos."
    )

async def get_public_tenant_id(x_tenant_id: int = Header(...)):
    # Mandatory header for public API
    return x_tenant_id


def get_tenant(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
) -> models.Tenant:
    """
    Retrieves the Tenant object based on resolution logic.
    """
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

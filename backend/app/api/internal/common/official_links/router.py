"""Enlaces oficiales del crematorio (Configuración → «Enlaces oficiales»).
Lógica en app/services/official_links.py."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_tenant_id
from app.auth import get_current_user
from app.database import get_db
from app.services import official_links

router = APIRouter()


class OfficialLinksIn(BaseModel):
    form: Optional[str] = None
    plans_token_id: Optional[int] = None
    products_token_id: Optional[int] = None


def _tenant(db: Session, tenant_id: int) -> models.Tenant:
    t = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if t is None:
        raise HTTPException(status_code=404, detail="Crematorio no encontrado")
    return t


@router.get("")
def get_official_links(db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id),
                       current_user: models.User = Depends(get_current_user)):
    """Estado de los enlaces oficiales (lo que falta = miniguía del panel) + opciones de formulario."""
    tenant = _tenant(db, tenant_id)
    return {**official_links.status(db, tenant), "form_options": official_links.form_options(tenant)}


@router.put("")
def update_official_links(payload: OfficialLinksIn, db: Session = Depends(get_db),
                          tenant_id: int = Depends(get_tenant_id),
                          current_user: models.User = Depends(get_current_user)):
    role = getattr(current_user.role, "value", current_user.role)
    if role not in ("admin", "creator"):
        raise HTTPException(status_code=403, detail="Solo el administrador del crematorio puede cambiar los enlaces oficiales.")
    from app.api.deps_features import check_feature
    check_feature("configuracion:enlaces_oficiales", default=True)(current_user=current_user)
    tenant = _tenant(db, tenant_id)
    st = official_links.save(db, tenant, payload.model_dump())
    return {**st, "form_options": official_links.form_options(tenant)}

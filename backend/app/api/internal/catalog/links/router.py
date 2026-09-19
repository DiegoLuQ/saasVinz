from datetime import timedelta
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, models
from app.api.deps import get_tenant_id, get_current_user
from app.api.internal.admin.rbac.router import check_permission
from app.api.internal.catalog.models import CatalogShareToken
from app.utils import tz

router = APIRouter()


@router.get("", response_model=List[schemas.CatalogShareTokenInDB])
def list_catalog_share_links(
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: bool = Depends(check_permission("inventario", "view")),
):
    """Lista todos los enlaces de catálogo compartidos del tenant."""
    from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
    if current_user.role in ("creator", models.UserRole.creator):
        apply_bypass_rls(db)
    else:
        apply_tenant_rls(db, tenant_id)

    tokens = (
        db.query(CatalogShareToken)
        .filter(CatalogShareToken.tenant_id == tenant_id)
        .order_by(CatalogShareToken.created_at.desc())
        .all()
    )

    now = tz.get_now()
    results = []
    for item in tokens:
        is_expired = False
        if item.expires_at and now > item.expires_at:
            is_expired = True

        token_dto = schemas.CatalogShareTokenInDB(
            id=item.id,
            tenant_id=item.tenant_id,
            token=item.token,
            name=item.name,
            expires_at=item.expires_at,
            is_active=item.is_active,
            views_count=item.views_count or 0,
            last_viewed_at=item.last_viewed_at,
            created_at=item.created_at,
            is_expired=is_expired,
        )
        results.append(token_dto)

    return results


@router.post("", response_model=schemas.CatalogShareTokenInDB, status_code=status.HTTP_201_CREATED)
def create_catalog_share_link(
    data: schemas.CatalogShareTokenCreate,
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: bool = Depends(check_permission("inventario", "create")),
):
    """Genera un nuevo token de catálogo para compartir con clientes."""
    from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
    if current_user.role in ("creator", models.UserRole.creator):
        apply_bypass_rls(db)
    else:
        apply_tenant_rls(db, tenant_id)

    now = tz.get_now()
    expires_at = None

    if data.expires_in_hours and data.expires_in_hours > 0:
        expires_at = now + timedelta(hours=data.expires_in_hours)

    # Genera token aleatorio URL-safe de 16 bytes (~22 chars)
    token_str = secrets.token_urlsafe(16)

    new_token = CatalogShareToken(
        tenant_id=tenant_id,
        token=token_str,
        name=data.name.strip() if data.name else None,
        expires_at=expires_at,
        is_active=True,
        views_count=0,
        created_by=current_user.id if current_user else None,
        created_at=now,
    )
    db.add(new_token)
    db.commit()
    db.refresh(new_token)

    return schemas.CatalogShareTokenInDB(
        id=new_token.id,
        tenant_id=new_token.tenant_id,
        token=new_token.token,
        name=new_token.name,
        expires_at=new_token.expires_at,
        is_active=new_token.is_active,
        views_count=0,
        last_viewed_at=None,
        created_at=new_token.created_at,
        is_expired=False,
    )


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_catalog_share_link(
    token_id: int,
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: bool = Depends(check_permission("inventario", "delete")),
):
    """Revoca y elimina un enlace de catálogo."""
    from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
    if current_user.role in ("creator", models.UserRole.creator):
        apply_bypass_rls(db)
    else:
        apply_tenant_rls(db, tenant_id)

    item = (
        db.query(CatalogShareToken)
        .filter(
            CatalogShareToken.id == token_id,
            CatalogShareToken.tenant_id == tenant_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Enlace no encontrado")

    db.delete(item)
    db.commit()
    return None

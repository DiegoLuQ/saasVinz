from datetime import timedelta
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, models
from app.api.deps import get_tenant_id, get_current_user
from app.api.internal.admin.rbac.router import check_permission
from app.api.internal.catalog.models import CatalogShareToken
from app.api.internal.catalog.schemas import CatalogType

# Catálogo de planes: vigencias permitidas (10 días, 1 año; sin valor = permanente)
PLANS_EXPIRATION_HOURS = {240, 8760}
from app.utils import tz

router = APIRouter()

# Cada tipo de catálogo se gobierna con el permiso de su módulo:
# productos -> Inventario, planes -> Gestión de Servicios.
MODULE_BY_TYPE = {"products": "inventario", "plans": "servicios"}


def _authorize(db: Session, current_user: models.User, tenant_id: int, catalog_type: str, action: str) -> None:
    """Verifica el permiso del módulo según el tipo y fija el contexto RLS."""
    check_permission(MODULE_BY_TYPE[catalog_type], action)(db=db, current_user=current_user)

    from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
    if current_user.role in ("creator", models.UserRole.creator):
        apply_bypass_rls(db)
    else:
        apply_tenant_rls(db, tenant_id)


def _to_dto(item: CatalogShareToken, now) -> schemas.CatalogShareTokenInDB:
    return schemas.CatalogShareTokenInDB(
        id=item.id,
        tenant_id=item.tenant_id,
        token=item.token,
        name=item.name,
        catalog_type=item.catalog_type or "products",
        message=item.message,
        expires_at=item.expires_at,
        is_active=item.is_active,
        views_count=item.views_count or 0,
        last_viewed_at=item.last_viewed_at,
        created_at=item.created_at,
        is_expired=bool(item.expires_at and now > item.expires_at),
    )


@router.get("", response_model=List[schemas.CatalogShareTokenInDB])
def list_catalog_share_links(
    catalog_type: CatalogType = Query("products", alias="type"),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista los enlaces de catálogo compartidos del tenant, del tipo indicado."""
    _authorize(db, current_user, tenant_id, catalog_type, "view")

    tokens = (
        db.query(CatalogShareToken)
        .filter(
            CatalogShareToken.tenant_id == tenant_id,
            CatalogShareToken.catalog_type == catalog_type,
        )
        .order_by(CatalogShareToken.created_at.desc())
        .all()
    )

    now = tz.get_now()
    return [_to_dto(item, now) for item in tokens]


@router.post("", response_model=schemas.CatalogShareTokenInDB, status_code=status.HTTP_201_CREATED)
def create_catalog_share_link(
    data: schemas.CatalogShareTokenCreate,
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Genera un nuevo token de catálogo para compartir con clientes."""
    _authorize(db, current_user, tenant_id, data.catalog_type, "create")

    now = tz.get_now()
    expires_at = None

    # Catálogo de planes: solo 10 días, 1 año o permanente (None / 0)
    if data.catalog_type == "plans" and data.expires_in_hours and data.expires_in_hours not in PLANS_EXPIRATION_HOURS:
        raise HTTPException(status_code=400, detail="La vigencia del catálogo de planes debe ser 10 días, 1 año o permanente.")

    if data.expires_in_hours and data.expires_in_hours > 0:
        expires_at = now + timedelta(hours=data.expires_in_hours)

    message = ((data.message or "").strip() or None) if data.catalog_type == "plans" else None

    # Genera token aleatorio URL-safe de 16 bytes (~22 chars)
    token_str = secrets.token_urlsafe(16)

    new_token = CatalogShareToken(
        tenant_id=tenant_id,
        token=token_str,
        name=data.name.strip() if data.name else None,
        catalog_type=data.catalog_type,
        message=message,
        expires_at=expires_at,
        is_active=True,
        views_count=0,
        created_by=current_user.id if current_user else None,
        created_at=now,
    )
    db.add(new_token)
    db.commit()
    db.refresh(new_token)

    return _to_dto(new_token, now)


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_catalog_share_link(
    token_id: int,
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
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

    # El permiso depende del tipo del enlace (se conoce recién al leerlo)
    check_permission(MODULE_BY_TYPE.get(item.catalog_type or "products", "inventario"), "delete")(
        db=db, current_user=current_user
    )

    db.delete(item)
    db.commit()
    return None

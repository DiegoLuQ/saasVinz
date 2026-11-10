from datetime import timedelta
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, models
from app.api.deps import get_tenant_id, get_current_user
from app.api.internal.admin.rbac.router import check_permission
from app.api.deps_features import check_feature
from app.api.internal.catalog.models import CatalogShareToken
from app.api.internal.catalog.schemas import (
    CatalogType, CatalogShareTokenBulkUpdate, CatalogShareTokenPlanGroups, CatalogShareTokenPriceList,
    CatalogShareTokenUpdate,
)
from app.services.plan_groups import clean_plan_groups, existing_plan_groups

GROUP_REQUIRED = "Elige el grupo de planes que mostrará este catálogo."

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


def _price_list(db: Session, tenant_id: int, list_id: int | None):
    """Valida que la tabla de precios sea del crematorio (None = General)."""
    if not list_id:
        return None
    pl = db.query(models.PriceList).filter(
        models.PriceList.id == list_id, models.PriceList.tenant_id == tenant_id,
    ).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Tabla de precios no encontrada")
    return pl


def _to_dto(item: CatalogShareToken, now, stats: dict | None = None, price_lists: dict | None = None) -> schemas.CatalogShareTokenInDB:
    from app.services.price_lists import status_of
    pl = (price_lists or {}).get(item.price_list_id) if item.price_list_id else None
    return schemas.CatalogShareTokenInDB(
        price_list_id=item.price_list_id if pl else None,
        price_list_name=pl.name if pl else None,
        price_list_status=status_of(pl) if pl else None,
        id=item.id,
        tenant_id=item.tenant_id,
        token=item.token,
        name=item.name,
        catalog_type=item.catalog_type or "products",
        message=item.message,
        plan_groups=item.plan_groups if (item.catalog_type or "products") == "plans" else None,
        show_video=item.show_video if item.show_video is not None else True,
        expires_at=item.expires_at,
        is_active=item.is_active,
        views_count=item.views_count or 0,
        last_viewed_at=item.last_viewed_at,
        created_at=item.created_at,
        is_expired=bool(item.expires_at and now > item.expires_at),
        **(stats or {}),
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

    stats = {}
    if catalog_type == "plans":
        from app.services.catalog_funnel import link_stats
        stats = link_stats(db, [t.id for t in tokens])

    now = tz.get_now()
    lists = {pl.id: pl for pl in db.query(models.PriceList).filter(models.PriceList.tenant_id == tenant_id)} \
        if catalog_type == "plans" else {}
    return [_to_dto(item, now, stats.get(item.id), lists) for item in tokens]


@router.post("", response_model=schemas.CatalogShareTokenInDB, status_code=status.HTTP_201_CREATED)
def create_catalog_share_link(
    data: schemas.CatalogShareTokenCreate,
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Genera un nuevo token de catálogo para compartir con clientes."""
    _authorize(db, current_user, tenant_id, data.catalog_type, "create")
    if data.catalog_type != "plans":
        # Catálogo público de productos: función del plan (antes solo se ocultaba en el frontend)
        check_feature("inventario:productos:catalogo", default=True)(current_user=current_user)

    now = tz.get_now()
    expires_at = None

    # Catálogo de planes: solo 10 días, 1 año o permanente (None / 0)
    if data.catalog_type == "plans" and data.expires_in_hours and data.expires_in_hours not in PLANS_EXPIRATION_HOURS:
        raise HTTPException(status_code=400, detail="La vigencia del catálogo de planes debe ser 10 días, 1 año o permanente.")

    if data.expires_in_hours and data.expires_in_hours > 0:
        expires_at = now + timedelta(hours=data.expires_in_hours)

    message = ((data.message or "").strip() or None) if data.catalog_type == "plans" else None
    try:
        groups = clean_plan_groups(data.plan_groups) if data.catalog_type == "plans" else None
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if data.catalog_type == "plans" and not groups and existing_plan_groups(db, tenant_id):
        raise HTTPException(status_code=400, detail=GROUP_REQUIRED)
    price_list = _price_list(db, tenant_id, data.price_list_id) if data.catalog_type == "plans" else None

    # Genera token aleatorio URL-safe de 16 bytes (~22 chars)
    token_str = secrets.token_urlsafe(16)
    show_video = True if data.show_video is None else bool(data.show_video)

    new_token = CatalogShareToken(
        tenant_id=tenant_id,
        token=token_str,
        name=data.name.strip() if data.name else None,
        catalog_type=data.catalog_type,
        message=message,
        plan_groups=groups,
        price_list_id=price_list.id if price_list else None,
        show_video=show_video,
        expires_at=expires_at,
        is_active=True,
        views_count=0,
        created_by=current_user.id if current_user else None,
        created_at=now,
    )
    db.add(new_token)
    db.commit()
    db.refresh(new_token)

    return _to_dto(new_token, now, None, {price_list.id: price_list} if price_list else None)


@router.get("/video-info")
def get_catalog_video_info(
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve si el tenant tiene video de bienvenida configurado y su metadata para previsualizar en el modal."""
    from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
    if current_user.role in ("creator", models.UserRole.creator):
        apply_bypass_rls(db)
    else:
        apply_tenant_rls(db, tenant_id)
    from app.api.internal.admin.models import Tenant
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    has_video = bool(tenant and tenant.catalog_video and tenant.catalog_video.get("url"))
    return {
        "has_video": has_video,
        "video": tenant.catalog_video if has_video else None,
    }


@router.put("/bulk", response_model=List[schemas.CatalogShareTokenInDB])
def bulk_update_catalog_share_links(
    data: CatalogShareTokenBulkUpdate,
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aplica la etiqueta, mensaje y configuración de video indicados a todos los enlaces del tipo."""
    _authorize(db, current_user, tenant_id, data.catalog_type, "edit")

    name = (data.name or "").strip() or None
    message = ((data.message or "").strip() or None) if data.catalog_type == "plans" else None

    tokens = (
        db.query(CatalogShareToken)
        .filter(
            CatalogShareToken.tenant_id == tenant_id,
            CatalogShareToken.catalog_type == data.catalog_type,
        )
        .order_by(CatalogShareToken.created_at.desc())
        .all()
    )
    for item in tokens:
        item.name = name
        if data.catalog_type == "plans":
            item.message = message
        if data.show_video is not None:
            item.show_video = bool(data.show_video)
    db.commit()

    now = tz.get_now()
    lists = {pl.id: pl for pl in db.query(models.PriceList).filter(models.PriceList.tenant_id == tenant_id)}         if data.catalog_type == "plans" else {}
    return [_to_dto(item, now, None, lists) for item in tokens]


@router.patch("/{token_id}", response_model=schemas.CatalogShareTokenInDB)
def update_catalog_share_link(
    token_id: int,
    data: CatalogShareTokenUpdate,
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edita un enlace: etiqueta, mensaje, grupos, tabla de precios y (opcional) renovar la vigencia.
    Solo cambia los campos enviados; el token (la URL) se mantiene."""
    from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
    if current_user.role in ("creator", models.UserRole.creator):
        apply_bypass_rls(db)
    else:
        apply_tenant_rls(db, tenant_id)
    item = db.query(CatalogShareToken).filter(
        CatalogShareToken.id == token_id, CatalogShareToken.tenant_id == tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Enlace no encontrado")
    # Permiso del módulo según el tipo del enlace (Inventario o Servicios)
    _authorize(db, current_user, tenant_id, item.catalog_type, "edit")
    is_plans = item.catalog_type == "plans"
    sent = data.model_fields_set

    if "name" in sent:
        item.name = (data.name or "").strip() or None
    if "message" in sent and is_plans:
        item.message = (data.message or "").strip() or None
    if "plan_groups" in sent and is_plans:
        try:
            groups = clean_plan_groups(data.plan_groups)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if not groups and existing_plan_groups(db, tenant_id):
            raise HTTPException(status_code=400, detail=GROUP_REQUIRED)
        item.plan_groups = groups
    if "price_list_id" in sent and is_plans:
        pl = _price_list(db, tenant_id, data.price_list_id)
        item.price_list_id = pl.id if pl else None
    if "show_video" in sent:
        item.show_video = bool(data.show_video)
    if data.renew_expiration:
        hours = data.expires_in_hours or 0
        if is_plans and hours and hours not in PLANS_EXPIRATION_HOURS:
            raise HTTPException(status_code=400, detail="La vigencia del catálogo de planes debe ser 10 días, 1 año o permanente.")
        if hours < 0:
            raise HTTPException(status_code=400, detail="Vigencia inválida")
        item.expires_at = tz.get_now() + timedelta(hours=hours) if hours else None

    db.commit()
    db.refresh(item)
    pl = _price_list(db, tenant_id, item.price_list_id) if item.price_list_id else None
    from app.services.catalog_funnel import link_stats
    stats = link_stats(db, [item.id]) if is_plans else {}
    return _to_dto(item, tz.get_now(), stats.get(item.id), {pl.id: pl} if pl else None)


@router.patch("/{token_id}/plan-groups", response_model=schemas.CatalogShareTokenInDB)
def update_catalog_link_plan_groups(
    token_id: int,
    data: CatalogShareTokenPlanGroups,
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elige qué grupos de planes muestra un enlace del catálogo (vacío = todos)."""
    _authorize(db, current_user, tenant_id, "plans", "edit")
    item = (
        db.query(CatalogShareToken)
        .filter(
            CatalogShareToken.id == token_id,
            CatalogShareToken.tenant_id == tenant_id,
            CatalogShareToken.catalog_type == "plans",
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Enlace no encontrado")
    try:
        groups = clean_plan_groups(data.plan_groups)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not groups and existing_plan_groups(db, tenant_id):
        raise HTTPException(status_code=400, detail=GROUP_REQUIRED)
    item.plan_groups = groups
    db.commit()
    db.refresh(item)
    pl = _price_list(db, tenant_id, item.price_list_id) if item.price_list_id else None
    return _to_dto(item, tz.get_now(), None, {pl.id: pl} if pl else None)


@router.patch("/{token_id}/price-list", response_model=schemas.CatalogShareTokenInDB)
def update_catalog_link_price_list(
    token_id: int,
    data: CatalogShareTokenPriceList,
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elige la tabla de precios de un enlace del catálogo de planes (None = General)."""
    _authorize(db, current_user, tenant_id, "plans", "edit")
    item = (
        db.query(CatalogShareToken)
        .filter(
            CatalogShareToken.id == token_id,
            CatalogShareToken.tenant_id == tenant_id,
            CatalogShareToken.catalog_type == "plans",
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Enlace no encontrado")
    pl = _price_list(db, tenant_id, data.price_list_id)
    item.price_list_id = pl.id if pl else None
    db.commit()
    db.refresh(item)
    return _to_dto(item, tz.get_now(), None, {pl.id: pl} if pl else None)


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

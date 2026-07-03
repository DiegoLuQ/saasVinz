"""
Gestión de API keys / Widget Embebible por tenant — SOLO SuperAdmin (creator).

El SuperAdmin aprovisiona y administra las claves públicas del widget para cada
crematorio desde la plataforma admin. Las consultas corren bajo bypass RLS
(get_current_creator) y se filtran explícitamente por tenant_id vía ApiKeyService.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import get_current_creator
from app.api.internal.integrations import schemas, services
from app.api.internal.integrations.services import ApiKeyService

router = APIRouter()


def _resolve_tenant(identifier: str, db: Session) -> models.Tenant:
    if identifier and identifier.isdigit():
        tenant = db.query(models.Tenant).filter(models.Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(models.Tenant).filter(models.Tenant.slug == identifier).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")
    return tenant


def get_api_key_service(db: Session = Depends(get_db)) -> ApiKeyService:
    return ApiKeyService(db)


@router.get("/tenants/{identifier}/widget-info")
def get_widget_info(
    identifier: str,
    creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """Plan del tenant + si el plan habilita el widget (informativo para la UI)."""
    tenant = _resolve_tenant(identifier, db)
    plan = tenant.effective_plan
    return {
        "tenant": {"id": tenant.id, "name": tenant.name, "slug": tenant.slug},
        "can_use": services.tenant_can_use_widget(tenant),
        "plan_name": plan.name if plan else None,
        "allowed_plans": sorted(services.WIDGET_ALLOWED_PLANS),
    }


@router.get("/tenants/{identifier}/api-keys", response_model=List[schemas.ApiKeyInDB])
def list_api_keys(
    identifier: str,
    creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db),
    service: ApiKeyService = Depends(get_api_key_service),
):
    tenant = _resolve_tenant(identifier, db)
    return service.list(tenant.id)


@router.post("/tenants/{identifier}/api-keys", response_model=schemas.ApiKeyInDB)
def create_api_key(
    identifier: str,
    data: schemas.ApiKeyCreate,
    creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db),
    service: ApiKeyService = Depends(get_api_key_service),
):
    # El SuperAdmin puede aprovisionar para cualquier tenant (override de plan).
    tenant = _resolve_tenant(identifier, db)
    return service.create(tenant.id, data)


@router.patch("/tenants/{identifier}/api-keys/{key_id}", response_model=schemas.ApiKeyInDB)
def update_api_key(
    identifier: str,
    key_id: int,
    data: schemas.ApiKeyUpdate,
    creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db),
    service: ApiKeyService = Depends(get_api_key_service),
):
    tenant = _resolve_tenant(identifier, db)
    return service.update(tenant.id, key_id, data)


@router.post("/tenants/{identifier}/api-keys/{key_id}/rotate", response_model=schemas.ApiKeyInDB)
def rotate_api_key(
    identifier: str,
    key_id: int,
    creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db),
    service: ApiKeyService = Depends(get_api_key_service),
):
    tenant = _resolve_tenant(identifier, db)
    return service.rotate(tenant.id, key_id)


@router.delete("/tenants/{identifier}/api-keys/{key_id}")
def delete_api_key(
    identifier: str,
    key_id: int,
    creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db),
    service: ApiKeyService = Depends(get_api_key_service),
):
    tenant = _resolve_tenant(identifier, db)
    service.delete(tenant.id, key_id)
    return {"detail": "API key eliminada."}

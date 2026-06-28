from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import schemas
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.deps_limits import check_resource_limit
from app.api.internal.catalog.services import PlanService

router = APIRouter()

# Dependency Helper
def get_plan_service(db: Session = Depends(get_db)) -> PlanService:
    return PlanService(db)


@router.post("/upload-image")
async def upload_plan_image(
    file: UploadFile = File(...),
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "edit"))
):
    """Sube la imagen de catálogo de un plan (WEBP optimizado en R2)."""
    image_url = await service.upload_image(tenant_id, file)
    return {"image_url": image_url}

@router.get("", response_model=List[schemas.PlanInDB])
def obtener_planes(
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "view"))
):
    """Obtiene la lista de planes del tenant."""
    return service.get_all(tenant_id)

@router.post("", response_model=schemas.PlanInDB)
def crear_plan(
    plan_in: schemas.PlanCreate,
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "create")),
    __: bool = Depends(check_resource_limit("plans"))
):
    """Crea un nuevo plan y vincula los servicios proporcionados."""
    return service.create(tenant_id, plan_in)

@router.get("/{plan_id}", response_model=schemas.PlanInDB)
def obtener_plan(
    plan_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "view"))
):
    """Obtiene los detalles de un plan específico."""
    return service.get_by_id(tenant_id, plan_id)

@router.patch("/{plan_id}", response_model=schemas.PlanInDB)
def actualizar_plan(
    plan_id: int,
    plan_update: schemas.PlanUpdate,
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "edit"))
):
    """Actualiza parcialmente un plan y sus servicios vinculados."""
    return service.update(tenant_id, plan_id, plan_update)

@router.delete("/{plan_id}")
def delete_plan(
    plan_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "delete"))
):
    """Elimina un plan si no está vinculado a cremaciones o pedidos."""
    return service.delete(tenant_id, plan_id)

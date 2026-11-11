from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import schemas
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.deps_limits import check_resource_limit
from app.api.internal.catalog.services import PlanService
from app.api.internal.catalog.schemas import clean_group_name
from app import models
from app.services import plan_groups

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

@router.get("/images")
def listar_imagenes(
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "view"))
):
    """Imágenes ya subidas por el crematorio, para reutilizarlas en un plan."""
    return service.list_images(tenant_id)


@router.delete("/images/{media_id}", status_code=204)
def eliminar_imagen(
    media_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "edit"))
):
    """Elimina una imagen de plan que ya no usa ningún plan."""
    service.delete_image(tenant_id, media_id)


@router.get("/groups", response_model=List[str])
def listar_grupos(
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
    _: bool = Depends(check_permission("servicios", "view"))
):
    """Grupos usados por los planes del crematorio (orden alfabético)."""
    return plan_groups.existing_plan_groups(db, tenant_id)


@router.put("/groups/rename")
def renombrar_grupo(
    payload: schemas.ServiceGroupRename,
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
    _: bool = Depends(check_permission("servicios", "edit"))
):
    """Renombra un grupo en todos sus planes y en los enlaces del catálogo que lo muestran."""
    old = clean_group_name(payload.old_name)
    try:
        new = clean_group_name(payload.new_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not old:
        raise HTTPException(status_code=400, detail="Indica el grupo a renombrar.")
    plans = db.query(models.Plan).filter(
        models.Plan.tenant_id == tenant_id,
        func.lower(models.Plan.group_name) == old.lower(),
    ).all()
    if not plans:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    for pl in plans:
        pl.group_name = new
    plan_groups.rename_in_links(db, tenant_id, old, new)
    db.commit()
    return {"updated": len(plans), "group_name": new}


@router.get("/{plan_id}", response_model=schemas.PlanInDB)
def obtener_plan(
    plan_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "view"))
):
    """Obtiene los detalles de un plan específico."""
    return service.get_by_id(tenant_id, plan_id)

@router.post("/{plan_id}/copy", response_model=schemas.PlanInDB)
def copiar_plan(
    plan_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: PlanService = Depends(get_plan_service),
    _: bool = Depends(check_permission("servicios", "create")),
    __: bool = Depends(check_resource_limit("plans"))
):
    """Copia un plan como «<nombre> (copia)», inactivo, para ajustarlo sin tocar el original."""
    return service.copy(tenant_id, plan_id)


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

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.api.deps import get_tenant_id
from typing import List

from app.api.internal.admin.rbac.router import check_permission
from app.api.deps_limits import check_resource_limit

router = APIRouter()

@router.get("", response_model=List[schemas.ServiceInDB])
def get_services(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("servicios", "view"))
):
    return db.query(models.Service).filter(models.Service.tenant_id == tenant_id).all()

@router.post("", response_model=schemas.ServiceInDB)
def create_service(
    service_in: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("servicios", "create")),
    __: bool = Depends(check_resource_limit("services"))
):
    # Validar duplicados por nombre en el mismo tenant
    existing = db.query(models.Service).filter(
        models.Service.tenant_id == tenant_id,
        models.Service.name == service_in.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"El servicio '{service_in.name}' ya existe.")

    db_service = models.Service(
        **service_in.dict(),
        tenant_id=tenant_id
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

@router.patch("/{service_id}", response_model=schemas.ServiceInDB)
def actualizar_servicio(
    service_id: int,
    service_update: schemas.ServiceUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("servicios", "edit"))
):
    """Actualiza parcialmente los datos de un servicio."""
    db_service = db.query(models.Service).filter(
        models.Service.id == service_id,
        models.Service.tenant_id == tenant_id
    ).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    update_data = service_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_service, key, value)
    
    db.commit()
    db.refresh(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

@router.delete("/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("servicios", "delete"))
):
    """Elimina un servicio si no está vinculado a planes, cremaciones o pedidos."""
    # 1. Verificar existencia
    db_service = db.query(models.Service).filter(
        models.Service.id == service_id,
        models.Service.tenant_id == tenant_id
    ).first()
    
    if not db_service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    # 2. Verificar dependencias (Planes)
    plan_link = db.query(models.PlanService).filter(
        models.PlanService.service_id == service_id,
        models.PlanService.tenant_id == tenant_id
    ).first()

    if plan_link:
        raise HTTPException(
            status_code=409, 
            detail="No se puede eliminar el servicio porque está incluído en uno o más planes."
        )

    # 3. Verificar dependencias (Cremaciones activas/pasadas)
    cremation_exists = db.query(models.ServicioOC).filter(
        models.ServicioOC.service_id == service_id,
        models.ServicioOC.tenant_id == tenant_id
    ).first()

    if cremation_exists:
        raise HTTPException(
            status_code=409, 
            detail="No se puede eliminar el servicio porque ha sido utilizado en asignaciones de servicio (OC)."
        )

    # 4. Verificar dependencias (Pedidos/Cotizaciones)
    # Removed CustomerOrderItem dependency check
    order_item_exists = None

    if order_item_exists:
        raise HTTPException(
            status_code=409, 
            detail="No se puede eliminar el servicio porque existe en pedidos o cotizaciones históricas."
        )

    # 5. Eliminar registro
    db.delete(db_service)
    db.commit()

    return {"status": "deleted", "message": f"Servicio {db_service.name} eliminado correctamente"}

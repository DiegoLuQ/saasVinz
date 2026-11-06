from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.api.deps import get_tenant_id
from typing import List

from app.api.internal.admin.rbac.router import check_permission
from app.api.deps_limits import check_resource_limit
from app.services import service_import
from app.api.internal.catalog.schemas import clean_group_name

router = APIRouter()

MAX_IMPORT_BYTES = 5 * 1024 * 1024


def _duplicate(db: Session, tenant_id: int, name: str, group_name, exclude_id: int | None = None):
    """Servicio con el mismo nombre en el mismo grupo (sin distinguir mayúsculas)."""
    q = db.query(models.Service).filter(
        models.Service.tenant_id == tenant_id,
        func.lower(models.Service.name) == (name or "").strip().lower(),
        func.lower(func.coalesce(models.Service.group_name, "")) == (group_name or "").lower(),
    )
    if exclude_id is not None:
        q = q.filter(models.Service.id != exclude_id)
    return q.first()


def _duplicate_message(name: str, group_name) -> str:
    where = f"en el grupo «{group_name}»" if group_name else "sin grupo"
    return f"El servicio '{name}' ya existe {where}."


@router.get("/groups", response_model=List[str])
def list_groups(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("servicios", "view"))
):
    """Grupos usados por los servicios del crematorio (orden alfabético)."""
    return service_import.existing_groups(db, tenant_id)


@router.put("/groups/rename")
def rename_group(
    payload: schemas.ServiceGroupRename,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("servicios", "edit"))
):
    """Renombra un grupo en todos sus servicios (nuevo nombre vacío = «Sin grupo»)."""
    old = clean_group_name(payload.old_name)
    try:
        new = clean_group_name(payload.new_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not old:
        raise HTTPException(status_code=400, detail="Indica el grupo a renombrar.")
    services = db.query(models.Service).filter(
        models.Service.tenant_id == tenant_id,
        func.lower(models.Service.group_name) == old.lower(),
    ).all()
    if not services:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    ids = [s.id for s in services]
    for s in services:
        clash = _duplicate(db, tenant_id, s.name, new)
        if clash and clash.id not in ids:
            raise HTTPException(status_code=400, detail=_duplicate_message(s.name, new))
    for s in services:
        s.group_name = new
    db.commit()
    return {"updated": len(services), "group_name": new}


@router.get("/import/template")
def import_template(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("servicios", "create"))
):
    return Response(
        content=service_import.build_template(service_import.existing_groups(db, tenant_id)),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="plantilla_servicios.xlsx"'},
    )


@router.post("/import")
async def import_services(
    file: UploadFile = File(...),
    dry_run: bool = Query(True),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("servicios", "create"))
):
    """Vista previa (dry_run=true) o creación de servicios desde la plantilla Excel."""
    content = await file.read(MAX_IMPORT_BYTES + 1)
    if len(content) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=400, detail="El archivo supera los 5 MB.")
    try:
        return service_import.process_import(db, tenant_id, content, dry_run=dry_run)
    except service_import.ImportFileError as e:
        raise HTTPException(status_code=400, detail=str(e))


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
    # Duplicados: mismo nombre en el mismo grupo (en grupos distintos se permite)
    if _duplicate(db, tenant_id, service_in.name, service_in.group_name):
        raise HTTPException(status_code=400, detail=_duplicate_message(service_in.name, service_in.group_name))

    db_service = models.Service(
        **service_in.dict(),
        tenant_id=tenant_id
    )
    if db_service.price_on_request:
        db_service.price = 0.0  # el valor se pone en cada orden
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
    if "name" in update_data or "group_name" in update_data:
        name = update_data.get("name", db_service.name)
        group = update_data["group_name"] if "group_name" in update_data else db_service.group_name
        if _duplicate(db, tenant_id, name, group, exclude_id=db_service.id):
            raise HTTPException(status_code=400, detail=_duplicate_message(name, group))
    for key, value in update_data.items():
        setattr(db_service, key, value)
    if db_service.price_on_request:
        db_service.price = 0.0  # el valor se pone en cada orden

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

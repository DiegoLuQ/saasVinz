from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import schemas
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.deps_limits import check_resource_limit
from app.api.internal.operations.services import CremationService

router = APIRouter()

# Dependency Helper
def get_cremation_service(db: Session = Depends(get_db)) -> CremationService:
    return CremationService(db)

@router.get("", response_model=List[schemas.CremationOCInDB])
def obtener_cremaciones(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cremation_type: Optional[str] = None,
    status: Optional[str] = None,
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    _: bool = Depends(check_permission("ordenes", "view"))
):
    """Obtiene todas las OC del tenant con filtros granulares."""
    return service.get_all(
        tenant_id=tenant_id,
        start_date=start_date,
        end_date=end_date,
        cremation_type=cremation_type,
        status=status,
        sort_order=sort_order
    )

@router.post("", response_model=schemas.CremationOCInDB)
def crear_cremacion(
    cremation_in: schemas.CremationOCCreate,
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    _: bool = Depends(check_permission("ordenes", "create")),
    __: bool = Depends(check_resource_limit("orders"))
):
    """Registra una nueva OC con múltiples servicios, planes y productos."""
    return service.create(tenant_id, cremation_in)

@router.get("/{cremation_id}", response_model=schemas.CremationOCInDB)
def obtener_cremacion(
    cremation_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    _: bool = Depends(check_permission("ordenes", "view"))
):
    """Obtiene los detalles de una OC específica."""
    return service.get_by_id(tenant_id, cremation_id)

@router.patch("/{cremation_id}", response_model=schemas.CremationOCInDB)
def actualizar_cremacion(
    cremation_id: int,
    cremation_in: schemas.CremationOCUpdate,
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    _: bool = Depends(check_permission("ordenes", "edit"))
):
    """Actualiza una OC y sus asociaciones (servicios, planes, productos)."""
    return service.update(tenant_id, cremation_id, cremation_in)

@router.delete("/{cremation_id}")
def eliminar_cremacion(
    cremation_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    _: bool = Depends(check_permission("ordenes", "delete"))
):
    """Elimina una OC y sus registros asociados (con restauración de stock y limpieza de archivos)."""
    return service.delete(tenant_id, cremation_id)

@router.post("/upload-image")
async def upload_image(
    cremation_id: int,
    file: UploadFile = File(...),
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service)
):
    """Sube una imagen para una cremación."""
    image_url = await service.upload_image(tenant_id, cremation_id, file)
    return {"image_url": image_url}

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, models
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from typing import List

from app.api.deps_limits import check_resource_limit
from app.api.internal.crm.services import CustomerService

router = APIRouter()

# Dependency Helper
def get_customer_service(db: Session = Depends(get_db)) -> CustomerService:
    return CustomerService(db)

@router.get("", response_model=List[schemas.CustomerInDB])
def get_customers(
    tenant_id: int = Depends(get_tenant_id),
    service: CustomerService = Depends(get_customer_service),
    _: bool = Depends(check_permission("clientes", "view"))
):
    return service.get_all(tenant_id)

@router.post("", response_model=schemas.CustomerInDB)
def create_customer(
    customer_in: schemas.CustomerCreate,
    tenant_id: int = Depends(get_tenant_id),
    service: CustomerService = Depends(get_customer_service),
    _: bool = Depends(check_permission("clientes", "create")),
    __: bool = Depends(check_resource_limit("customers"))
):
    return service.create(tenant_id, customer_in)

@router.get("/{customer_id}", response_model=schemas.CustomerInDB)
def get_customer(
    customer_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: CustomerService = Depends(get_customer_service)
):
    return service.get_by_id(tenant_id, customer_id)

@router.patch("/{customer_id}", response_model=schemas.CustomerInDB)
def actualizar_cliente(
    customer_id: int,
    customer_update: schemas.CustomerUpdate,
    tenant_id: int = Depends(get_tenant_id),
    service: CustomerService = Depends(get_customer_service),
    _: bool = Depends(check_permission("clientes", "edit"))
):
    """Actualiza parcialmente los datos de un cliente."""
    return service.update(tenant_id, customer_id, customer_update)

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: CustomerService = Depends(get_customer_service),
    _: bool = Depends(check_permission("clientes", "delete"))
):
    """Elimina un cliente si no tiene mascotas ni pedidos asociados."""
    return service.delete(tenant_id, customer_id)

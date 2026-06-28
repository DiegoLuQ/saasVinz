from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import schemas
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.deps_limits import check_resource_limit
from app.api.internal.catalog.services import CategoryService, ProviderService, ProductService

router = APIRouter()

# Dependency Helpers
def get_category_service(db: Session = Depends(get_db)) -> CategoryService:
    return CategoryService(db)

def get_provider_service(db: Session = Depends(get_db)) -> ProviderService:
    return ProviderService(db)

def get_product_service(db: Session = Depends(get_db)) -> ProductService:
    return ProductService(db)

# --- Categories ---
@router.get("/categories", response_model=List[schemas.CategoryInDB])
def get_categories(
    tenant_id: int = Depends(get_tenant_id),
    service: CategoryService = Depends(get_category_service),
    _: bool = Depends(check_permission("inventario", "view"))
):
    return service.get_all(tenant_id)

@router.post("/categories", response_model=schemas.CategoryInDB)
def create_category(
    category: schemas.CategoryCreate, 
    tenant_id: int = Depends(get_tenant_id),
    service: CategoryService = Depends(get_category_service),
    _: bool = Depends(check_permission("inventario", "create"))
):
    return service.create(tenant_id, category)

@router.patch("/categories/{category_id}", response_model=schemas.CategoryInDB)
def update_category(
    category_id: int, 
    category_update: schemas.CategoryUpdate, 
    tenant_id: int = Depends(get_tenant_id),
    service: CategoryService = Depends(get_category_service),
    _: bool = Depends(check_permission("inventario", "edit"))
):
    return service.update(tenant_id, category_id, category_update)

@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int, 
    tenant_id: int = Depends(get_tenant_id),
    service: CategoryService = Depends(get_category_service),
    _: bool = Depends(check_permission("inventario", "delete"))
):
    return service.delete(tenant_id, category_id)


# --- Providers ---
@router.get("/providers", response_model=List[schemas.ProviderInDB])
def get_providers(
    tenant_id: int = Depends(get_tenant_id),
    service: ProviderService = Depends(get_provider_service),
    _: bool = Depends(check_permission("inventario", "view"))
):
    return service.get_all(tenant_id)

@router.post("/providers", response_model=schemas.ProviderInDB)
def create_provider(
    provider: schemas.ProviderCreate, 
    tenant_id: int = Depends(get_tenant_id),
    service: ProviderService = Depends(get_provider_service),
    _: bool = Depends(check_permission("inventario", "create"))
):
    return service.create(tenant_id, provider)

@router.patch("/providers/{provider_id}", response_model=schemas.ProviderInDB)
def update_provider(
    provider_id: int, 
    provider_update: schemas.ProviderUpdate, 
    tenant_id: int = Depends(get_tenant_id),
    service: ProviderService = Depends(get_provider_service),
    _: bool = Depends(check_permission("inventario", "edit"))
):
    return service.update(tenant_id, provider_id, provider_update)

@router.delete("/providers/{provider_id}")
def delete_provider(
    provider_id: int, 
    tenant_id: int = Depends(get_tenant_id),
    service: ProviderService = Depends(get_provider_service),
    _: bool = Depends(check_permission("inventario", "delete"))
):
    return service.delete(tenant_id, provider_id)


# --- Products ---
@router.get("", response_model=List[schemas.ProductInDB])
def get_products(
    tenant_id: int = Depends(get_tenant_id),
    service: ProductService = Depends(get_product_service),
    _: bool = Depends(check_permission("inventario", "view"))
):
    return service.get_all(tenant_id)

@router.post("", response_model=schemas.ProductInDB)
def create_product(
    product: schemas.ProductCreate, 
    tenant_id: int = Depends(get_tenant_id),
    service: ProductService = Depends(get_product_service),
    _: bool = Depends(check_permission("inventario", "create")),
    __: bool = Depends(check_resource_limit("products"))
):
    return service.create(tenant_id, product)

@router.patch("/{product_id}", response_model=schemas.ProductInDB)
def update_product(
    product_id: int, 
    product_update: schemas.ProductUpdate, 
    tenant_id: int = Depends(get_tenant_id),
    service: ProductService = Depends(get_product_service),
    _: bool = Depends(check_permission("inventario", "edit"))
):
    return service.update(tenant_id, product_id, product_update)

@router.delete("/{product_id}")
def delete_product(
    product_id: int, 
    tenant_id: int = Depends(get_tenant_id),
    service: ProductService = Depends(get_product_service),
    _: bool = Depends(check_permission("inventario", "delete"))
):
    return service.delete(tenant_id, product_id)

@router.post("/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    tenant_id: int = Depends(get_tenant_id),
    service: ProductService = Depends(get_product_service),
    _: bool = Depends(check_permission("inventario", "edit"))
):
    image_url = await service.upload_image(tenant_id, file)
    return {"image_url": image_url}

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime


def _empty_fk_to_none(v):
    """Normaliza FKs opcionales: 0 / '0' / '' (sin selección en el front) -> None."""
    if v in (0, "0", ""):
        return None
    return v

# ==========================================
# Catalog Schemas (Products, Services, Plans)
# ==========================================

# Categorías
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CategoryInDB(CategoryBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Proveedores
class ProviderBase(BaseModel):
    name: str
    rut: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class ProviderCreate(ProviderBase):
    pass

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    rut: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class ProviderInDB(ProviderBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Servicios
class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    cost: float = 0.0
    is_active: bool = True

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    is_active: Optional[bool] = None

class ServiceInDB(ServiceBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Productos
class ProductBase(BaseModel):
    code: str
    name: str
    category_id: Optional[int] = None
    provider_id: Optional[int] = None
    cost_price: float
    sale_price: float
    stock: int
    description: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = []
    availability_status: str = "Disponible"
    is_active: bool = True

    _normalize_fks = field_validator("category_id", "provider_id", mode="before")(_empty_fk_to_none)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category_id: Optional[int] = None
    provider_id: Optional[int] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    stock: Optional[int] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    availability_status: Optional[str] = None
    is_active: Optional[bool] = None

    _normalize_fks = field_validator("category_id", "provider_id", mode="before")(_empty_fk_to_none)

class ProductInDB(ProductBase):
    id: int
    tenant_id: int
    category: Optional[CategoryInDB] = None
    provider: Optional[ProviderInDB] = None
    created_at: datetime
    model_config = {"from_attributes": True}

# Planes
class PlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    cost: float = 0.0
    image_url: Optional[str] = None
    is_active: bool = True

class PlanCreate(PlanBase):
    service_ids: List[int] = [] # IDs de servicios a vincular
    product_ids: List[int] = [] # IDs de productos a vincular

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    service_ids: Optional[List[int]] = None
    product_ids: Optional[List[int]] = None

class PlanInDB(PlanBase):
    id: int
    tenant_id: int
    services: List[ServiceInDB] = []
    products: List[ProductInDB] = []
    created_at: datetime
    model_config = {"from_attributes": True}

# Precios por Peso (Weight Pricing)
class WeightPricingBase(BaseModel):
    min_weight: float
    max_weight: float
    price: float

class WeightPricingCreate(WeightPricingBase):
    pass

class WeightPricingInDB(WeightPricingBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal, Optional, List
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
    # Presentación en el catálogo público
    is_featured: bool = False
    price_label: Optional[str] = Field(None, max_length=60)
    important_note: Optional[str] = Field(None, max_length=200)
    sort_order: int = 0

class PlanCreate(PlanBase):
    service_ids: List[int] = [] # IDs de servicios a vincular (el orden de la lista es el orden en el catálogo)
    product_ids: List[int] = [] # IDs de productos a vincular
    optional_service_ids: List[int] = [] # Subconjunto de service_ids que son extras opcionales

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    price_label: Optional[str] = Field(None, max_length=60)
    important_note: Optional[str] = Field(None, max_length=200)
    sort_order: Optional[int] = None
    service_ids: Optional[List[int]] = None
    product_ids: Optional[List[int]] = None
    optional_service_ids: Optional[List[int]] = None

class PlanInDB(PlanBase):
    id: int
    tenant_id: int
    services: List[ServiceInDB] = []
    products: List[ProductInDB] = []
    optional_service_ids: List[int] = []
    created_at: datetime
    model_config = {"from_attributes": True}

# Precios por Peso (Weight Pricing)
class WeightPricingBase(BaseModel):
    label: Optional[str] = None
    min_weight: Optional[float] = 0
    max_weight: Optional[float] = None  # None = tramo abierto ("X kg o más")
    price: Optional[float] = 0

class WeightPricingCreate(BaseModel):
    """Un tramo al guardar la tabla completa: rango "desde – hasta" escrito
    por el crematorio. Sin min_weight se usa el máximo del tramo anterior."""
    label: Optional[str] = Field(default=None, max_length=40)
    min_weight: Optional[float] = None
    max_weight: Optional[float] = None
    price: float = Field(default=0, ge=0)

class WeightPricingReplace(BaseModel):
    tiers: List[WeightPricingCreate] = Field(default_factory=list)

class WeightPricingInDB(WeightPricingBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Tokens de Compartir Catálogo Online
CatalogType = Literal["products", "plans"]
CATALOG_MESSAGE_MAX = 300  # mensaje del catálogo de planes

class CatalogShareTokenCreate(BaseModel):
    name: Optional[str] = None
    expires_in_hours: Optional[int] = None # None o 0 = permanente
    catalog_type: CatalogType = "products"
    # Solo catálogo de planes: mensaje visible para la familia
    message: Optional[str] = Field(default=None, max_length=CATALOG_MESSAGE_MAX)

class CatalogShareTokenInDB(BaseModel):
    id: int
    tenant_id: int
    token: str
    name: Optional[str] = None
    catalog_type: CatalogType = "products"
    message: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: bool
    views_count: int = 0
    last_viewed_at: Optional[datetime] = None
    created_at: datetime
    is_expired: bool = False
    full_url: Optional[str] = None

    model_config = {"from_attributes": True}

class PublicCatalogProduct(BaseModel):
    id: int
    code: str
    name: str
    sale_price: float
    discount_percentage: Optional[float] = 0
    stock: int
    availability_status: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = []
    category_name: Optional[str] = None

class PublicCatalogPlanItem(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_optional: bool = False

class PublicCatalogPlan(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    price_label: Optional[str] = None
    important_note: Optional[str] = None
    is_featured: bool = False
    image_url: Optional[str] = None  # portada del plan
    services: List[PublicCatalogPlanItem] = []
    products: List[PublicCatalogPlanItem] = []

class PublicCatalogResponse(BaseModel):
    catalog_type: CatalogType = "products"
    is_expired: bool = False
    tenant_name: str
    tenant_slug: str
    tenant_logo: Optional[str] = None
    tenant_phone: Optional[str] = None
    tenant_email: Optional[str] = None
    tenant_address: Optional[str] = None
    tenant_city: Optional[str] = None
    tenant_social: Optional[dict] = None  # solo redes públicas (instagram, facebook, tiktok, website)
    catalog_tagline: Optional[str] = None
    catalog_intro: Optional[str] = None
    catalog_message: Optional[str] = None  # mensaje del enlace (catálogo de planes)
    whatsapp: Optional[str] = None
    expires_at: Optional[datetime] = None
    products: List[PublicCatalogProduct] = []
    plans: List[PublicCatalogPlan] = []
    # Tramos de peso del crematorio para el selector de tamaño (precio solo si
    # el crematorio habilitó mostrarlo; ver app/services/public_form_config.py)
    weight_tiers: List[dict] = []


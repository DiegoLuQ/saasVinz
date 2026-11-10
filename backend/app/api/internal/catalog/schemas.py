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
MAX_GROUP_NAME = 60


def clean_group_name(value):
    """Grupo de servicio: espacios normalizados, vacío = None, máximo 60 caracteres."""
    if value is None:
        return None
    text = " ".join(str(value).split())
    if not text:
        return None
    if len(text) > MAX_GROUP_NAME:
        raise ValueError(f"El grupo admite como máximo {MAX_GROUP_NAME} caracteres")
    return text


class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    cost: float = 0.0
    is_active: bool = True
    is_special: bool = False
    show_in_form: bool = True
    group_name: Optional[str] = None
    price_on_request: bool = False
    important_note: Optional[str] = Field(None, max_length=300)
    image_url: Optional[str] = Field(None, max_length=500)

    _clean_group = field_validator("group_name", mode="before")(clean_group_name)
    _clean_note = field_validator("important_note", mode="before")(lambda v: (str(v).strip() or None) if v is not None else None)

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    is_active: Optional[bool] = None
    is_special: Optional[bool] = None
    show_in_form: Optional[bool] = None
    group_name: Optional[str] = None
    price_on_request: Optional[bool] = None
    important_note: Optional[str] = Field(None, max_length=300)
    image_url: Optional[str] = Field(None, max_length=500)

    _clean_note = field_validator("important_note", mode="before")(lambda v: (str(v).strip() or None) if v is not None else None)

    _clean_group = field_validator("group_name", mode="before")(clean_group_name)

class ServiceGroupRename(BaseModel):
    old_name: str
    new_name: Optional[str] = None  # vacío = quitar el grupo («Sin grupo»)

class ServiceInDB(ServiceBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Productos
class ProductBase(BaseModel):
    code: str = ""  # vacío = se genera (P-0001…)
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
    note: Optional[str] = Field(None, max_length=300)
    made_to_order: bool = False
    is_special: bool = False
    badge: Optional[str] = Field(None, max_length=24)
    show_purchases: bool = True
    is_active: bool = True

    _clean_badge = field_validator("badge", mode="before")(lambda v: (str(v).strip()[:24] or None) if v is not None else None)
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
    note: Optional[str] = Field(None, max_length=300)
    made_to_order: Optional[bool] = None
    is_special: Optional[bool] = None
    badge: Optional[str] = Field(None, max_length=24)
    show_purchases: Optional[bool] = None
    is_active: Optional[bool] = None

    _clean_badge = field_validator("badge", mode="before")(lambda v: (str(v).strip()[:24] or None) if v is not None else None)
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
    group_name: Optional[str] = None
    max_weight: Optional[float] = Field(None, gt=0, le=500)  # kg; None = sin límite
    is_priority: bool = False  # sus órdenes van primero en el Panel de Trabajo

    _clean_group = field_validator("group_name", mode="before")(clean_group_name)

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
    group_name: Optional[str] = None
    max_weight: Optional[float] = Field(None, gt=0, le=500)  # null = sin límite
    is_priority: Optional[bool] = None
    service_ids: Optional[List[int]] = None
    product_ids: Optional[List[int]] = None
    optional_service_ids: Optional[List[int]] = None

    _clean_group = field_validator("group_name", mode="before")(clean_group_name)

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
    icon_url: Optional[str] = None
    examples: Optional[str] = None

class WeightPricingCreate(BaseModel):
    """Un tramo al guardar la tabla completa: rango "desde – hasta" escrito
    por el crematorio. Sin min_weight se usa el máximo del tramo anterior."""
    label: Optional[str] = Field(default=None, max_length=40)
    min_weight: Optional[float] = None
    max_weight: Optional[float] = None
    price: float = Field(default=0, ge=0)
    icon_url: Optional[str] = Field(default=None, max_length=500)
    examples: Optional[str] = Field(default=None, max_length=60)

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
    # Solo catálogo de planes: grupos que muestra (None = todos; "" = «Sin grupo»)
    plan_groups: Optional[List[str]] = None
    # Solo catálogo de planes: tabla de precios (None = General)
    price_list_id: Optional[int] = None
    # Visualizar video de bienvenida en el catálogo
    show_video: Optional[bool] = True

class CatalogShareTokenPlanGroups(BaseModel):
    plan_groups: Optional[List[str]] = None

class CatalogShareTokenPriceList(BaseModel):
    price_list_id: Optional[int] = None  # None = General

class CatalogShareTokenUpdate(BaseModel):
    """Editar un enlace: los campos enviados se cambian (vacío = quitar etiqueta/mensaje).
    `expires_in_hours` solo se aplica con `renew_expiration` (cuenta desde ahora; None/0 = permanente)."""
    name: Optional[str] = Field(default=None, max_length=100)
    message: Optional[str] = Field(default=None, max_length=CATALOG_MESSAGE_MAX)
    plan_groups: Optional[List[str]] = None
    price_list_id: Optional[int] = None
    show_video: Optional[bool] = None
    renew_expiration: bool = False
    expires_in_hours: Optional[int] = None

class CatalogShareTokenBulkUpdate(BaseModel):
    """Aplica la misma etiqueta y mensaje a todos los enlaces de un tipo (vacío = quitar)."""
    catalog_type: CatalogType = "products"
    name: Optional[str] = Field(default=None, max_length=100)
    message: Optional[str] = Field(default=None, max_length=CATALOG_MESSAGE_MAX)
    show_video: Optional[bool] = None

class CatalogShareTokenInDB(BaseModel):
    id: int
    tenant_id: int
    token: str
    name: Optional[str] = None
    catalog_type: CatalogType = "products"
    message: Optional[str] = None
    plan_groups: Optional[List[str]] = None
    price_list_id: Optional[int] = None
    show_video: bool = True
    price_list_name: Optional[str] = None
    price_list_status: Optional[str] = None  # activa | programada | vencida | pausada
    expires_at: Optional[datetime] = None
    is_active: bool
    views_count: int = 0
    last_viewed_at: Optional[datetime] = None
    created_at: datetime
    is_expired: bool = False
    full_url: Optional[str] = None
    # Embudo del catálogo de planes (desde que existe; services/catalog_funnel.py)
    visitors: int = 0
    plan_requests: int = 0
    whatsapp_clicks: int = 0
    forms_submitted: int = 0
    orders: int = 0
    delivered: int = 0

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
    note: Optional[str] = None
    made_to_order: bool = False
    badge: Optional[str] = None
    times_purchased: Optional[int] = None  # unidades en órdenes no canceladas; None = el crematorio no lo muestra
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
    # Precio por tramo {"<id tramo>": precio} (modo «precio por plan y peso»)
    weight_prices: Optional[dict] = None
    max_weight: Optional[float] = None  # kg; el catálogo lo oculta en tamaños mayores
    services: List[PublicCatalogPlanItem] = []
    products: List[PublicCatalogPlanItem] = []

class PublicCatalogResponse(BaseModel):
    catalog_type: CatalogType = "products"
    show_vinzer_brand: bool = True  # «Potenciado por vinzer.cl» en el pie (marca blanca = False)
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
    show_plan_request: bool = True  # catálogo de planes: botón «Solicitar este plan»
    # Catálogo de productos abierto con ?ref= (enlace de seguimiento / correo):
    # {pet_name, can_request}. None = sin orden (compra externa).
    order_ref: Optional[dict] = None
    # Video de bienvenida del catálogo ({source, url, duration, button_text})
    catalog_video: Optional[dict] = None


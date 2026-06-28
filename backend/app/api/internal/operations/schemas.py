from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime
from app.api.internal.crm.schemas import PetInDB
from app.api.internal.catalog.schemas import ProductInDB, ServiceInDB, PlanInDB
from app.api.internal.partners.schemas import PartnerLinkResponse

# ==========================================
# Operations Schemas (Cremations, Orders, Logistics)
# ==========================================

# Esquemas de Orden de Cremación (OC)

class ProductoOCBase(BaseModel):
    product_id: int
    cantidad: int = Field(..., alias="quantity")
    precio_costo: float = 0.0
    precio_venta: float = Field(..., alias="unit_price")
    
    # Permitir tanto el alias como el nombre original
    model_config = {"populate_by_name": True}

class ProductoOCCreate(ProductoOCBase):
    pass

class ProductoOCInDB(ProductoOCBase):
    id: int
    product: Optional['ProductInDB'] = None 
    model_config = {"from_attributes": True}

class ServicioOCBase(BaseModel):
    service_id: int
    cantidad: int = Field(1, alias="quantity")
    precio_costo: float = 0.0
    precio_venta: float = Field(..., alias="unit_price")
    es_principal: bool = True
    model_config = {"populate_by_name": True}

class ServicioOCCreate(ServicioOCBase):
    pass

class ServicioOCInDB(ServicioOCBase):
    id: int
    service: Optional[ServiceInDB] = None
    model_config = {"from_attributes": True}

class PlanOCBase(BaseModel):
    plan_id: int
    cantidad: int = Field(1, alias="quantity")
    precio_costo: float = 0.0
    precio_venta: float = Field(..., alias="unit_price")
    es_principal: bool = True
    model_config = {"populate_by_name": True}

class PlanOCCreate(PlanOCBase):
    pass

class PlanOCInDB(PlanOCBase):
    id: int
    plan: Optional[PlanInDB] = None
    model_config = {"from_attributes": True}

class CremationTechnicalBase(BaseModel):
    cremation_id: int
    step_id: Optional[int] = None
    operator_id: Optional[int] = None
    furnace_id: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    temperature: Optional[float] = None
    evidence_url: Optional[str] = None
    timeline: Optional[dict] = None

class CremationTechnicalInDB(CremationTechnicalBase):
    model_config = {"from_attributes": True}

class PartnerCommissionBase(BaseModel):
    cremation_id: int
    partner_id: int
    amount: float
    status: str
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None

class PartnerCommissionInDB(PartnerCommissionBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Partitioned Schemas
class CremationLogisticsInDB(BaseModel):
    region: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    pickup_region: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_address: Optional[str] = None
    model_config = {"from_attributes": True}

class CremationFinancialInDB(BaseModel):
    total_price: Optional[float] = 0.0
    total_cost: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    weight_price: Optional[float] = 0.0
    commission: Optional[float] = 0.0
    model_config = {"from_attributes": True}

class CremationDetailsInDB(BaseModel):
    images: Optional[List[str]] = []
    notes: Optional[str] = None
    tracking_token: Optional[str] = None
    additional_services: Optional[List[dict]] = []
    model_config = {"from_attributes": True}

class CremationSchedulingInDB(BaseModel):
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class CremationOCBase(BaseModel):
    pet_id: int
    oc_number: Optional[int] = None # Auto-asignado si es nulo
    verification_code: Optional[str] = None # Codigo unico 10 chars
    current_step_id: Optional[int] = None
    # Soporte para items múltiples
    servicios: Optional[List[ServicioOCCreate]] = []
    planes: Optional[List[PlanOCCreate]] = []
    
    # Mapeo directo con el frontend
    service_id: Optional[int] = None
    plan_id: Optional[int] = None
    additional_services: Optional[List[int]] = []
    products: Optional[List[ProductoOCCreate]] = [] # Frontend usa 'products'
    
    region: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    pickup_region: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_address: Optional[str] = None
    cremation_type: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    images: Optional[List[str]] = []
    total_price: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    weight: Optional[float] = None
    weight_price: Optional[float] = 0.0
    
    tracking_token: Optional[str] = None
    partner_id: Optional[int] = None # Legacy: mapped to partner_link_id
    partner_link_id: Optional[int] = None

class CremationOCCreate(CremationOCBase):
    pass

class CremationOCUpdate(BaseModel):
    servicios: Optional[List[ServicioOCCreate]] = None
    planes: Optional[List[PlanOCCreate]] = None
    products: Optional[List[ProductoOCCreate]] = None
    service_id: Optional[int] = None
    plan_id: Optional[int] = None
    additional_services: Optional[List[int]] = None
    oc_number: Optional[int] = None

    region: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    pickup_region: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_address: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    images: Optional[List[str]] = None
    total_price: Optional[float] = None
    discount: Optional[float] = None
    weight: Optional[float] = None
    weight_price: Optional[float] = None

class CremationOCInDB(CremationOCBase):
    id: int
    tenant_id: int
    servicios: List[ServicioOCInDB] = []
    planes: List[PlanOCInDB] = []
    productos: List[ProductoOCInDB] = [] # Se mantiene productos en DB/InDB para no romper el modelo ORM
    products: List[ProductoOCInDB] = [] # Override to match properties
    pet: Optional[PetInDB] = None
    partner: Optional[PartnerLinkResponse] = None # Renamed type, field name kept for comp.
    
    # Normalized & Partitioned relationships
    technical: Optional[CremationTechnicalInDB] = None
    commission: Optional[PartnerCommissionInDB] = None
    logistics: Optional[CremationLogisticsInDB] = None
    financial: Optional[CremationFinancialInDB] = None
    details: Optional[CremationDetailsInDB] = None
    scheduling: Optional[CremationSchedulingInDB] = None
    
    # Enriched fields from properties
    pet_name: Optional[str] = None
    customer_name: Optional[str] = None
    pet_image_url: Optional[str] = None
    
    # Flattened Partitioned Fields (for Frontend Compatibility)
    region: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    pickup_region: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_address: Optional[str] = None
    total_price: Optional[float] = None
    total_cost: Optional[float] = None
    discount: Optional[float] = None
    weight_price: Optional[float] = None
    commission: Optional[float] = None
    images: Optional[List[str]] = None
    notes: Optional[str] = None
    tracking_token: Optional[str] = None
    additional_services: Optional[List[dict]] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    @field_validator('commission', mode='before')
    @classmethod
    def check_commission_type(cls, v: Any) -> Optional[float]:
        # If v is the ORM relationship object (PartnerCommission), ignore it (return None)
        # The model_validator 'flatten_partitions' will populate it correctly from self.financial.commission
        if hasattr(v, 'amount') or hasattr(v, 'id'): 
            return None
        if isinstance(v, (float, int)):
            return float(v)
        return None

    @model_validator(mode='after')
    def flatten_partitions(self) -> 'CremationOCInDB':
        if self.logistics:
            if not self.region: self.region = self.logistics.region
            if not self.city: self.city = self.logistics.city
            if not self.address: self.address = self.logistics.address
            if not self.pickup_region: self.pickup_region = self.logistics.pickup_region
            if not self.pickup_city: self.pickup_city = self.logistics.pickup_city
            if not self.pickup_address: self.pickup_address = self.logistics.pickup_address
        if self.financial:
            if self.total_price is None or self.total_price == 0:
                self.total_price = self.financial.total_price
            if not self.total_price:
                svc = sum(s.precio_venta * s.cantidad for s in (self.servicios or []) if s.precio_venta)
                pln = sum(p.precio_venta * p.cantidad for p in (self.planes or []) if p.precio_venta)
                prd = sum(pr.precio_venta * pr.cantidad for pr in (self.productos or []) if pr.precio_venta)
                self.total_price = svc + pln + prd
            if self.total_cost is None: self.total_cost = self.financial.total_cost
            if self.discount is None: self.discount = self.financial.discount
            if self.weight_price is None: self.weight_price = self.financial.weight_price
            if self.commission is None: self.commission = self.financial.commission
        if self.details:
            if not self.images: self.images = self.details.images
            if not self.notes: self.notes = self.details.notes
            if not self.tracking_token: self.tracking_token = self.details.tracking_token
            if not self.additional_services: self.additional_services = self.details.additional_services
        if self.scheduling:
            if not self.scheduled_at: self.scheduled_at = self.scheduling.scheduled_at
            if not self.completed_at: self.completed_at = self.scheduling.completed_at
        return self

    model_config = {"from_attributes": True}

# Aliases for backward compatibility
CremationInDB = CremationOCInDB
CremationCreate = CremationOCCreate
CremationUpdate = CremationOCUpdate

# Logistics Task Schemas
class LogisticsTaskBase(BaseModel):
    cremation_id: Optional[int] = None
    type: str # pickup | delivery
    address: str
    contact_name: str
    contact_phone: str
    checklist: Optional[dict] = {"manta": False, "collar": False, "juguetes": False}

class LogisticsTaskCreate(LogisticsTaskBase):
    driver_id: Optional[int] = None

class LogisticsTaskUpdate(BaseModel):
    status: Optional[str] = None # pending | in_transit | completed
    checklist: Optional[dict] = None
    evidence_image_url: Optional[str] = None
    signature_url: Optional[str] = None
    completed_at: Optional[datetime] = None

class LogisticsTaskInDB(LogisticsTaskBase):
    id: int
    tenant_id: int
    driver_id: Optional[int] = None
    status: str
    evidence_image_url: Optional[str] = None
    signature_url: Optional[str] = None
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}

# Order Evidence
class OrderEvidenceBase(BaseModel):
    cremation_id: int
    step_id: int
    comments: List[str] = []
    photo_url: Optional[str] = None

class OrderEvidenceCreate(OrderEvidenceBase):
    pass

class OrderEvidenceInDB(OrderEvidenceBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Tracking & Dashboard
class TrackingTimelineEvent(BaseModel):
    step_name: str
    status: str # pending, completed, current
    completed_at: Optional[datetime] = None
    evidence: Optional[OrderEvidenceInDB] = None

class PublicTrackingResponse(BaseModel):
    oc_number: Optional[int] = None
    pet_name: str
    pet_species: str
    pet_breed: Optional[str] = None
    pet_image_url: Optional[str] = None
    pet_weight: Optional[float] = None
    customer_name: Optional[str] = None  # Nombre del dueño
    service_status: str # received, processing, etc.
    timeline: List[TrackingTimelineEvent]
    tenant_name: str
    tenant_logo: Optional[str] = None

# Workflow Steps
class WorkflowStepBase(BaseModel):
    name: str
    order_index: int = 0
    is_active: bool = True

class WorkflowStepCreate(WorkflowStepBase):
    pass

class WorkflowStepUpdate(BaseModel):
    name: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

class WorkflowStepInDB(WorkflowStepBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Dashboard Summary
class DashboardStatData(BaseModel):
    total_customers: int
    total_pets: int
    total_orders: int
    total_services: int
    total_users: int
    cremations_this_month: int
    monthly_revenue: float
    pending_revenue: float
    previous_month_revenue: float = 0.0

class DashboardLimitItem(BaseModel):
    usage: int
    max: int

class DashboardLimitsData(BaseModel):
    pets: DashboardLimitItem
    customers: DashboardLimitItem
    orders: DashboardLimitItem
    services: DashboardLimitItem
    products: DashboardLimitItem
    plans: DashboardLimitItem
    partners: Optional[DashboardLimitItem] = None
    users: Optional[DashboardLimitItem] = None

class DashboardRecentActivity(BaseModel):
    id: int
    pet: str
    pet_image: Optional[str] = None
    client: str
    service_name: str
    amount: float
    status: str
    step_name: Optional[str] = None
    time: str

class DashboardSummarySchema(BaseModel):
    stats: DashboardStatData
    limits: DashboardLimitsData
    recent_cremations: List[DashboardRecentActivity]
    today_cremations: List[DashboardRecentActivity] = []
    model_config = {"from_attributes": True}

# Document Schemas
class DocumentBase(BaseModel):
    cremation_id: Optional[int] = None
    type: Optional[str] = None # certificate | receipt
    file_url: Optional[str] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentInDB(DocumentBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Certificate Rendering Schemas (for router)
class CertificateGenerateMetadata(BaseModel):
    tenant_id: str
    tipo_certificado: str
    numero_certificado: str
    fecha_emision: str
    pdf_url: str
    paper_format: str

class CertificateGenerateResponse(BaseModel):
    metadata: CertificateGenerateMetadata
    html_content: str

class CertificateGenerateRequest(BaseModel):
    cremation_id: Optional[int] = None
    template_id: Optional[int] = None
    certificate_type: str = "Certificado"
    theme: Optional[str] = None
    cert_number: Optional[str] = None
    pet_name: Optional[str] = None
    pet_desc: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None
    process_details: Optional[str] = None
    auth_declaration: Optional[str] = None
    signature_text: Optional[str] = None
    memorial_message: Optional[str] = None
    memorial_title: Optional[str] = None
    header_logo_url: Optional[str] = None
    header_logo_x: Optional[str] = None
    header_logo_y: Optional[str] = None
    background_logo_url: Optional[str] = None
    background_logo_x: Optional[str] = None
    background_logo_y: Optional[str] = None
    background_logo_opacity: Optional[float] = None
    background_logo_rotation: Optional[float] = None
    paper_format: Optional[str] = None
    farewell_text: Optional[str] = None
    sections_config: Optional[dict] = None
    sections_order: Optional[List[str]] = None
    header_logo_shape: Optional[str] = None
    background_logo_shape: Optional[str] = None
    # Overrides dinámicos para certificadoImg (el tenant ajusta valores al emitir,
    # sin mover posiciones): {field_id: {format, image_url}}
    image_overrides: Optional[dict] = None
    persist: bool = False

class DailyOrderSchema(BaseModel):
    id: int
    oc_number: Optional[int] = None
    verification_code: Optional[str] = None
    pet_id: int
    pet_name: str
    pet_breed: Optional[str] = None
    pet_species: str
    customer_id: int
    customer_name: str
    customer_address: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    tenant_public_token: Optional[str] = None
    tenant_slug: Optional[str] = None
    tracking_token: Optional[str] = None
    timeline_metadata: Optional[dict] = None
    current_step_id: Optional[int] = None
    status: str
    weight: Optional[float] = None
    evidence: List[OrderEvidenceInDB] = []
    technical: Optional[CremationTechnicalInDB] = None
    created_at: datetime
    partner_id: Optional[int] = None
    partner_name: Optional[str] = None
    partner_address: Optional[str] = None
    partner_phone: Optional[str] = None
    model_config = {"from_attributes": True}

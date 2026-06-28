from pydantic import BaseModel, EmailStr, Field, model_validator, field_validator
from typing import Optional, List, Literal, Any
from datetime import datetime
from enum import Enum as PyEnum

from app.models import TenantStatus, UserRole, UserRole as RoleEnum  # Check if both needed
# We might need to import SubscriptionStatusEnum etc if defined in models or define them here

# ==========================================
# Admin & Auth Schemas (Users, Tenants, Audit)
# ==========================================

# Enums (Moved from original schemas if not in models)
class SubscriptionStatusEnum(str, PyEnum):
    ACTIVE = "active"
    PENDING = "pending"
    EXPIRED = "expired"
    CANCELED = "canceled"
    TRIAL = "trial"

class BillingCycleEnum(str, PyEnum):
    MONTHLY = "monthly"
    BIMONTHLY = "bimonthly"
    SEMIANNUAL = "semiannual"
    ANNUAL = "annual"

class PaymentMethodEnum(str, PyEnum):
    TRANSFER = "transfer"
    STRIPE = "stripe"
    PAYPAL = "paypal"
    CASH = "cash"
    POLAR = "polar"
    MERCADOPAGO = "mercadopago"

class PaymentStatusEnum(str, PyEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class RecipientType(str, PyEnum):
    admin = "admin"
    tenant = "tenant"
    veterinary = "veterinary"

class NotificationPriority(str, PyEnum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"

# Subscription Plans
class SubscriptionPlanBase(BaseModel):
    name: str
    max_pets: int = 10
    max_services: int = 10
    max_plans: int = 4
    max_products: int = 10
    max_orders: int = 10
    max_customers: int = 10
    max_users: int = 3
    max_partners: int = 5
    allowed_modules: List[str] = []
    can_delete: bool = False
    can_export: bool = False
    price: float = 0.0
    monthly_price: float = 0.0
    annual_price: Optional[float] = 0.0
    description: Optional[str] = None
    features: Any = None
    is_active: bool = True
    display_order: int = 0
    stripe_price_id: Optional[str] = None
    polar_product_id: Optional[str] = None
    polar_price_id: Optional[str] = None

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass

class SubscriptionPlanInDB(SubscriptionPlanBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}

class SubscriptionPlanUpdate(BaseModel):
    """Schema for updating subscription plan"""
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[float] = Field(default=None, ge=0)
    annual_price: Optional[float] = Field(default=None, ge=0)
    features: Optional[Any] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    max_pets: Optional[int] = Field(default=None, ge=0)
    max_services: Optional[int] = Field(default=None, ge=0)
    max_plans: Optional[int] = Field(default=None, ge=0)
    max_products: Optional[int] = Field(default=None, ge=0)
    max_orders: Optional[int] = Field(default=None, ge=0)
    max_customers: Optional[int] = Field(default=None, ge=0)
    max_users: Optional[int] = Field(default=None, ge=0)
    max_partners: Optional[int] = Field(default=None, ge=0)
    allowed_modules: Optional[List[str]] = None
    can_delete: Optional[bool] = None
    can_export: Optional[bool] = None

class ChangePlanRequest(BaseModel):
    """Request payload for changing subscription plan"""
    plan_id: int
    billing_cycle: BillingCycleEnum
    coupon_code: Optional[str] = None

# TenantSubscription Schemas
class TenantSubscriptionBase(BaseModel):
    subscription_plan_id: int
    status: SubscriptionStatusEnum = SubscriptionStatusEnum.ACTIVE
    billing_cycle: BillingCycleEnum = BillingCycleEnum.MONTHLY
    discount_percent: int = Field(default=0, ge=0, le=100)

class TenantSubscriptionCreate(TenantSubscriptionBase):
    tenant_id: int
    start_date: Optional[datetime] = None  # Auto-calculated if not provided
    monthly_price: Optional[float] = None  # Auto-calculated from plan

class TenantSubscriptionUpdate(BaseModel):
    subscription_plan_id: Optional[int] = None
    status: Optional[SubscriptionStatusEnum] = None
    billing_cycle: Optional[BillingCycleEnum] = None
    discount_percent: Optional[int] = Field(default=None, ge=0, le=100)
    end_date: Optional[datetime] = None

class TenantSubscriptionInDB(TenantSubscriptionBase):
    id: int
    tenant_id: int
    start_date: datetime
    end_date: datetime
    next_billing_date: Optional[datetime] = None
    monthly_price: float
    final_price: float
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

TenantSubscriptionResponse = TenantSubscriptionInDB

# Tenant Schemas
class TenantBase(BaseModel):
    name: str
    short_name: Optional[str] = Field(None, max_length=10)
    rut: Optional[str] = None
    plan: Optional[str] = "FREE"
    subscription_plan_id: Optional[int] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "Chile"
    logo_url: Optional[str] = None
    social_media: Optional[dict] = None
    legal_rep_name: Optional[str] = None
    legal_rep_rut: Optional[str] = None
    slug: Optional[str] = None
    public_token: Optional[str] = None
    pending_reason: Optional[str] = None
    timezone: Optional[str] = "America/Santiago"
    default_certificate_template_id: Optional[int] = None

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    rut: Optional[str] = None
    short_name: Optional[str] = Field(None, max_length=10)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    logo_url: Optional[str] = None
    social_media: Optional[dict] = None
    legal_rep_name: Optional[str] = None
    legal_rep_rut: Optional[str] = None
    status: Optional[TenantStatus] = None
    slug: Optional[str] = None
    subscription_plan_id: Optional[int] = None
    billing_notify_channels: Optional[str] = None
    default_certificate_template_id: Optional[int] = None

class TenantBillingSchema(BaseModel):
    billing_cycle: str = "monthly"
    billing_status: str = "active"
    billing_end_date: Optional[datetime] = None
    last_payment_date: Optional[datetime] = None
    last_payment_method: Optional[str] = None
    billing_notify_days: int = 30
    billing_notify_channels: str = "email"
    billing_discount: int = 0
    monthly_price: float = 0.0
    model_config = {"from_attributes": True}

class TenantInDB(TenantBase):
    id: int
    status: TenantStatus
    created_at: datetime
    subscription_plan: Optional[SubscriptionPlanInDB] = None
    billing_info: Optional[TenantBillingSchema] = None
    # Polar.sh
    polar_subscription_id: Optional[str] = None
    polar_customer_id: Optional[str] = None
    subscription_status: Optional[str] = None
    current_period_end: Optional[datetime] = None
    polar_cancel_at_period_end: bool = False
    model_config = {"from_attributes": True}

# Audit Log Schemas
class AuditLogBase(BaseModel):
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    status: str = "success"
    status_code: int = 200
    resource_name: Optional[str] = None
    details: Optional[str] = None
    error_message: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogInDB(AuditLogBase):
    id: int
    tenant_id: Optional[int] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class AuditLogBulkDelete(BaseModel):
    ids: List[int]

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.operator

class UserCreate(UserBase):
    tenant_id: Optional[int] = None
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    tenant_id: Optional[int] = None

class UserInDB(UserBase):
    id: int
    tenant_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    tenant: Optional[TenantInDB] = None
    model_config = {"from_attributes": True}

class UserUpdateMe(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None

# Granular Permissions
class UserPermissionActions(BaseModel):
    view: bool = True
    create: bool = False
    edit: bool = False
    delete: bool = False

class UserPermissionBase(BaseModel):
    module_key: str
    is_active: bool = True
    actions: UserPermissionActions

class UserPermissionUpdate(BaseModel):
    is_active: Optional[bool] = None
    actions: Optional[UserPermissionActions] = None

class UserPermissionInDB(UserPermissionBase):
    id: int
    user_id: int
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserInDB] = None

class TokenData(BaseModel):
    user_id: Optional[int] = None
    tenant_id: Optional[int] = None

# Notifications
class NotificationBase(BaseModel):
    title: str
    message: Optional[str] = None
    type: str  # e.g., 'new_submission', 'system', 'payment', 'support'
    data: Optional[dict] = None
    priority: NotificationPriority = NotificationPriority.normal
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None

class NotificationCreate(NotificationBase):
    """Schema for creating a notification with recipient validation"""
    recipient_type: RecipientType
    tenant_id: Optional[int] = None
    veterinary_id: Optional[int] = None
    
    @model_validator(mode='after')
    def validate_recipient(self):
        """Ensure only one recipient field is populated based on recipient_type"""
        if self.recipient_type == RecipientType.admin:
            if self.tenant_id is not None or self.veterinary_id is not None:
                raise ValueError("Admin notifications cannot have tenant_id or veterinary_id")
        elif self.recipient_type == RecipientType.tenant:
            if self.tenant_id is None:
                raise ValueError("Tenant notifications require tenant_id")
            if self.veterinary_id is not None:
                raise ValueError("Tenant notifications cannot have veterinary_id")
        elif self.recipient_type == RecipientType.veterinary:
            if self.veterinary_id is None:
                raise ValueError("Veterinary notifications require veterinary_id")
            if self.tenant_id is not None:
                raise ValueError("Veterinary notifications cannot have tenant_id")
        return self

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class NotificationInDB(NotificationBase):
    id: int
    recipient_type: RecipientType
    tenant_id: Optional[int] = None
    veterinary_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class PaginatedNotifications(BaseModel):
    items: List[NotificationInDB]
    total: int
    page: int
    size: int
    pages: int

class NotificationBroadcast(BaseModel):
    """Schema for broadcasting notifications to multiple recipients"""
    target: Literal["all_tenants", "all_veterinaries", "specific_tenants", "specific_veterinaries"]
    tenant_ids: Optional[List[int]] = None
    veterinary_ids: Optional[List[int]] = None
    type: str
    title: str
    message: Optional[str] = None
    priority: NotificationPriority = NotificationPriority.normal
    data: Optional[dict] = None
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    
    @model_validator(mode='after')
    def validate_target_ids(self):
        """Ensure target-specific broadcasts have IDs"""
        if self.target == "specific_tenants" and not self.tenant_ids:
            raise ValueError("specific_tenants target requires tenant_ids list")
        if self.target == "specific_veterinaries" and not self.veterinary_ids:
            raise ValueError("specific_veterinaries target requires veterinary_ids list")
        return self

class NotificationBroadcastResponse(BaseModel):
    """Response after broadcasting notifications"""
    message: str
    count: int
    target: str
    notification_ids: List[int] = []

# Billing Transaction
class BillingTransactionBase(BaseModel):
    amount: float = Field(gt=0)
    payment_method: PaymentMethodEnum = PaymentMethodEnum.TRANSFER
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    target_plan_id: Optional[int] = None
    target_billing_cycle: Optional[BillingCycleEnum] = None

class BillingTransactionCreate(BillingTransactionBase):
    tenant_id: Optional[int] = None  # Redundant when POSTing to /tenants/{identifier}/billing/transactions
    subscription_id: Optional[int] = None
    payment_date: Optional[datetime] = None

class BillingTransactionUpdate(BaseModel):
    payment_status: Optional[PaymentStatusEnum] = None
    payment_date: Optional[datetime] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    target_plan_id: Optional[int] = None
    end_date: Optional[datetime] = None

class BillingTransactionResponse(BillingTransactionBase):
    id: int
    tenant_id: int
    subscription_id: Optional[int]
    payment_status: PaymentStatusEnum
    payment_date: Optional[datetime]
    created_by: Optional[int]
    created_at: datetime
    tenant_name: Optional[str] = None
    tenant_slug: Optional[str] = None
    target_plan_name: Optional[str] = None
    effective_billing_cycle: Optional[str] = None
    current_billing_end_date: Optional[datetime] = None
    class Config:
        from_attributes = True

# Coupon
class CouponBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    discount_percent: int = Field(..., ge=1, le=100)
    is_active: bool = True
    valid_until: Optional[datetime] = None
    max_uses: Optional[int] = None

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseModel):
    discount_percent: Optional[int] = Field(None, ge=1, le=100)
    is_active: Optional[bool] = None
    valid_until: Optional[datetime] = None
    max_uses: Optional[int] = None

class CouponResponse(CouponBase):
    id: int
    current_uses: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

# SaaS Config
class SaaSConfigBase(BaseModel):
    name: str = "SaaS Crematorio"
    rut: Optional[str] = None
    slug: Optional[str] = "saas-crematorio"
    logo: Optional[str] = None
    eslogan: Optional[str] = None
    descripcion: Optional[str] = None
    mision: Optional[str] = None
    vision: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    pais: Optional[str] = None
    whatsapp: Optional[str] = None
    correo: Optional[str] = None
    redes_sociales: List[dict] = []
    imagenes: List[str] = []

class SaaSConfigCreate(SaaSConfigBase):
    pass

class SaaSConfigUpdate(BaseModel):
    name: Optional[str] = None
    rut: Optional[str] = None
    slug: Optional[str] = None
    logo: Optional[str] = None
    eslogan: Optional[str] = None
    descripcion: Optional[str] = None
    mision: Optional[str] = None
    vision: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    pais: Optional[str] = None
    whatsapp: Optional[str] = None
    correo: Optional[str] = None
    redes_sociales: Optional[List[dict]] = None
    imagenes: Optional[List[str]] = None

class SaaSConfigInDB(SaaSConfigBase):
    id: int
    updated_at: datetime
    model_config = {"from_attributes": True}

# Table Configuration Schemas
class TableConfigBase(BaseModel):
    table_name: str
    columns_config: dict

class TableConfigCreate(TableConfigBase):
    pass

class TableConfigInDB(TableConfigBase):
    id: int
    tenant_id: int
    updated_at: datetime
    model_config = {"from_attributes": True}

# Backup Schemas
class BackupScheduleBase(BaseModel):
    backup_enabled: bool = False
    backup_day: int = 0  # 0-6 (Mon-Sun)
    backup_time: str = "03:00"  # HH:MM

class BackupScheduleUpdate(BaseModel):
    backup_enabled: Optional[bool] = None
    backup_day: Optional[int] = None
    backup_time: Optional[str] = None

class BackupStatus(BaseModel):
    last_backup_at: Optional[datetime] = None
    last_backup_status: Optional[str] = None

# Landing Configuration Schemas
class LandingConfigBase(BaseModel):
    config: dict

class LandingConfigCreate(LandingConfigBase):
    pass

class LandingConfig(LandingConfigBase):
    id: int
    key: str
    updated_at: datetime
    model_config = {"from_attributes": True}

# Theme
class ThemeConfigBase(BaseModel):
    theme_mode: str = "auto"
    auto_light_start: str = "06:00"
    auto_light_end: str = "18:00"
    custom_theme_colors: Optional[dict] = None

class ThemeConfigUpdate(BaseModel):
    theme_mode: Optional[str] = None
    auto_light_start: Optional[str] = None
    auto_light_end: Optional[str] = None
    custom_theme_colors: Optional[dict] = None

class ThemeConfigInDB(ThemeConfigBase):
    id: int
    tenant_id: int
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

# Announcement
class AnnouncementBase(BaseModel):
    title: str
    content: str
    type: str
    display_type: str = "modal"
    target_status: Optional[str] = None
    target_plan_id: Optional[int] = None
    is_active: bool = True
    show_once: bool = False
    must_read: bool = False
    priority: int = 0

class AnnouncementCreate(AnnouncementBase):
    tenant_id: Optional[int] = None

class AnnouncementInDB(AnnouncementBase):
    id: int
    tenant_id: Optional[int] = None
    target_status: Optional[str] = None
    target_plan_id: Optional[int] = None
    created_at: datetime
    target_plan: Optional[SubscriptionPlanInDB] = None
    model_config = {"from_attributes": True}

# Farewell Template
class FarewellTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    config: dict
    preview_url: Optional[str] = None
    is_default: Optional[bool] = False

class FarewellTemplateCreate(FarewellTemplateBase):
    pass

class FarewellTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[dict] = None
    preview_url: Optional[str] = None
    is_default: Optional[bool] = None

class FarewellTemplate(FarewellTemplateBase):
    id: int
    tenant_id: Optional[int] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class ApprovePaymentRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    notes: Optional[str] = None

# ==========================================
# Bootstrap Schemas - Consolidated Auth Response
# ==========================================

class BootstrapUserData(BaseModel):
    """Minimal user data for bootstrap"""
    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    tenant_id: Optional[int] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class BootstrapTenantData(BaseModel):
    """Minimal tenant data for bootstrap"""
    id: int
    name: str
    short_name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    pending_reason: Optional[str] = None
    status: TenantStatus
    plan: str
    timezone: Optional[str] = "America/Santiago"
    rut: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    social_media: Optional[dict] = None
    legal_rep_name: Optional[str] = None
    legal_rep_rut: Optional[str] = None
    subscription_plan: Optional[SubscriptionPlanInDB] = None
    next_billing_date: Optional[datetime] = None
    billing_cycle: Optional[str] = None
    subscription_status: Optional[str] = None
    polar_customer_id: Optional[str] = None
    polar_subscription_id: Optional[str] = None
    polar_cancel_at_period_end: bool = False
    # Acceso de demostración (plan superior temporal). subscription_plan refleja el
    # plan efectivo (demo) mientras está activo; estos campos alimentan el banner.
    demo_active: bool = False
    demo_plan_name: Optional[str] = None
    demo_expires_at: Optional[datetime] = None
    contracted_plan_name: Optional[str] = None
    default_certificate_template_id: Optional[int] = None
    model_config = {"from_attributes": True}

class BootstrapModulePermission(BaseModel):
    """Module permission for bootstrap"""
    module_key: str
    is_active: bool
    actions: UserPermissionActions
    model_config = {"from_attributes": True}

class BootstrapRBACData(BaseModel):
    """RBAC data consolidated"""
    modules: List[BootstrapModulePermission] = []
    role: UserRole
    
class BootstrapMetadata(BaseModel):
    """Additional metadata for bootstrap"""
    unread_notifications: int = 0
    pending_submissions: int = 0
    total_commission_pending: float = 0.0 # Added for Veterinary
    active_links_count: int = 0 # Added for Veterinary

# Note: Dependency on other modules (Creator, Partner) requires import or careful ordering
from app.api.internal.catalog.schemas import ServiceInDB, PlanInDB, CategoryInDB, ProviderInDB
from app.api.internal.operations.schemas import WorkflowStepInDB, DashboardSummarySchema, PartnerLinkResponse, PartnerCommissionInDB

class VeterinaryBootstrapResponse(BaseModel):
    """
    Consolidated bootstrap response for Veterinary Portal.
    """
    user: BootstrapUserData
    veterinary: Any # Placeholder to avoid import error if not present
    links: List[PartnerLinkResponse]
    commissions: List[PartnerCommissionInDB]
    notifications: List[NotificationInDB] = []
    metadata: BootstrapMetadata

class SubmissionListItem(BaseModel):
    id: int
    owner_name: str
    pet_name: str
    pet_type: str
    region: Optional[str] = None
    city: Optional[str] = None
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}

# Certificate Templates
class CertificateTemplateBase(BaseModel):
    name: str
    paper_format: str = "Carta"
    category: str = "para mascotas"
    theme: str = "Clásico"
    title: Optional[str] = None
    subtitle: Optional[str] = None
    declaration_text: Optional[str] = Field(None, max_length=121)
    signature_text: Optional[str] = None
    memorial_message: Optional[str] = None
    memorial_title: Optional[str] = None
    header_logo_url: Optional[str] = None
    header_logo_x: str = "center"
    header_logo_y: str = "0"
    header_logo_shape: str = "square"
    background_logo_url: Optional[str] = None
    background_logo_x: str = "50%"
    background_logo_y: str = "50%"
    background_logo_opacity: float = 0.05
    background_logo_shape: str = "square"
    background_logo_rotation: float = -15.0
    farewell_text: Optional[str] = Field(None, max_length=438)
    sections_config: Optional[dict] = None
    sections_order: Optional[list] = None
    advantages_list: Optional[List[str]] = None
    is_default: bool = False
    source_template_id: Optional[int] = None

class CertificateTemplateCreate(CertificateTemplateBase):
    pass

class CertificateTemplateUpdate(BaseModel):
    name: Optional[str] = None
    paper_format: Optional[str] = None
    category: Optional[str] = None
    theme: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    declaration_text: Optional[str] = Field(None, max_length=121)
    signature_text: Optional[str] = None
    memorial_message: Optional[str] = None
    memorial_title: Optional[str] = None
    header_logo_url: Optional[str] = None
    header_logo_x: Optional[str] = None
    header_logo_y: Optional[str] = None
    header_logo_shape: Optional[str] = None
    background_logo_url: Optional[str] = None
    background_logo_x: Optional[str] = None
    background_logo_y: Optional[str] = None
    background_logo_opacity: Optional[float] = None
    background_logo_shape: Optional[str] = None
    background_logo_rotation: Optional[float] = None
    farewell_text: Optional[str] = Field(None, max_length=438)
    sections_config: Optional[dict] = None
    sections_order: Optional[list] = None
    advantages_list: Optional[List[str]] = None
    is_default: Optional[bool] = None
    source_template_id: Optional[int] = None

class CertificateTemplateInDB(CertificateTemplateBase):
    id: int
    tenant_id: Optional[int] = None
    created_at: datetime
    
    @property
    def is_global(self) -> bool:
        """Returns True if this is a global template (tenant_id is None)"""
        return self.tenant_id is None
    model_config = {"from_attributes": True}

    @field_validator('tenant_id', mode='before')
    @classmethod
    def set_tenant_id_zero(cls, v: Any) -> int:
        return v if v is not None else 0

class BootstrapResponse(BaseModel):
    """
    Consolidated bootstrap response containing all initialization data.
    """
    user: BootstrapUserData
    tenant: BootstrapTenantData
    rbac: BootstrapRBACData
    theme: Optional[ThemeConfigInDB] = None
    announcements: List[AnnouncementInDB] = []
    dashboard: Optional[DashboardSummarySchema] = None
    notifications: List[NotificationInDB] = []
    submissions: List[SubmissionListItem] = []
    farewell_templates: List[FarewellTemplate] = []
    document_templates: List[CertificateTemplateInDB] = [] 
    services: List[ServiceInDB] = []
    plans: List[PlanInDB] = []
    product_categories: List[CategoryInDB] = []
    product_providers: List[ProviderInDB] = []
    operation_steps: List[WorkflowStepInDB] = []
    metadata: BootstrapMetadata

# Creator Bootstrap (Admin of Admins)
class GrowthDataPoint(BaseModel):
    month: str
    revenue: float
    tenants: int

class CreatorBootstrapStats(BaseModel):
    total_tenants: int
    active_tenants: int
    total_revenue: float
    total_mrr: float
    due_today_count: int
    cancelling_tenants_count: int = 0
    growth_data: List[GrowthDataPoint] = []

class CreatorBootstrapTenant(BaseModel):
    id: int
    name: str
    slug: str
    rut: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    status: str
    plan: str
    revenue: float
    billing_end_date: Optional[datetime] = None
    created_at: str
    resources: Optional[dict] = None
    # Acceso de demostración (plan superior temporal)
    demo_plan_id: Optional[int] = None
    demo_plan_name: Optional[str] = None
    demo_expires_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class DueSoonTenant(BaseModel):
    """Tenant cuya suscripción vence pronto o ya venció (panel de atención del creator)."""
    id: int
    name: str
    slug: str
    plan: str
    status: str
    billing_end_date: datetime
    model_config = {"from_attributes": True}

class CreatorBootstrapVeterinary(BaseModel):
    id: int
    name: str
    rut: str
    slug: str
    email: str
    is_active: bool
    model_config = {"from_attributes": True}

class CreatorBootstrapResponse(BaseModel):
    user: BootstrapUserData
    stats: CreatorBootstrapStats
    tenants: List[CreatorBootstrapTenant]
    # Suscripciones que requieren seguimiento (vencen en ≤7 días o vencieron
    # en los últimos 30). Calculado sobre TODOS los tenants, no solo los 15
    # recientes de `tenants`.
    due_soon_tenants: List[DueSoonTenant] = []
    notifications: List[NotificationInDB]
    veterinaries: List[CreatorBootstrapVeterinary]
    billing_transactions: List[BillingTransactionResponse]
    subscription_plans: List[SubscriptionPlanInDB]
    announcements: List[AnnouncementInDB]
    metadata: BootstrapMetadata


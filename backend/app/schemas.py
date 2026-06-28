from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

# ==========================================
# Schema Facade - Backend Compatibility Layer
# ==========================================

# 1. CRM Module (Customers, Pets)
from app.api.internal.crm.schemas import (
    CustomerBase, CustomerCreate, CustomerUpdate, CustomerInDB,
    PetBase, PetCreate, PetUpdate, PetInDB
)

# 2. Catalog Module (Products, Services, Plans)
from app.api.internal.catalog.schemas import (
    CategoryBase, CategoryCreate, CategoryUpdate, CategoryInDB,
    ProviderBase, ProviderCreate, ProviderUpdate, ProviderInDB,
    ServiceBase, ServiceCreate, ServiceUpdate, ServiceInDB,
    ProductBase, ProductCreate, ProductUpdate, ProductInDB,
    PlanBase, PlanCreate, PlanUpdate, PlanInDB,
    WeightPricingBase, WeightPricingCreate, WeightPricingInDB
)

# 3. Operations Module (Cremations, Orders, Logistics)
from app.api.internal.operations.schemas import (
    ProductoOCBase, ProductoOCCreate, ProductoOCInDB,
    ServicioOCBase, ServicioOCCreate, ServicioOCInDB,
    PlanOCBase, PlanOCCreate, PlanOCInDB,
    CremationTechnicalBase, CremationTechnicalInDB,
    PartnerCommissionBase, PartnerCommissionInDB,
    CremationLogisticsInDB, CremationFinancialInDB, CremationDetailsInDB, CremationSchedulingInDB,
    CremationOCBase, CremationOCCreate, CremationOCUpdate, CremationOCInDB,
    # Aliases
    CremationInDB, CremationCreate, CremationUpdate,
    LogisticsTaskBase, LogisticsTaskCreate, LogisticsTaskUpdate, LogisticsTaskInDB,
    OrderEvidenceBase, OrderEvidenceCreate, OrderEvidenceInDB,
    TrackingTimelineEvent, PublicTrackingResponse,
    WorkflowStepBase, WorkflowStepCreate, WorkflowStepUpdate, WorkflowStepInDB,
    DashboardStatData, DashboardLimitItem, DashboardLimitsData, DashboardRecentActivity, DashboardSummarySchema,
    DocumentBase, DocumentCreate, DocumentInDB,
    CertificateGenerateRequest, CertificateGenerateMetadata, CertificateGenerateResponse,
    DailyOrderSchema
)

# 4. Admin/Auth/Common Module (Users, Tenants, Config, Notifications)
from app.api.internal.admin.schemas import (
    SubscriptionStatusEnum, BillingCycleEnum, PaymentMethodEnum, PaymentStatusEnum,
    RecipientType, NotificationPriority,
    SubscriptionPlanBase, SubscriptionPlanCreate, SubscriptionPlanInDB, SubscriptionPlanUpdate, ChangePlanRequest,
    TenantSubscriptionBase, TenantSubscriptionCreate, TenantSubscriptionUpdate, TenantSubscriptionInDB, TenantSubscriptionResponse,
    TenantBase, TenantCreate, TenantUpdate, TenantBillingSchema, TenantInDB,
    AuditLogBase, AuditLogCreate, AuditLogInDB, AuditLogBulkDelete,
    UserBase, UserCreate, UserLogin, UserInDB, UserUpdateMe,
    UserPermissionActions, UserPermissionBase, UserPermissionUpdate, UserPermissionInDB,
    Token, TokenData,
    NotificationBase, NotificationCreate, NotificationUpdate, NotificationInDB, PaginatedNotifications, NotificationBroadcast, NotificationBroadcastResponse,
    BillingTransactionBase, BillingTransactionCreate, BillingTransactionUpdate, BillingTransactionResponse,
    CouponBase, CouponCreate, CouponUpdate, CouponResponse,
    SaaSConfigBase, SaaSConfigCreate, SaaSConfigUpdate, SaaSConfigInDB,
    BackupScheduleBase, BackupScheduleUpdate, BackupStatus,
    ThemeConfigBase, ThemeConfigUpdate, ThemeConfigInDB,
    AnnouncementBase, AnnouncementCreate, AnnouncementInDB,
    FarewellTemplateBase, FarewellTemplateCreate, FarewellTemplateUpdate, FarewellTemplate,
    TableConfigBase, TableConfigCreate, TableConfigInDB,
    LandingConfigBase, LandingConfigCreate, LandingConfig,
    ApprovePaymentRequest,
    BootstrapUserData, BootstrapTenantData, BootstrapModulePermission, BootstrapRBACData, BootstrapMetadata,
    VeterinaryBootstrapResponse, SubmissionListItem,
    CertificateTemplateBase, CertificateTemplateCreate, CertificateTemplateUpdate, CertificateTemplateInDB,
    BootstrapResponse, GrowthDataPoint, CreatorBootstrapStats, CreatorBootstrapTenant,
    CreatorBootstrapVeterinary, CreatorBootstrapResponse, DueSoonTenant
)

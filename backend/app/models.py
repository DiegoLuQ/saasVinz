# Aggregator for all modular models
# This file maintains backward compatibility

# 1. Auth & Admin
from app.api.internal.auth.models import (
    User, UserRole, Module, UserModulePermission, RoleModuleBlueprint, TenantModuleConfig, Role,
    RefreshToken
)
from app.api.internal.admin.models import (
    Tenant, TenantStatus, TenantBillingInfo, SubscriptionPlan, AuditLog, TemporaryFormToken, TableConfiguration, SaaSConfig
)
from app.api.internal.admin.image_templates.models import ImageTemplate
from app.api.internal.creator.subscriptions.models import (
    TenantSubscription, BillingTransaction, Coupon, Receipt, ReceiptStatus
)

# 2. CRM
from app.api.internal.crm.models import (
    Customer, Pet, PetStatus
)

# 3. Catalog
from app.api.internal.catalog.models import (
    Category, Provider, Product, Service, Plan, PlanProduct, PlanService, WeightPricing
)

# 4. Operations
from app.api.internal.operations.models import (
    CremationOC, Cremation, OrderStatus, 
    CremationTechnical, CremationLogistics, CremationFinancial, CremationDetails, CremationScheduling,
    ServicioOC, PlanOC, ProductoOC,
    WorkflowStep, OrderEvidence,
    Document, Certificate, CertificateTemplate, LogisticsTask
)

# 5. Partners
from app.api.internal.partners.models import (
    Veterinary, PartnerLinkV2 as PartnerLink, PartnerCommission, PartnerCommissionStatus
)

# 6. Common (Notifications, Submissions, Theme, Landing, Announcements)
from app.api.internal.common.models import (
    Notification, RecipientType, NotificationPriority,
    FormSubmission, ThemeConfig, LandingConfig, FarewellTemplate,
    TenantAnnouncement, AnnouncementType, AnnouncementDisplayType, UserAnnouncementView,
    MediaLibrary, MediaCategory
)
# 7. Memorials
from app.api.internal.memorials.models import (
    Memorial, Dedication, MemorialStatus, DedicationStatus, MemorialPlan
)

# 8. Integrations (Widget embebible / API keys públicas)
from app.api.internal.integrations.models import (
    TenantApiKey
)

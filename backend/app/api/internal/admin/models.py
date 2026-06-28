from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float, Enum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
from app.utils import tz
import enum
# Import UserRole for reference in some contexts if needed, usually passed as string in DB but Enum in SA
# Actually UserRole is in auth.models now. 
# We don't import it here to avoid circular imports if unneeded, but TenantStatus is local.

class TenantStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    pending = "pending"
    inactive = "inactive"

class SubscriptionPlan(Base):
    __tablename__ = "sys_subscription_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # FREE, NORMAL, PRO, PRO+
    max_pets = Column(Integer, default=10)
    max_services = Column(Integer, default=10)
    max_plans = Column(Integer, default=4)
    max_products = Column(Integer, default=10)
    max_orders = Column(Integer, default=10)
    max_customers = Column(Integer, default=10) # Added: Monthly limit for customers
    max_users = Column(Integer, default=3) # Maximum number of users allowed
    max_partners = Column(Integer, default=5) # Maximum number of partners allowed
    allowed_modules = Column(JSON, default=[]) # List of module keys
    can_delete = Column(Boolean, default=False)
    can_export = Column(Boolean, default=False)
    price = Column(Float, default=0.0)  # Monthly price (legacy field, use for compatibility)
    annual_price = Column(Float, default=None, nullable=True)  # Annual price with discount
    
    # Enhanced fields for better plan management
    description = Column(String, nullable=True)  # Plan description 
    features = Column(JSON, default=list)  # List of feature descriptions [{"name": "...", "included": true}]
    is_active = Column(Boolean, default=True)  # Whether plan is available for selection
    display_order = Column(Integer, default=0)  # Order for UI display (lower = first)
    stripe_price_id = Column(String, nullable=True)  # Stripe Price ID for future integration
    polar_product_id = Column(String, nullable=True) # Polar.sh Product ID
    polar_price_id = Column(String, nullable=True)   # Polar.sh Price ID
    
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

    tenants = relationship("Tenant", back_populates="subscription_plan", foreign_keys="Tenant.subscription_plan_id")

    @property
    def monthly_price(self):
        return self.price

class Tenant(Base):
    __tablename__ = "sys_tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    short_name = Column(String(10))
    slug = Column(String, unique=True, index=True)
    rut = Column(String, unique=True, index=True)
    pending_reason = Column(String, nullable=True)
    email = Column(String)
    phone = Column(String)
    address = Column(String)
    region = Column(String)
    city = Column(String)
    country = Column(String, default="Chile")
    logo_url = Column(String)
    social_media = Column(JSON) # {tiktok, instagram, facebook, youtube, website}
    legal_rep_name = Column(String)
    legal_rep_rut = Column(String)
    timezone = Column(String, default="America/Santiago")
    status = Column(Enum(TenantStatus, native_enum=False), default=TenantStatus.active)
    
    # Nuevo sistema de planes
    subscription_plan_id = Column(Integer, ForeignKey("sys_subscription_plans.id"), nullable=True)
    subscription_plan = relationship("SubscriptionPlan", back_populates="tenants", foreign_keys=[subscription_plan_id])

    # --- Acceso de demostración ---
    # Permite dar acceso temporal a un plan superior SIN cambiar el plan pactado
    # ni la facturación (MRR/ingresos). Se revierte solo al vencer demo_expires_at.
    demo_plan_id = Column(Integer, ForeignKey("sys_subscription_plans.id"), nullable=True)
    demo_expires_at = Column(DateTime, nullable=True)
    demo_plan = relationship("SubscriptionPlan", foreign_keys=[demo_plan_id])

    plan = Column(String, default="FREE")  # Deprecated in favor of subscription_plan_id
    public_token = Column(String, unique=True, index=True)
    default_certificate_template_id = Column(Integer, nullable=True)
    
    # --- Facturación ---
    billing_cycle = Column(String, default="monthly") 
    billing_status = Column(String, default="active") 
    billing_end_date = Column(DateTime, nullable=True) 
    last_payment_date = Column(DateTime, nullable=True)
    last_payment_method = Column(String, nullable=True)
    billing_notify_days = Column(Integer, default=30)
    billing_notify_channels = Column(String, default="email")
    billing_discount = Column(Integer, default=0)
    
    # --- Polar.sh Integration ---
    polar_customer_id = Column(String, nullable=True)
    polar_subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, nullable=True) # active, past_due, canceled, incomplete
    current_period_end = Column(DateTime, nullable=True)
    polar_cancel_at_period_end = Column(Boolean, default=False)

    @property
    def is_premium(self):
        if self.subscription_status == "active":
            return True
        if self.subscription_status == "canceled" and self.current_period_end:
            # Periodo de gracia
            if isinstance(self.current_period_end, str):
                try:
                    end_dt = datetime.fromisoformat(self.current_period_end.replace('Z', '+00:00'))
                except:
                    return False
            else:
                end_dt = self.current_period_end
            return end_dt > datetime.utcnow()
        return False

    @property
    def demo_active(self) -> bool:
        """True si hay un acceso de demostración vigente."""
        if self.demo_plan_id and self.demo_expires_at:
            exp = self.demo_expires_at
            if isinstance(exp, str):
                try:
                    exp = datetime.fromisoformat(exp.replace('Z', '+00:00'))
                except Exception:
                    return False
            return exp > datetime.utcnow()
        return False

    @property
    def effective_plan(self):
        """Plan usado SOLO para control de acceso (módulos / límites / permisos):
        el plan demo si está vigente, si no el plan contratado.
        La facturación (MRR, precio mensual) SIEMPRE usa subscription_plan."""
        if self.demo_active:
            return self.demo_plan
        return self.subscription_plan

    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    # Use class names for resolution
    users = relationship("User", back_populates="tenant")
    partner_links = relationship(
        "PartnerLinkV2",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    billing_info = relationship("TenantBillingInfo", uselist=False, back_populates="tenant", cascade="all, delete-orphan")
    subscriptions = relationship("TenantSubscription", back_populates="tenant", cascade="all, delete-orphan")

class TenantBillingInfo(Base):
    """
    Extension of tenant billing information for specific overrides.
    Main billing status and dates are managed on the Tenant model.
    """
    __tablename__ = "sys_tenant_billing_info"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, unique=True, index=True)
    
    # Decoupled price from subscription plan if needed
    monthly_price = Column(Float, default=0.0) 
    
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)
    
    tenant = relationship("Tenant", back_populates="billing_info")

class AuditLog(Base):
    __tablename__ = "sys_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    # NULL = acción global del SuperAdmin (creator); solo visible bajo bypass RLS.
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id"), nullable=True)
    action = Column(String, nullable=False)  # login, create, update, delete, export, etc.
    resource_type = Column(String, nullable=True)  # customer, pet, service, product, user, etc.
    resource_id = Column(Integer, nullable=True)
    status = Column(String, default="success")  # success, error, warning
    status_code = Column(Integer, default=200)
    resource_name = Column(String, nullable=True)
    details = Column(String, nullable=True) # JSON string
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now, index=True)
    
    tenant = relationship("Tenant")
    user = relationship("User")

class TemporaryFormToken(Base):
    __tablename__ = "sys_temporary_tokens"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("sys_users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    
    tenant = relationship("Tenant")
    created_by = relationship("User")

class TableConfiguration(Base):
    __tablename__ = "sys_table_configurations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    table_name = Column(String) # e.g., 'pets', 'customers'
    columns_config = Column(JSON) # { "col_name": true/false }
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

class SaaSConfig(Base):
    __tablename__ = "sys_saas_config"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    rut = Column(String)
    slug = Column(String, unique=True)
    logo = Column(String)
    eslogan = Column(String)
    descripcion = Column(String)
    mision = Column(String)
    vision = Column(String)
    direccion = Column(String)
    ciudad = Column(String)
    pais = Column(String)
    whatsapp = Column(String)
    correo = Column(String)
    redes_sociales = Column(JSON, default=list) # [{"name": "Facebook", "link": "..."}]
    imagenes = Column(JSON, default=list) # ["url1", "url2"]
    
    # --- Configuración de Respaldos ---
    backup_enabled = Column(Boolean, default=False)
    backup_day = Column(Integer, default=0) # 0-6 (Mon-Sun)
    backup_time = Column(String, default="03:00") # HH:MM
    last_backup_at = Column(DateTime(timezone=True), nullable=True)
    last_backup_status = Column(String, nullable=True) # success, error
    
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

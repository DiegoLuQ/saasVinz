from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.utils import tz
import enum
from app.database import Base


class SubscriptionStatus(str, enum.Enum):
    """Status of a tenant subscription"""
    ACTIVE = "active"
    PENDING = "pending"
    EXPIRED = "expired"
    CANCELED = "canceled"
    TRIAL = "trial"


class BillingCycle(str, enum.Enum):
    """Billing cycle options"""
    MONTHLY = "monthly"
    BIMONTHLY = "bimonthly"
    SEMIANNUAL = "semiannual"
    ANNUAL = "annual"


class PaymentMethod(str, enum.Enum):
    """Payment method options"""
    TRANSFER = "transfer"
    STRIPE = "stripe"
    PAYPAL = "paypal"
    CASH = "cash"
    POLAR = "polar"
    MERCADOPAGO = "mercadopago"


class PaymentStatus(str, enum.Enum):
    """Payment transaction status"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class ReceiptStatus(str, enum.Enum):
    """Receipt status"""
    ACTIVE = "active"
    VOIDED = "voided"
    REPLACED = "replaced"



class TenantSubscription(Base):
    """
    Tenant subscription history and management
    Tracks all subscription periods for each tenant
    """
    __tablename__ = "sys_tenant_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    subscription_plan_id = Column(Integer, ForeignKey("sys_subscription_plans.id"), nullable=False)
    
    # Status and cycle
    status = Column(SQLEnum(SubscriptionStatus, values_callable=lambda x: [e.value for e in x]), default=SubscriptionStatus.ACTIVE, index=True)
    billing_cycle = Column(SQLEnum(BillingCycle, values_callable=lambda x: [e.value for e in x]), default=BillingCycle.MONTHLY)
    
    # Dates
    start_date = Column(DateTime(timezone=True), default=tz.get_now, nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    next_billing_date = Column(DateTime(timezone=True), nullable=True)
    
    # Pricing
    monthly_price = Column(Float, nullable=False)  # Base monthly price at time of subscription
    discount_percent = Column(Integer, default=0)  # Custom discount percentage
    final_price = Column(Float, nullable=False)    # Final price after all discounts
    
    # Audit
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)
    
    # Helper properties
    @property
    def tenant_name(self):
        return self.tenant.name if self.tenant else None

    @property
    def tenant_slug(self):
        return self.tenant.slug if self.tenant else None

    @property
    def plan_name(self):
        return self.subscription_plan.name if self.subscription_plan else None

    # Relationships
    tenant = relationship("Tenant", back_populates="subscriptions")
    subscription_plan = relationship("SubscriptionPlan")
    transactions = relationship("BillingTransaction", back_populates="subscription")


class BillingTransaction(Base):
    """
    Billing transaction records
    Tracks all payments and payment attempts
    """
    __tablename__ = "sys_billing_transactions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("sys_tenant_subscriptions.id"), nullable=True)
    
    # Payment details
    amount = Column(Float, nullable=False)
    payment_method = Column(SQLEnum(PaymentMethod, values_callable=lambda x: [e.value for e in x]), default=PaymentMethod.TRANSFER)
    payment_status = Column(SQLEnum(PaymentStatus, values_callable=lambda x: [e.value for e in x]), default=PaymentStatus.PENDING, index=True)
    payment_date = Column(DateTime(timezone=True), nullable=True, index=True)  # Actual payment date
    payment_reference = Column(String, nullable=True)  # Transaction ID, transfer number, etc.
    
    # Additional info
    notes = Column(Text, nullable=True)
    receipt_url = Column(String, nullable=True) # URL of the uploaded receipt
    
    # Plan Change Intent (for upgrades/downgrades)
    target_plan_id = Column(Integer, ForeignKey("sys_subscription_plans.id"), nullable=True)
    target_billing_cycle = Column(SQLEnum(BillingCycle, values_callable=lambda x: [e.value for e in x]), nullable=True)

    # Audit
    created_by = Column(Integer, ForeignKey("sys_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    
    # helper properties for response
    @property
    def tenant_name(self):
        return self.tenant.name if self.tenant else None
        
    @property
    def tenant_slug(self):
        return self.tenant.slug if self.tenant else None
        
    @property
    def target_plan_name(self):
        if self.target_plan:
            return self.target_plan.name
        return self.tenant.plan if self.tenant else None

    @property
    def effective_billing_cycle(self):
        if self.target_billing_cycle:
            return self.target_billing_cycle
        return self.tenant.billing_info.billing_cycle if self.tenant and self.tenant.billing_info else "monthly"

    @property
    def current_billing_end_date(self):
        return self.tenant.billing_end_date if self.tenant else None
    
    # Relationships
    tenant = relationship("Tenant")
    subscription = relationship("TenantSubscription", back_populates="transactions")
    target_plan = relationship("SubscriptionPlan", foreign_keys=[target_plan_id])
    creator = relationship("User")


class Coupon(Base):
    """
    Discount coupons for subscriptions
    """
    __tablename__ = "sys_coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    discount_percent = Column(Integer, nullable=False) # 1-100
    is_active = Column(Boolean, default=True)
    valid_until = Column(DateTime, nullable=True)
    max_uses = Column(Integer, nullable=True)
    current_uses = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)


class Receipt(Base):
    """
    Professional receipt storage with auto-incrementing numbers
    Stores generated PDFs with complete audit trail
    """
    __tablename__ = "sys_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(20), unique=True, nullable=False, index=True)  # R-000001, R-000002
    
    # Relationships
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey("sys_billing_transactions.id"), nullable=True)
    
    # Client data snapshot (at time of issuance)
    tenant_name = Column(String(255), nullable=False)
    tenant_email = Column(String(255), nullable=True)
    tenant_phone = Column(String(50), nullable=True)
    tenant_address = Column(Text, nullable=True)
    
    # Issuer (SaaS) data snapshot
    issuer_name = Column(String(255), nullable=True)
    issuer_rut = Column(String(50), nullable=True)
    issuer_address = Column(Text, nullable=True)
    issuer_email = Column(String(255), nullable=True)
    issuer_logo_url = Column(Text, nullable=True)
    
    # Subscription data
    plan_name = Column(String(100), nullable=False)
    billing_cycle = Column(String(20), nullable=False)  # monthly, quarterly, yearly
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="CLP")
    
    # Covered period
    period_start_date = Column(DateTime(timezone=True), nullable=False)
    period_end_date = Column(DateTime(timezone=True), nullable=False)
    
    # PDF file
    pdf_url = Column(Text, nullable=False)  # /storage/receipts/{tenant_id}/R-000001.pdf
    pdf_size_bytes = Column(Integer, nullable=True)
    
    # Template metadata
    template_id = Column(Integer, ForeignKey("ops_certificate_templates.id"), nullable=True)
    template_snapshot = Column(Text, nullable=True)  # JSON string of sections_config used
    
    # Status and audit
    status = Column(SQLEnum(ReceiptStatus, values_callable=lambda x: [e.value for e in x]), default=ReceiptStatus.ACTIVE, index=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)
    voided_by = Column(Integer, ForeignKey("sys_users.id"), nullable=True)
    void_reason = Column(Text, nullable=True)
    
    # Replacement tracking (simple integer fields, no FK constraints for now)
    replaced_by_receipt_id = Column(Integer, nullable=True)
    replaces_receipt_id = Column(Integer, nullable=True)
    
    # Timestamps
    issued_at = Column(DateTime(timezone=True), default=tz.get_now, nullable=False, index=True)
    issued_by = Column(Integer, ForeignKey("sys_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)
    
    # Relationships
    tenant = relationship("Tenant")
    transaction = relationship("BillingTransaction")
    template = relationship("CertificateTemplate")
    issuer = relationship("User", foreign_keys=[issued_by])
    voider = relationship("User", foreign_keys=[voided_by])



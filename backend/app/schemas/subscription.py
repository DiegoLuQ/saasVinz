from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums for Pydantic schemas
class SubscriptionStatusEnum(str, Enum):
    ACTIVE = "active"
    PENDING = "pending"
    EXPIRED = "expired"
    CANCELED = "canceled"
    TRIAL = "trial"


class BillingCycleEnum(str, Enum):
    MONTHLY = "monthly"
    BIMONTHLY = "bimonthly"
    SEMIANNUAL = "semiannual"
    ANNUAL = "annual"


class PaymentMethodEnum(str, Enum):
    TRANSFER = "transfer"
    STRIPE = "stripe"
    PAYPAL = "paypal"
    CASH = "cash"


class PaymentStatusEnum(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


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


class TenantSubscriptionResponse(TenantSubscriptionBase):
    id: int
    tenant_id: int
    start_date: datetime
    end_date: datetime
    next_billing_date: datetime
    monthly_price: float
    final_price: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# BillingTransaction Schemas
# BillingTransaction Schemas
class BillingTransactionBase(BaseModel):
    amount: float = Field(gt=0)
    payment_method: PaymentMethodEnum = PaymentMethodEnum.TRANSFER
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    target_plan_id: Optional[int] = None
    target_billing_cycle: Optional[BillingCycleEnum] = None


class BillingTransactionCreate(BillingTransactionBase):
    tenant_id: int
    subscription_id: Optional[int] = None
    payment_date: Optional[datetime] = None


class BillingTransactionUpdate(BaseModel):
    payment_status: Optional[PaymentStatusEnum] = None
    payment_date: Optional[datetime] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None


class BillingTransactionResponse(BillingTransactionBase):
    id: int
    tenant_id: int
    subscription_id: Optional[int]
    payment_status: PaymentStatusEnum
    payment_date: Optional[datetime]
    created_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# Enhanced SubscriptionPlan schemas
class SubscriptionPlanFeature(BaseModel):
    """Individual feature for a subscription plan"""
    name: str
    included: bool = True
    limit: Optional[int] = None


class SubscriptionPlanUpdate(BaseModel):
    """Schema for updating subscription plan"""
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[float] = Field(default=None, ge=0)
    annual_price: Optional[float] = Field(default=None, ge=0)
    max_pets: Optional[int] = Field(default=None, ge=0)
    max_services: Optional[int] = Field(default=None, ge=0)
    max_plans: Optional[int] = Field(default=None, ge=0)
    max_products: Optional[int] = Field(default=None, ge=0)
    max_orders: Optional[int] = Field(default=None, ge=0)
    max_customers: Optional[int] = Field(default=None, ge=0)
    max_users: Optional[int] = Field(default=None, ge=0)
    max_partners: Optional[int] = Field(default=None, ge=0)
    allowed_modules: Optional[List[str]] = None
    features: Optional[List[dict]] = None
    can_delete: Optional[bool] = None
    can_export: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class ChangePlanRequest(BaseModel):
    """Request payload for changing subscription plan"""
    plan_id: int
    billing_cycle: BillingCycleEnum
    coupon_code: Optional[str] = None


# Coupon Schemas
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

    class Config:
        from_attributes = True

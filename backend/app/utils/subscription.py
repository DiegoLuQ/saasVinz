"""
Utility functions for subscription management
Handles price calculations, date calculations, and business logic
"""
from datetime import datetime, timedelta
from typing import Dict, Optional
from dateutil.relativedelta import relativedelta
from app.utils import tz


# Días de gracia tras el vencimiento antes de aplicar el bloqueo de módulos.
# Debe coincidir con la lógica histórica de auth.py.
GRACE_PERIOD_DAYS = 3

# Módulos que SIGUEN accesibles cuando la suscripción está en lockdown
# (post-gracia). El tenant puede entrar a Configuración -> Facturación para
# regularizar el pago, y ver el Dashboard en modo lectura.
ALLOWED_MODULES_WHEN_LOCKED = {"configuracion", "dashboard", "perfil"}


def is_subscription_locked(tenant) -> bool:
    """
    Indica si un tenant superó el período de gracia tras el vencimiento y, por
    tanto, todos sus módulos (excepto los de ALLOWED_MODULES_WHEN_LOCKED) deben
    bloquearse hasta que regularice el pago.

    Reglas (coinciden con la validación de auth.py):
    - Planes FREE nunca se bloquean.
    - Sin billing_end_date no hay bloqueo.
    - Se bloquea cuando ahora > billing_end_date + GRACE_PERIOD_DAYS.
    """
    if tenant is None:
        return False

    # Estados administrativos manejan su propio bloqueo aparte.
    plan = getattr(tenant, "plan", None)
    if plan == "FREE":
        return False

    billing_end_date = getattr(tenant, "billing_end_date", None)
    if not billing_end_date:
        return False

    now = datetime.utcnow()
    limit_date = billing_end_date + timedelta(days=GRACE_PERIOD_DAYS)
    return now > limit_date


def get_months_for_cycle(billing_cycle: str) -> int:
    """
    Get number of months for a billing cycle
    
    Args:
        billing_cycle: monthly, bimonthly, semiannual, or annual
    
    Returns:
        Number of months in the cycle
    """
    cycle_map = {
        "monthly": 1,
        "bimonthly": 2,
        "semiannual": 6,
        "annual": 12
    }
    return cycle_map.get(billing_cycle, 1)


def get_cycle_discount(billing_cycle: str) -> float:
    """
    Get automatic discount percentage for billing cycle
    Longer cycles get better discounts
    
    Args:
        billing_cycle: Billing cycle type
    
    Returns:
        Discount as decimal (0.15 = 15%)
    """
    discounts = {
        "annual": 0.15,      # 15% discount
        "semiannual": 0.10,  # 10% discount
        "bimonthly": 0.05,   # 5% discount
        "monthly": 0.00      # No discount
    }
    return discounts.get(billing_cycle, 0.00)


def calculate_subscription_price(
    monthly_price: float,
    billing_cycle: str,
    custom_discount_percent: int = 0,
    coupon_discount_percent: int = 0
) -> Dict[str, float]:
    """
    Calculate final subscription price with all discounts applied
    
    Args:
        monthly_price: Base monthly price from plan
        billing_cycle: Billing cycle type
        custom_discount_percent: Additional custom discount for this specific tenant (0-100)
        coupon_discount_percent: Discount from a promotional coupon (0-100)
    
    Returns:
        Dictionary with price breakdown
    """
    months = get_months_for_cycle(billing_cycle)
    cycle_discount = get_cycle_discount(billing_cycle)
    custom_discount = custom_discount_percent / 100.0
    coupon_discount = coupon_discount_percent / 100.0
    
    # Calculate prices
    subtotal = monthly_price * months
    
    # 1. Apply cycle discount
    intermediate_price = subtotal * (1 - cycle_discount)
    
    # 2. Apply custom discount
    intermediate_price = intermediate_price * (1 - custom_discount)
    
    # 3. Apply coupon discount
    final_price = intermediate_price * (1 - coupon_discount)
    
    savings = subtotal - final_price
    
    return {
        "monthly_price": monthly_price,
        "months": months,
        "subtotal": round(subtotal, 2),
        "cycle_discount_percent": round(cycle_discount * 100, 2),
        "custom_discount_percent": custom_discount_percent,
        "coupon_discount_percent": coupon_discount_percent,
        "final_price": round(final_price, 2),
        "savings": round(savings, 2),
        "price_per_month": round(final_price / months, 2)
    }


def calculate_next_billing_date(
    start_date: datetime,
    billing_cycle: str
) -> datetime:
    """
    Calculate the next billing or expiration date based on start date and cycle
    
    Args:
        start_date: Subscription start date
        billing_cycle: Billing cycle type
        
    Returns:
        Next validity date
    """
    months = get_months_for_cycle(billing_cycle)
    return start_date + relativedelta(months=months)


def calculate_end_date(
    start_date: datetime,
    billing_cycle: str
) -> datetime:
    """
    Calculate subscription end date
    
    Args:
        start_date: Subscription start date
        billing_cycle: Billing cycle type
        
    Returns:
        Subscription end date
    """
    return calculate_next_billing_date(start_date, billing_cycle)


def calculate_days_remaining(end_date: datetime) -> int:
    """
    Calculate days remaining until subscription expires
    
    Args:
        end_date: Subscription end date
        
    Returns:
        Number of days remaining (negative if expired)
    """
    now = tz.get_now()
    delta = end_date - now
    return delta.days


def check_subscription_status(
    status: str,
    end_date: datetime
) -> tuple[str, bool]:
    """
    Check and validate subscription status
    
    Args:
        status: Current subscription status
        end_date: Subscription end date
        
    Returns:
        Tuple of (actual_status, needs_update)
    """
    days_remaining = calculate_days_remaining(end_date)
    
    # Check if expired
    if days_remaining < 0 and status == "active":
        return ("expired", True)
    
    # Check if should be active
    if days_remaining >= 0 and status == "expired":
        return ("active", True)
    
    return (status, False)


def validate_subscription_data(
    tenant_id: int,
    plan_id: int,
    start_date: Optional[datetime] = None
) -> Dict[str, any]:
    """
    Validate subscription creation data
    
    Args:
        tenant_id: Tenant ID
        plan_id: Subscription plan ID
        start_date: Optional start date
        
    Returns:
        Validation result with any errors
    """
    errors = []
    
    if tenant_id <= 0:
        errors.append("Invalid tenant_id")
    
    if plan_id <= 0:
        errors.append("Invalid plan_id")
    
    if start_date and start_date < tz.get_now() - timedelta(days=30):
        errors.append("Start date cannot be more than 30 days in the past")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


def calculate_mrr(subscriptions: list) -> Dict[str, float]:
    """
    Calculate Monthly Recurring Revenue from active subscriptions
    
    Args:
        subscriptions: List of active subscription objects
        
    Returns:
        MRR breakdown by plan
    """
    total_mrr = 0.0
    mrr_by_plan = {}
    
    for sub in subscriptions:
        if sub.status == "active":
            # Normalize to monthly
            months = get_months_for_cycle(sub.billing_cycle)
            monthly_revenue = sub.final_price / months
            total_mrr += monthly_revenue
            
            # Group by plan
            plan_name = getattr(sub.subscription_plan, 'name', 'Unknown')
            if plan_name not in mrr_by_plan:
                mrr_by_plan[plan_name] = 0.0
            mrr_by_plan[plan_name] += monthly_revenue
    
    return {
        "total_mrr": round(total_mrr, 2),
        "arr": round(total_mrr * 12, 2),  # Annual Recurring Revenue
        "by_plan": {k: round(v, 2) for k, v in mrr_by_plan.items()}
    }

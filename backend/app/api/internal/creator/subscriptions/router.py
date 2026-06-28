"""
Subscription Management API Endpoints
Handles CRUD operations for tenant subscriptions and billing transactions
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.auth import get_current_creator
from app.api.internal.admin.models import Tenant, SubscriptionPlan, TenantBillingInfo
from app.api.internal.auth.models import User
from app.utils import tz
from app.api.internal.creator.subscriptions.models import TenantSubscription, BillingTransaction, Coupon
from app.schemas import (
    TenantSubscriptionCreate,
    TenantSubscriptionUpdate,
    TenantSubscriptionResponse,
    BillingTransactionCreate,
    BillingTransactionUpdate,
    BillingTransactionResponse,
    SubscriptionPlanUpdate,
    CouponCreate,
    CouponUpdate,
    CouponResponse
)
from app.utils.subscription import (
    calculate_subscription_price,
    calculate_next_billing_date,
    calculate_days_remaining,
    check_subscription_status,
    calculate_mrr
)

router = APIRouter()


# ==========================================
# SUBSCRIPTION ENDPOINTS
# ==========================================

@router.get("/tenants/{identifier}/subscription", response_model=Optional[TenantSubscriptionResponse])
async def get_tenant_active_subscription(
    identifier: str,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get the active subscription for a tenant
    Returns the most recent active subscription
    """
    # Find tenant by ID or slug
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get active subscription
    subscription = db.query(TenantSubscription).filter(
        and_(
            TenantSubscription.tenant_id == tenant.id,
            TenantSubscription.status == "active"
        )
    ).order_by(desc(TenantSubscription.created_at)).first()
    
    if not subscription:
        return None
    
    # Check if status needs update
    actual_status, needs_update = check_subscription_status(
        subscription.status,
        subscription.end_date
    )
    
    if needs_update:
        subscription.status = actual_status
        db.commit()
        db.refresh(subscription)
    
    return subscription


@router.get("/subscriptions", response_model=List[TenantSubscriptionResponse])
async def get_all_subscriptions(
    status: Optional[str] = None,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get all tenant subscriptions (global)
    Used for monitoring all active and expired subscriptions
    """
    query = db.query(TenantSubscription)
    if status:
        query = query.filter(TenantSubscription.status == status)
    
    return query.order_by(desc(TenantSubscription.created_at)).all()


@router.post("/tenants/{identifier}/subscription", response_model=TenantSubscriptionResponse)
async def create_tenant_subscription(
    identifier: str,
    subscription_data: TenantSubscriptionCreate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Create a new subscription for a tenant
    Automatically calculates dates and prices
    """
    # Find tenant
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Check if tenant already has an active subscription
    existing = db.query(TenantSubscription).filter(
        and_(
            TenantSubscription.tenant_id == tenant.id,
            TenantSubscription.status == "active"
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Tenant already has an active subscription. Cancel or expire it first."
        )
    
    # Get subscription plan
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == subscription_data.subscription_plan_id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")
    
    # Calculate pricing
    monthly_price = subscription_data.monthly_price or plan.price
    price_calc = calculate_subscription_price(
        monthly_price,
        subscription_data.billing_cycle,
        subscription_data.discount_percent
    )
    
    # Calculate dates
    start_date = subscription_data.start_date or datetime.utcnow()
    end_date = calculate_next_billing_date(start_date, subscription_data.billing_cycle)
    next_billing = end_date
    
    # Create subscription
    new_subscription = TenantSubscription(
        tenant_id=tenant.id,
        subscription_plan_id=plan.id,
        status=subscription_data.status,
        billing_cycle=subscription_data.billing_cycle,
        start_date=start_date,
        end_date=end_date,
        next_billing_date=next_billing,
        monthly_price=monthly_price,
        discount_percent=subscription_data.discount_percent,
        final_price=price_calc["final_price"]
    )
    
    db.add(new_subscription)
    
    # Update tenant's subscription_plan_id
    tenant.subscription_plan_id = plan.id
    
    db.commit()
    db.refresh(new_subscription)
    
    return new_subscription


@router.put("/tenants/{identifier}/subscription/{subscription_id}", response_model=TenantSubscriptionResponse)
async def update_tenant_subscription(
    identifier: str,
    subscription_id: int,
    update_data: TenantSubscriptionUpdate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Update an existing subscription
    Can change plan, status, cycle, or dates
    """
    # Find subscription
    subscription = db.query(TenantSubscription).filter(
        TenantSubscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Update fields
    if update_data.subscription_plan_id:
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.id == update_data.subscription_plan_id
        ).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        subscription.subscription_plan_id = plan.id
        subscription.monthly_price = plan.price
    
    if update_data.status:
       subscription.status = update_data.status
    
    if update_data.billing_cycle:
        subscription.billing_cycle = update_data.billing_cycle
        # Recalculate end date
        subscription.end_date = calculate_next_billing_date(
            subscription.start_date,
            update_data.billing_cycle
        )
    
    if update_data.discount_percent is not None:
        subscription.discount_percent = update_data.discount_percent
    
    if update_data.end_date:
        subscription.end_date = update_data.end_date
    
    # Recalculate price
    price_calc = calculate_subscription_price(
        subscription.monthly_price,
        subscription.billing_cycle,
        subscription.discount_percent
    )
    subscription.final_price = price_calc["final_price"]
    
    db.commit()
    db.refresh(subscription)
    
    return subscription


@router.get("/tenants/{identifier}/subscription/history", response_model=List[TenantSubscriptionResponse])
async def get_tenant_subscription_history(
    identifier: str,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get full subscription history for a tenant
    Returns all subscriptions ordered by date
    """
    # Find tenant
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    subscriptions = db.query(TenantSubscription).filter(
        TenantSubscription.tenant_id == tenant.id
    ).order_by(desc(TenantSubscription.created_at)).all()
    
    return subscriptions


# ==========================================
# BILLING TRANSACTION ENDPOINTS
# ==========================================

@router.get("/tenants/{identifier}/billing/transactions", response_model=List[BillingTransactionResponse])
async def get_tenant_transactions(
    identifier: str,
    payment_status: Optional[str] = None,
    limit: int = 50,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get billing transactions for a tenant
    Optional filter by payment_status
    """
    # Find tenant
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    query = db.query(BillingTransaction).filter(
        BillingTransaction.tenant_id == tenant.id
    )
    
    if payment_status:
        query = query.filter(BillingTransaction.payment_status == payment_status)
    
    transactions = query.order_by(
        desc(BillingTransaction.created_at)
    ).limit(limit).all()
    
    return transactions


@router.post("/tenants/{identifier}/billing/transactions", response_model=BillingTransactionResponse)
async def create_billing_transaction(
    identifier: str,
    transaction_data: BillingTransactionCreate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Record a new billing transaction
    Optionally link to a specific subscription
    """
    # Find tenant
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Create transaction
    new_transaction = BillingTransaction(
        tenant_id=tenant.id,
        subscription_id=transaction_data.subscription_id,
        amount=transaction_data.amount,
        payment_method=transaction_data.payment_method,
        payment_status="pending",  # Always starts as pending
        payment_date=transaction_data.payment_date,
        payment_reference=transaction_data.payment_reference,
        notes=transaction_data.notes,
        target_plan_id=transaction_data.target_plan_id,
        target_billing_cycle=transaction_data.target_billing_cycle,
        created_by=current_creator.id,
        created_at=tz.get_now()
    )
    
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    
    return new_transaction


@router.put("/tenants/{identifier}/billing/transactions/{transaction_id}", response_model=BillingTransactionResponse)
async def update_billing_transaction(
    identifier: str,
    transaction_id: int,
    update_data: BillingTransactionUpdate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Update a billing transaction
    When marking as 'completed', automatically renews the associated subscription
    """
    transaction = db.query(BillingTransaction).filter(
        BillingTransaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Store old status to detect changes
    old_status = transaction.payment_status
    
    # Update transaction fields
    if update_data.payment_status:
        transaction.payment_status = update_data.payment_status
        # If marking as completed, set payment_date if not set
        if update_data.payment_status == "completed" and not transaction.payment_date:
            transaction.payment_date = tz.get_now()
    
    if update_data.payment_date:
        transaction.payment_date = update_data.payment_date
    
    if update_data.payment_reference:
        transaction.payment_reference = update_data.payment_reference
    
    if update_data.notes:
        transaction.notes = update_data.notes
    
    if update_data.target_plan_id:
        transaction.target_plan_id = update_data.target_plan_id
    
    # AUTO-RENEWAL / PLAN CHANGE LOGIC
    if old_status != "completed" and transaction.payment_status == "completed":
        # 1. Handling case where subscription_id is missing but we have a target plan 
        # (Usually first payment or plan change requested via transaction)
        if not transaction.subscription_id and transaction.target_plan_id:
            print(f"[SUBSCRIPTION] Creating new subscription for tenant {transaction.tenant_id} on plan {transaction.target_plan_id}")
            
            new_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == transaction.target_plan_id).first()
            if new_plan:
                cycle = transaction.target_billing_cycle or "monthly"
                start_date = tz.get_now()
                
                # USE CUSTOM DATE IF PROVIDED
                if update_data.end_date:
                    end_date = update_data.end_date
                else:
                    end_date = calculate_next_billing_date(start_date, cycle)
                
                price_calc = calculate_subscription_price(new_plan.price, cycle)
                
                new_sub = TenantSubscription(
                    tenant_id=transaction.tenant_id,
                    subscription_plan_id=new_plan.id,
                    status="active",
                    billing_cycle=cycle,
                    start_date=start_date,
                    end_date=end_date,
                    next_billing_date=end_date,
                    monthly_price=new_plan.price,
                    discount_percent=0,
                    final_price=price_calc["final_price"],
                    created_at=tz.get_now()
                )
                db.add(new_sub)
                db.flush() # Get ID
                transaction.subscription_id = new_sub.id
                
                # Update Tenant FK and legacy plan name
                tenant = db.query(Tenant).filter(Tenant.id == transaction.tenant_id).first()
                if tenant:
                    tenant.subscription_plan_id = new_plan.id
                    tenant.plan = new_plan.name
                    tenant.billing_end_date = end_date
                
                modified_end_date = end_date
        
        # 2. Existing subscription logic
        elif transaction.subscription_id:
            subscription = db.query(TenantSubscription).filter(
                TenantSubscription.id == transaction.subscription_id
            ).first()
            
            if subscription:
                modified_end_date = None
                
                if transaction.target_plan_id:
                    # === PLAN CHANGE ===
                    print(f"[PLAN CHANGE] Switching subscription {subscription.id} to plan {transaction.target_plan_id}")
                    
                    new_plan = db.query(SubscriptionPlan).filter(
                        SubscriptionPlan.id == transaction.target_plan_id
                    ).first()
                    
                    if new_plan:
                        subscription.subscription_plan_id = new_plan.id
                        if transaction.target_billing_cycle:
                            subscription.billing_cycle = transaction.target_billing_cycle
                        
                        subscription.monthly_price = new_plan.price
                        price_calc = calculate_subscription_price(
                            new_plan.price,
                            subscription.billing_cycle,
                            subscription.discount_percent
                        )
                        subscription.final_price = price_calc["final_price"]
                        
                        start_date = tz.get_now()
                        subscription.start_date = start_date
                        
                        # USE CUSTOM DATE IF PROVIDED
                        if update_data.end_date:
                            subscription.end_date = update_data.end_date
                        else:
                            subscription.end_date = calculate_next_billing_date(start_date, subscription.billing_cycle)
                        
                        modified_end_date = subscription.end_date
                        
                        tenant = db.query(Tenant).filter(Tenant.id == subscription.tenant_id).first()
                        if tenant:
                            tenant.subscription_plan_id = new_plan.id
                            tenant.plan = new_plan.name
                else:
                    # === REGULAR RENEWAL ===
                    # USE CUSTOM DATE IF PROVIDED
                    if update_data.end_date:
                        new_end_date = update_data.end_date
                    else:
                        new_end_date = calculate_next_billing_date(
                            subscription.end_date,
                            subscription.billing_cycle
                        )
                    subscription.end_date = new_end_date
                    modified_end_date = new_end_date
                
                if subscription.status in ["expired", "pending", "canceled"]:
                    subscription.status = "active"
                
                subscription.updated_at = tz.get_now()

        # === UNIVERSAL SYNC AFTER COMPLETION ===
        if old_status != "completed" and transaction.payment_status == "completed":
            tenant = db.query(Tenant).filter(Tenant.id == transaction.tenant_id).first()
            if tenant:
                # Use current subscription for data if not already set by logic above
                current_sub = None
                if transaction.subscription_id:
                    current_sub = db.query(TenantSubscription).filter(TenantSubscription.id == transaction.subscription_id).first()
                
                final_end_date = modified_end_date or (current_sub.end_date if current_sub else None)
                
                if final_end_date:
                    tenant.billing_end_date = final_end_date
                
                tenant.last_payment_date = transaction.payment_date or tz.get_now()
                tenant.last_payment_method = transaction.payment_method
                
                if tenant.billing_info:
                    tenant.billing_info.last_payment_date = tenant.last_payment_date
                    tenant.billing_info.last_payment_method = tenant.last_payment_method
                    
                    # Update price in billing_info
                    if transaction.target_plan_id:
                        new_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == transaction.target_plan_id).first()
                        if new_plan:
                            tenant.billing_info.monthly_price = new_plan.price
                    elif current_sub:
                        tenant.billing_info.monthly_price = current_sub.monthly_price

    db.commit()
    db.refresh(transaction)

    # Generate automatic receipt if just completed
    if old_status != "completed" and transaction.payment_status == "completed":
        from app.api.internal.creator.subscriptions.service import ReceiptService
        ReceiptService.create_receipt_from_transaction(db, transaction.id)
    
    return transaction


@router.get("/billing/pending-requests", response_model=List[BillingTransactionResponse])
async def get_pending_billing_requests(
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get all pending billing transactions (global)
    Used for Admin Approval Queue
    """
    transactions = db.query(BillingTransaction).filter(
        BillingTransaction.payment_status == "pending"
    ).order_by(BillingTransaction.created_at.asc()).all()
    
    return transactions


@router.get("/billing/transactions/summary")
async def get_transactions_summary(
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get aggregated counts and amounts for billing transactions, optionally filtered by search and dates.
    """
    query = db.query(BillingTransaction)
    
    if search:
        search_term = f"%{search}%"
        query = query.join(Tenant).filter(
            (Tenant.name.ilike(search_term)) |
            (Tenant.slug.ilike(search_term)) |
            (BillingTransaction.notes.ilike(search_term)) |
            (BillingTransaction.payment_reference.ilike(search_term))
        )
        
    if date_from:
        try:
            from_dt = datetime.fromisoformat(date_from)
            query = query.filter(BillingTransaction.created_at >= from_dt)
        except Exception:
            pass
    if date_to:
        try:
            to_dt = datetime.fromisoformat(date_to)
            query = query.filter(BillingTransaction.created_at <= to_dt)
        except Exception:
            pass
            
    transactions = query.all()
    
    summary = {
        "completed": {"count": 0, "total_amount": 0.0, "avg_amount": 0.0},
        "pending": {"count": 0, "total_amount": 0.0, "avg_amount": 0.0},
        "failed": {"count": 0, "total_amount": 0.0, "avg_amount": 0.0},
        "refunded": {"count": 0, "total_amount": 0.0, "avg_amount": 0.0}
    }
    
    for t in transactions:
        status = t.payment_status
        if status in summary:
            summary[status]["count"] += 1
            summary[status]["total_amount"] += t.amount
            
    for status in summary:
        count = summary[status]["count"]
        if count > 0:
            summary[status]["avg_amount"] = summary[status]["total_amount"] / count
            
    return summary


@router.get("/billing/transactions/export")
async def export_transactions_csv(
    status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Export billing transactions as a CSV file.
    """
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    query = db.query(BillingTransaction)
    
    if status and status != 'all':
        query = query.filter(BillingTransaction.payment_status == status)
        
    if search:
        search_term = f"%{search}%"
        query = query.join(Tenant).filter(
            (Tenant.name.ilike(search_term)) |
            (Tenant.slug.ilike(search_term)) |
            (BillingTransaction.notes.ilike(search_term)) |
            (BillingTransaction.payment_reference.ilike(search_term))
        )
        
    if date_from:
        try:
            from_dt = datetime.fromisoformat(date_from)
            query = query.filter(BillingTransaction.created_at >= from_dt)
        except Exception:
            pass
    if date_to:
        try:
            to_dt = datetime.fromisoformat(date_to)
            query = query.filter(BillingTransaction.created_at <= to_dt)
        except Exception:
            pass
            
    transactions = query.order_by(desc(BillingTransaction.created_at)).all()
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    writer.writerow([
        "ID", "Tenant/Empresa", "Slug", "Plan", "Monto", "Metodo de Pago", 
        "Referencia/Recibo", "Estado", "Fecha Pago", "Vigente Hasta", "Fecha Creacion", "Notas"
    ])
    
    for t in transactions:
        writer.writerow([
            t.id,
            t.tenant_name,
            t.tenant_slug,
            t.target_plan_name,
            t.amount,
            t.payment_method,
            t.payment_reference,
            t.payment_status,
            t.payment_date.isoformat() if t.payment_date else "",
            t.current_billing_end_date.isoformat() if t.current_billing_end_date else "",
            t.created_at.isoformat() if t.created_at else "",
            t.notes or ""
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions_export.csv"}
    )


@router.get("/billing/transactions")
async def get_all_transactions(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get all billing transactions (global) with pagination and filters.
    """
    query = db.query(BillingTransaction)
    
    if status and status != 'all':
        query = query.filter(BillingTransaction.payment_status == status)
        
    if search:
        search_term = f"%{search}%"
        query = query.join(Tenant).filter(
            (Tenant.name.ilike(search_term)) |
            (Tenant.slug.ilike(search_term)) |
            (BillingTransaction.notes.ilike(search_term)) |
            (BillingTransaction.payment_reference.ilike(search_term))
        )
        
    if date_from:
        try:
            from_dt = datetime.fromisoformat(date_from)
            query = query.filter(BillingTransaction.created_at >= from_dt)
        except Exception:
            pass
    if date_to:
        try:
            to_dt = datetime.fromisoformat(date_to)
            query = query.filter(BillingTransaction.created_at <= to_dt)
        except Exception:
            pass
            
    total = query.count()
    
    offset = (page - 1) * page_size
    transactions = query.order_by(desc(BillingTransaction.created_at)).offset(offset).limit(page_size).all()
    
    import math
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    
    serialized_txs = [BillingTransactionResponse.model_validate(t) for t in transactions]
    
    return {
        "transactions": serialized_txs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }



# ==========================================
# ANALYTICS ENDPOINTS
# ==========================================

@router.get("/analytics/mrr")
async def get_mrr_analytics(
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Calculate Monthly Recurring Revenue (MRR) across all tenants
    Returns total MRR, ARR, and breakdown by plan
    """
    # Get all active subscriptions
    active_subscriptions = db.query(TenantSubscription).filter(
        TenantSubscription.status == "active"
    ).all()
    
    # Calculate MRR
    mrr_data = calculate_mrr(active_subscriptions)
    
    return {
        **mrr_data,
        "active_subscriptions": len(active_subscriptions)
    }


# ==========================================
# COUPON ENDPOINTS (Creator Only)
# ==========================================

@router.get("/coupons", response_model=List[CouponResponse])
async def get_all_coupons(
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """List all coupons available in the system"""
    return db.query(Coupon).all()


@router.post("/coupons", response_model=CouponResponse)
async def create_coupon(
    coupon_data: CouponCreate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Create a new discount coupon"""
    # Check if code already exists
    existing = db.query(Coupon).filter(Coupon.code == coupon_data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    new_coupon = Coupon(
        code=coupon_data.code.upper(),
        discount_percent=coupon_data.discount_percent,
        is_active=coupon_data.is_active,
        valid_until=coupon_data.valid_until,
        max_uses=coupon_data.max_uses
    )
    
    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)
    return new_coupon


@router.get("/coupons/{coupon_id}", response_model=CouponResponse)
async def get_coupon_detail(
    coupon_id: int,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Get details for a specific coupon"""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon


@router.put("/coupons/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: int,
    update_data: CouponUpdate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Update coupon properties"""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(coupon, field, value)
    
    db.commit()
    db.refresh(coupon)
    return coupon


@router.delete("/coupons/{coupon_id}")
async def delete_coupon(
    coupon_id: int,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Delete a coupon from the system"""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted successfully"}


@router.get("/coupons/validate/{code}")
async def validate_coupon(
    code: str,
    db: Session = Depends(get_db)
):
    """
    Validate a coupon code and return its discount
    Returns 404 if invalid or expired
    """
    coupon = db.query(Coupon).filter(
        Coupon.code == code.upper(),
        Coupon.is_active == True
    ).first()
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupón no válido")
    
    # Check expiry
    if coupon.valid_until and coupon.valid_until < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El cupón ha expirado")
    
    # Check max uses
    if coupon.max_uses is not None and coupon.current_uses >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="El cupón ha alcanzado su límite de usos")
    
    return {
        "code": coupon.code,
        "discount_percent": coupon.discount_percent,
        "valid": True
    }

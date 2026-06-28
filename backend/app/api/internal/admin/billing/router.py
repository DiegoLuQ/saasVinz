from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app import models
from app import schemas
from app.api.deps import get_current_user, get_tenant
from typing import List, Optional
from datetime import datetime, date as date_type
from app.utils import tz
from pydantic import BaseModel
import os
import uuid
from app.api.internal.common.media_service import MediaService
from app.api.internal.creator.subscriptions.models import SubscriptionStatus, BillingCycle, SubscriptionStatus as SubStatus, BillingTransaction

router = APIRouter()

@router.get("/plans", response_model=List[schemas.SubscriptionPlanInDB])
def get_available_plans(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all active subscription plans available for upgrade/downgrade.
    Accessible to Tenant Admins.
    """
    return db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.is_active == True).all()

@router.get("/history", response_model=List[schemas.BillingTransactionResponse])
def get_billing_history(
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_tenant)
):
    """
    List all billing transactions for the current tenant.
    """
    return db.query(BillingTransaction).filter(
        BillingTransaction.tenant_id == tenant.id
    ).order_by(desc(BillingTransaction.created_at)).all()

@router.post("/change-plan-request")
def request_plan_change(
    request: schemas.ChangePlanRequest,
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_tenant),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new transaction for a plan change request.
    """
    # 1. Get Plan
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == request.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # 2. Check for existing pending request of same type
    existing = db.query(BillingTransaction).filter(
        BillingTransaction.tenant_id == tenant.id,
        BillingTransaction.payment_status == "pending",
        BillingTransaction.target_plan_id == request.plan_id
    ).first()
    
    if existing:
        return {"message": "Ya existe una solicitud pendiente para este plan.", "transaction_id": existing.id}

    # 3. Create Pending Transaction
    new_tx = BillingTransaction(
        tenant_id=tenant.id,
        amount=plan.price if request.billing_cycle == "monthly" else (plan.annual_price or plan.price * 10), # Simple logic
        payment_status="pending",
        payment_method="transfer",
        target_plan_id=request.plan_id,
        target_billing_cycle=request.billing_cycle,
        notes=f"Solicitud de cambio de plan a {plan.name} ({request.billing_cycle})",
        created_by=current_user.id
    )
    
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    
    # 4. Notify Creators (Admins)
    try:
        from app.api.internal.common.models import Notification
        new_notif = Notification(
            title=f"Solicitud de Cambio de Plan: {tenant.name}",
            message=f"El tenant {tenant.name} ha solicitado cambiar al plan {plan.name} ({request.billing_cycle}).",
            type="plan_change_request",
            tenant_id=None, # System notification
            is_read=False,
            data={
                "transaction_id": new_tx.id,
                "tenant_id": tenant.id,
                "target_plan_id": request.plan_id
            }
        )
        db.add(new_notif)
        db.commit()
    except Exception as e:
        print(f"[ERROR] Error creating plan change notification: {e}")

    return {"message": "Solicitud creada exitosamente", "transaction_id": new_tx.id}

@router.post("/report-payment")
async def report_payment(
    amount: float = File(...),
    date: datetime = File(...),
    notes: Optional[str] = File(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant: models.Tenant = Depends(get_tenant),
    current_user: models.User = Depends(get_current_user)
):
    """
    Report a payment with a receipt image.
    Creates or updates a pending transaction.
    """
    # 1. Save File
    upload_dir = f"app/static/tenants/{tenant.id}/receipts"
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = file.filename.split(".")[-1]
    filename = f"receipt_{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(upload_dir, filename)
    
    saved_url = None
    
    # Temporary save for processing
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = file.filename.split(".")[-1]
    temp_path = os.path.join(temp_dir, f"receipt_{uuid.uuid4().hex}.{ext}")
    
    with open(temp_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(file.file, buffer)

    try:
        if file.content_type.startswith("image/"):
            # Use MediaService with "original" mode for high fidelity receipts
            media_item = MediaService.upload_media(
                db=db,
                local_path=temp_path,
                media_type="image",
                category="receipts",
                ratio="original",
                description=f"Recibo de pago - {tenant.name}",
                alt_text=f"Recibo {tenant.name}",
                processing_mode="original",
                custom_prefix=f"receipt_{tenant.id}",
                tenant_id=tenant.id
            )
            saved_url = media_item.url
        else:
            # Fallback for non-image receipts (PDF, etc) - though MediaService currently handles images best
            # For now we'll just keep the local save or handle it manually if we want R2
            saved_url = f"/static/tenants/{tenant.id}/receipts/{os.path.basename(temp_path)}"
            # Move to final location or upload to R2 manually
            # To simplify, we'll keep the legacy behavior for non-images but using the temp_path
            upload_dir = f"app/static/tenants/{tenant.id}/receipts"
            os.makedirs(upload_dir, exist_ok=True)
            final_path = os.path.join(upload_dir, os.path.basename(temp_path))
            shutil.copy2(temp_path, final_path)
            saved_url = f"/static/tenants/{tenant.id}/receipts/{os.path.basename(temp_path)}"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    # 2. Find or Create Transaction
    # Look for a pending transaction
    transaction = db.query(BillingTransaction).filter(
        BillingTransaction.tenant_id == tenant.id,
        BillingTransaction.payment_status == "pending"
    ).order_by(desc(BillingTransaction.created_at)).first()

    if not transaction:
        # Link to the currently active subscription if it exists
        active_sub = db.query(models.TenantSubscription).filter(
            models.TenantSubscription.tenant_id == tenant.id,
            models.TenantSubscription.status == "active"
        ).order_by(desc(models.TenantSubscription.created_at)).first()

        transaction = BillingTransaction(
            tenant_id=tenant.id,
            subscription_id=active_sub.id if active_sub else None,
            payment_status="pending",
            created_by=current_user.id
        )
        db.add(transaction)

    # 3. Update Transaction Details
    transaction.amount = amount
    transaction.payment_date = date
    transaction.payment_reference = saved_url or f"/static/tenants/{tenant.id}/receipts/{filename}"
    transaction.notes = (transaction.notes or "") + f" | Client Note: {notes or ''}"
    transaction.payment_method = "transfer"
    
    db.commit()
    
    # 4. Notify Creators (Admins)
    try:
        from app.api.internal.common.models import Notification
        new_notif = Notification(
            title=f"Nuevo Pago Reportado: {tenant.name}",
            message=f"El tenant {tenant.name} ha reportado un pago por ${amount}.",
            type="payment_report",
            data={
                "transaction_id": transaction.id,
                "tenant_id": tenant.id,
                "amount": amount,
                "receipt_url": transaction.payment_reference
            }
        )
        db.add(new_notif)
        db.commit()
    except Exception as e:
        print(f"[ERROR] Error creating admin notification: {e}")

    return {"message": "Pago reportatedo exitosamente", "transaction_id": transaction.id}

@router.get("/transactions/{transaction_id}")
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get transaction details by ID.
    Returns transaction status and basic info.
    """
    transaction = db.query(BillingTransaction).filter(
        BillingTransaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check permissions
    if current_user.role not in [models.UserRole.admin, models.UserRole.creator]:
        # If tenant user, verify they own this transaction
        if not current_user.tenant_id or current_user.tenant_id != transaction.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "id": transaction.id,
        "status": transaction.payment_status,
        "amount": transaction.amount,
        "payment_date": transaction.payment_date,
        "tenant_id": transaction.tenant_id,
        "created_at": transaction.created_at
    }


@router.post("/approve-payment/{transaction_id}")
def approve_payment(
    transaction_id: int,
    approval_data: schemas.ApprovePaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Approve a pending payment transaction.
    - Updates transaction status to completed.
    - Updates subscription status to ACTIVE.
    - Sets subscription dates based on admin input.
    - Marks associated notifications as read.
    """
    if current_user.role not in [models.UserRole.admin, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Only admins can approve payments")

    # 1. Get Transaction
    transaction = db.query(models.BillingTransaction).filter(
        models.BillingTransaction.id == transaction_id,
        models.BillingTransaction.payment_status == "pending"
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found or already processed")

    # 2. Update Transaction
    transaction.payment_status = "completed"
    transaction.payment_date = tz.get_now()
    
    if approval_data.notes:
        transaction.notes = (transaction.notes or "") + f" | Admin Note: {approval_data.notes}"

    # 3. Update Subscription & Tenant
    tenant = transaction.tenant
    sub = transaction.subscription
    
    # Fallback: if transaction isn't linked, try to find the most recent subscription for this tenant
    if not sub:
        sub = db.query(models.TenantSubscription).filter(
            models.TenantSubscription.tenant_id == tenant.id
        ).order_by(desc(models.TenantSubscription.created_at)).first()
        
        if sub:
            transaction.subscription_id = sub.id

    if sub:
        sub.status = SubStatus.ACTIVE
        sub.start_date = approval_data.start_date
        sub.end_date = approval_data.end_date
    else:
        print(f"[WARNING] No current subscription found for tenant {tenant.id} during approval of transaction {transaction_id}")
    
    # 4. Handle Plan Change or Renewal
    if transaction.target_plan_id:
        tenant.subscription_plan_id = transaction.target_plan_id
        tenant.billing_cycle = transaction.target_billing_cycle
    
    # 5. Sync Billing Dates to Tenant
    tenant.status = "active"
    tenant.billing_end_date = approval_data.end_date
    tenant.last_payment_date = tz.get_now()
    tenant.last_payment_method = transaction.payment_method
    
    db.commit()
    db.refresh(transaction)
    
    # 6. Mark any associated system notification as read
    try:
        from app.api.internal.common.models import Notification
        from sqlalchemy import cast, TEXT
        
        # Mark as read any notification referring to this transaction
        notifs = db.query(Notification).filter(
            Notification.is_read == False,
            Notification.tenant_id == None,
            cast(Notification.data, TEXT).contains(f'"transaction_id": {transaction_id}')
        ).all()
        
        for n in notifs:
            n.is_read = True
            
        print(f"[DEBUG] Marked {len(notifs)} notifications as read for transaction {transaction_id}")
    except Exception as e:
        print(f"[ERROR] Failed to mark notifications as read: {str(e)}")

    # 7. Notify Tenant
    try:
        new_notif = Notification(
            tenant_id=tenant.id,
            title="Pago Aprobado y Plan Activado",
            message=f"Tu pago ha sido verificado. Tu plan está activo hasta el {approval_data.end_date.strftime('%d/%m/%Y')}.",
            type="payment_approved",
            data={
                "transaction_id": transaction.id,
                "end_date": approval_data.end_date.isoformat(),
                "notes": approval_data.notes
            }
        )
        db.add(new_notif)
        db.commit()
    except Exception as e:
        print(f"Error creating tenant notification: {e}")
    
    
    return {
        "message": "Payment approved and subscription activated",
        "next_billing_date": approval_data.end_date,
        "tenant_name": tenant.name
    }

@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete a transaction (Hard Delete).
    Use with caution. Intended for cleaning up test data or mistakes.
    """
    if current_user.role not in [models.UserRole.admin, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Only admins can delete transactions")

    transaction = db.query(models.BillingTransaction).filter(models.BillingTransaction.id == transaction_id).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Optional: Check if there are receipts linked and nullify link (or cascade delete if configured in DB)
    # For now, we assume simple delete is what is asked for test data.
    
    db.delete(transaction)
    db.commit()
    
    return {"message": "Transacción eliminada correctamente"}

class BatchDeleteRequest(BaseModel):
    transaction_ids: List[int]

@router.post("/transactions/batch-delete")
def delete_transactions_batch(
    request: BatchDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete multiple transactions at once.
    """
    if current_user.role not in [models.UserRole.admin, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Only admins can delete transactions")

    if not request.transaction_ids:
        return {"message": "No transactions provided"}

    # Delete transactions
    db.query(models.BillingTransaction).filter(
        models.BillingTransaction.id.in_(request.transaction_ids)
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {"message": f"{len(request.transaction_ids)} transacciones eliminadas correctamente"}


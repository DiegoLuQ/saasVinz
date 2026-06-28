"""
Receipt Management Router
Handles receipt generation, listing, downloading, and voiding
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.database import get_db
from app.api.deps import get_current_user
from app import models
from . import schemas
from typing import List, Optional
import os
import json
from datetime import datetime

router = APIRouter()


@router.get("/receipts", response_model=schemas.ReceiptListResponse)
def list_receipts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all receipts with pagination and filters
    """
    query = db.query(models.Receipt)
    
    # Apply filters
    if tenant_id:
        query = query.filter(models.Receipt.tenant_id == tenant_id)
    if status:
        query = query.filter(models.Receipt.status == status)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    receipts = query.order_by(desc(models.Receipt.issued_at)).offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "receipts": receipts,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/receipts/{receipt_id}", response_model=schemas.ReceiptResponse)
def get_receipt(
    receipt_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific receipt by ID
    """
    receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.post("/receipts/void/{receipt_id}")
def void_receipt(
    receipt_id: int,
    void_request: schemas.ReceiptVoidRequest,
    db: Session = Depends(get_db)
):
    """
    Void a receipt (mark as cancelled)
    """
    receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    if receipt.status != "active":
        raise HTTPException(status_code=400, detail="Only active receipts can be voided")
    
    receipt.status = "voided"
    receipt.voided_at = datetime.utcnow()
    receipt.void_reason = void_request.void_reason
    # TODO: Set voided_by from current user context
    
    db.commit()
    db.refresh(receipt)
    
    return {"message": "Receipt voided successfully", "receipt": receipt}


@router.delete("/receipts/{receipt_id}")
def delete_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete a receipt (Admin/Creator only)
    """
    if current_user.role not in [models.UserRole.admin, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
        
    db.delete(receipt)
    db.commit()
    
    return {"message": "Receipt deleted successfully"}



@router.get("/receipts/download/{receipt_number}")
def download_receipt(
    receipt_number: str,
    db: Session = Depends(get_db)
):
    """
    Get download URL for a receipt PDF
    """
    receipt = db.query(models.Receipt).filter(models.Receipt.receipt_number == receipt_number).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    return {
        "receipt_number": receipt.receipt_number,
        "pdf_url": receipt.pdf_url,
        "tenant_name": receipt.tenant_name,
        "amount": receipt.amount,
        "issued_at": receipt.issued_at
    }


@router.get("/receipts/by-reference/{reference}", response_model=schemas.ReceiptResponse)
def get_receipt_by_reference(
    reference: str,
    db: Session = Depends(get_db)
):
    """
    Get a receipt by payment reference (e.g. POLAR_...)
    """
    from app.api.internal.creator.subscriptions.models import BillingTransaction
    
    # First find the transaction by reference
    transaction = db.query(BillingTransaction).filter(
        BillingTransaction.payment_reference == reference
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction reference not found")
        
    # Then find the receipt for this transaction
    receipt = db.query(models.Receipt).filter(
        models.Receipt.transaction_id == transaction.id
    ).first()
    
    if not receipt:
        # TENTATIVE GENERATION: If transaction is completed, try to generate receipt now
        if transaction.payment_status == "completed":
            from app.api.internal.creator.subscriptions.service import ReceiptService
            receipt = ReceiptService.create_receipt_from_transaction(db, transaction.id)
            if not receipt:
                 raise HTTPException(status_code=404, detail="No receipt generated and auto-generation failed")
        else:
            raise HTTPException(status_code=404, detail="No receipt generated for this transaction (status is not completed)")
        
    return receipt


@router.get("/receipts/tenant/{tenant_id}/latest")
def get_tenant_latest_receipt(
    tenant_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the most recent receipt for a tenant
    """
    receipt = db.query(models.Receipt).filter(
        models.Receipt.tenant_id == tenant_id,
        models.Receipt.status == "active"
    ).order_by(desc(models.Receipt.issued_at)).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="No receipts found for this tenant")
    
    return receipt


@router.get("/stats/receipts")
def get_receipt_stats(db: Session = Depends(get_db)):
    """
    Get receipt statistics
    """
    total_receipts = db.query(func.count(models.Receipt.id)).scalar()
    active_receipts = db.query(func.count(models.Receipt.id)).filter(models.Receipt.status == "active").scalar()
    voided_receipts = db.query(func.count(models.Receipt.id)).filter(models.Receipt.status == "voided").scalar()
    total_amount = db.query(func.sum(models.Receipt.amount)).filter(models.Receipt.status == "active").scalar() or 0
    
    return {
        "total_receipts": total_receipts,
        "active_receipts": active_receipts,
        "voided_receipts": voided_receipts,
        "total_amount": float(total_amount)
    }


@router.post("/receipts/generate", response_model=schemas.ReceiptResponse)
async def generate_receipt(
    receipt_data: schemas.ReceiptCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new receipt record
    Returns receipt data for frontend PDF generation
    """
    from sqlalchemy import text
    
    # Generate receipt number
    result = db.execute(text("SELECT generate_receipt_number()"))
    receipt_number = result.fetchone()[0]
    
    # Create receipt record
    receipt = models.Receipt(
        receipt_number=receipt_number,
        tenant_id=receipt_data.tenant_id,
        transaction_id=receipt_data.transaction_id,
        tenant_name=receipt_data.tenant_name,
        tenant_email=receipt_data.tenant_email,
        plan_name=receipt_data.plan_name,
        billing_cycle=receipt_data.billing_cycle,
        amount=receipt_data.amount,
        currency=receipt_data.currency or 'CLP',
        period_start_date=receipt_data.period_start_date,
        period_end_date=receipt_data.period_end_date,
        pdf_url=f'/receipts/{receipt_number}.pdf',  # Placeholder, PDF generated on frontend
        status='active',
        issued_at=datetime.utcnow()
    )
    
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    
    return receipt




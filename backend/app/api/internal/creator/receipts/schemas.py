from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ReceiptCreate(BaseModel):
    """Schema for creating a new receipt"""
    tenant_id: int
    transaction_id: Optional[int] = None
    tenant_name: str
    tenant_email: Optional[str] = None
    tenant_phone: Optional[str] = None
    tenant_address: Optional[str] = None
    plan_name: str
    billing_cycle: str
    amount: float
    currency: str = "CLP"
    period_start_date: datetime
    period_end_date: datetime
    template_id: Optional[int] = None
    advantages_list: Optional[List[str]] = None


class ReceiptResponse(BaseModel):
    """Schema for receipt response"""
    id: int
    receipt_number: str
    tenant_id: int
    transaction_id: Optional[int]
    tenant_name: str
    tenant_email: Optional[str]
    tenant_phone: Optional[str]
    tenant_address: Optional[str]
    issuer_name: Optional[str]
    issuer_rut: Optional[str]
    issuer_address: Optional[str]
    issuer_email: Optional[str]
    issuer_logo_url: Optional[str]
    plan_name: str
    billing_cycle: str
    amount: float
    currency: str
    period_start_date: datetime
    period_end_date: datetime
    pdf_url: str
    pdf_size_bytes: Optional[int]
    template_id: Optional[int]
    status: str
    voided_at: Optional[datetime]
    voided_by: Optional[int]
    void_reason: Optional[str]
    replaced_by_receipt_id: Optional[int]
    replaces_receipt_id: Optional[int]
    issued_at: datetime
    issued_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReceiptVoidRequest(BaseModel):
    """Schema for voiding a receipt"""
    void_reason: str = Field(..., min_length=10, max_length=500)


class ReceiptListResponse(BaseModel):
    """Schema for paginated receipt list"""
    receipts: List[ReceiptResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

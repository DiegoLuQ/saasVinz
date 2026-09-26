from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class VeterinaryBase(BaseModel):
    id: int
    name: str
    rut: Optional[str] = None
    slug: str
    
    # Contact & Location
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = "Chile"
    
    class Config:
        from_attributes = True

class QuickVeterinaryPartnerCreate(BaseModel):
    name: str
    rut: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = "Chile"
    tipo_comision: str = "porcentaje"
    porcentaje_comision: float = 0.0
    monto_comision: float = 0.0

class ActivePartnerOption(BaseModel):
    id: int # PartnerLink ID
    veterinary_id: int
    name: str
    rut: Optional[str] = None
    tipo_comision: str
    porcentaje_comision: float
    monto_comision: float

class PartnerLinkCreate(BaseModel):
    veterinary_id: int
    tipo_comision: str = "porcentaje"
    monto_comision: float = 0.0
    porcentaje_comision: float = 0.0
    referral_message: Optional[str] = None

class PartnerLinkUpdate(BaseModel):
    name: Optional[str] = None
    rut: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    tipo_comision: Optional[str] = None
    monto_comision: Optional[float] = None
    porcentaje_comision: Optional[float] = None
    status: Optional[str] = None

class LinkTenantMini(BaseModel):
    """Crematorio del vínculo (lo que ve la veterinaria en su portal)."""
    id: int
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True

class PartnerLinkResponse(BaseModel):
    id: int
    veterinary: VeterinaryBase
    tenant: Optional[LinkTenantMini] = None
    status: str
    slug_publico: str
    
    tipo_comision: str
    monto_comision: float
    porcentaje_comision: float
    
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Dashboard & Commissions (Simplified) ---

class CommissionStats(BaseModel):
    total_paid: float
    total_pending: float
    count_pending: int = 0
    count_paid: int = 0

class CommissionSchema(BaseModel):
    id: int
    cremation_id: int
    partner_id: int # Link ID
    partner_name: str # Vet Name
    amount: float
    status: str
    created_at: datetime
    pet_name: Optional[str] = None
    service_name: Optional[str] = None
    
    order_total: Optional[float] = 0.0
    amount_porcentaje: Optional[float] = 0.0
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    
    partner_rut: Optional[str] = None
    partner_email: Optional[str] = None
    bank_name: Optional[str] = None
    account_type: Optional[str] = None
    account_number: Optional[str] = None
    rut_titular: Optional[str] = None
    nombre_titular: Optional[str] = None

class PayCommissionPayload(BaseModel):
    notes: Optional[str] = None

class CommissionListResponse(BaseModel):
    stats: CommissionStats
    rows: List[CommissionSchema]
    total: int

# --- Partner Portal Schemas ---

class PartnerPortalAccessResponse(BaseModel):
    link_id: int
    partner_name: str
    tenant_slug: str
    partner_slug: str
    access_token: str
    access_pin: str
    portal_url: str
    token_generated_at: Optional[datetime] = None

class PartnerPortalVerifyRequest(BaseModel):
    token: str
    pin: str

class PartnerPortalInfo(BaseModel):
    partner_id: int
    partner_name: str
    partner_rut: Optional[str] = None
    partner_email: Optional[str] = None
    partner_phone: Optional[str] = None
    partner_address: Optional[str] = None
    partner_city: Optional[str] = None
    partner_region: Optional[str] = None
    tenant_name: str
    tenant_slug: str
    tenant_logo_url: Optional[str] = None
    tenant_phone: Optional[str] = None
    tipo_comision: str
    porcentaje_comision: float
    monto_comision: float

class PartnerPortalDashboardStats(BaseModel):
    total_earned: float = 0.0
    total_pending: float = 0.0
    total_paid: float = 0.0
    count_cases: int = 0
    count_pending: int = 0
    count_paid: int = 0

class PartnerPortalCaseItem(BaseModel):
    id: int # Commission id
    cremation_id: int
    date: datetime
    pet_name: str
    pet_type: Optional[str] = None
    owner_name: str
    owner_phone: Optional[str] = None
    service_name: str
    order_total: float
    commission_amount: float
    commission_status: str # pendiente | pagado | cancelado
    cremation_status: str # En proceso, Finalizado, etc.
    tracking_code: Optional[str] = None
    paid_at: Optional[datetime] = None

class PartnerPortalDashboardResponse(BaseModel):
    partner_info: PartnerPortalInfo
    stats: PartnerPortalDashboardStats
    cases: List[PartnerPortalCaseItem]


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

class PartnerLinkCreate(BaseModel):
    veterinary_id: int
    tipo_comision: str = "porcentaje"
    monto_comision: float = 0.0
    porcentaje_comision: float = 0.0
    referral_message: Optional[str] = None

class PartnerLinkUpdate(BaseModel):
    tipo_comision: Optional[str] = None
    monto_comision: Optional[float] = None
    porcentaje_comision: Optional[float] = None

class PartnerLinkResponse(BaseModel):
    id: int
    veterinary: VeterinaryBase
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
    
    partner_rut: Optional[str] = None
    partner_email: Optional[str] = None
    bank_name: Optional[str] = None
    account_type: Optional[str] = None
    account_number: Optional[str] = None

class CommissionListResponse(BaseModel):
    stats: CommissionStats
    rows: List[CommissionSchema]
    total: int

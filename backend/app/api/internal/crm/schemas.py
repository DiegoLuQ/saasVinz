from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from app.models import PetStatus

# ==========================================
# Business Schemas (CRM: Customers & Pets)
# ==========================================

# Customer Schemas
class CustomerBase(BaseModel):
    rut: Optional[str] = None
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    rut: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

class CustomerInDB(CustomerBase):
    id: int
    tenant_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

# Pet Schemas
class PetBase(BaseModel):
    name: str
    species: str
    breed: Optional[str] = None
    size: Optional[str] = None # pequeño, mediano, normal, grande, muy grande
    birth_date: Optional[datetime] = None
    death_date: Optional[datetime] = None
    age: Optional[int] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = []

class PetCreate(PetBase):
    customer_id: int

class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    size: Optional[str] = None
    birth_date: Optional[datetime] = None
    death_date: Optional[datetime] = None
    age: Optional[int] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    status: Optional[PetStatus] = None

class PetInDB(PetBase):
    id: int
    tenant_id: int
    customer_id: int
    logo_url: str | None = None
    status: str
    pending_reason: str | None = None
    created_at: datetime
    customer: Optional[CustomerInDB] = None
    model_config = {"from_attributes": True}

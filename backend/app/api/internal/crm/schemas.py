from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any, Literal
from datetime import datetime
from app.models import PetStatus
from app.utils.sanitize import sanitize_email, validate_email_strict

# ==========================================
# Business Schemas (CRM: Customers & Pets)
# ==========================================

# Customer Schemas
class CustomerBase(BaseModel):
    rut: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

    @field_validator('email', mode='before')
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Any:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v

class CustomerCreate(CustomerBase):
    @field_validator('email', mode='before')
    @classmethod
    def clean_and_validate_email(cls, v: Any) -> Any:
        if isinstance(v, str):
            cleaned = sanitize_email(v)
            if cleaned:
                err = validate_email_strict(cleaned)
                if err:
                    raise ValueError(err)
            return cleaned
        return v

class CustomerUpdate(BaseModel):
    rut: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

    @field_validator('email', mode='before')
    @classmethod
    def empty_str_to_none(cls, v: Any) -> Any:
        if isinstance(v, str):
            cleaned = sanitize_email(v)
            if cleaned:
                err = validate_email_strict(cleaned)
                if err:
                    raise ValueError(err)
            return cleaned
        return v

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
    birth_date_precision: Literal["day", "month", "year"] = "day"
    death_date_precision: Literal["day", "month", "year"] = "day"
    age: Optional[int] = None
    age_unit: Literal["days", "weeks", "months", "years"] = "years"
    image_url: Optional[str] = None
    images: Optional[List[str]] = []
    # Autoriza su foto en homenajes del crematorio (collage). None = no se preguntó.
    photo_consent: Optional[bool] = None

class PetCreate(PetBase):
    customer_id: int

class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    size: Optional[str] = None
    birth_date: Optional[datetime] = None
    death_date: Optional[datetime] = None
    birth_date_precision: Optional[Literal["day", "month", "year"]] = None
    death_date_precision: Optional[Literal["day", "month", "year"]] = None
    age: Optional[int] = None
    age_unit: Optional[Literal["days", "weeks", "months", "years"]] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    status: Optional[PetStatus] = None
    photo_consent: Optional[bool] = None

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

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class AgreementBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    rut: Optional[str] = Field(None, max_length=20)
    plans_discount_pct: float = Field(0, ge=0, le=100)
    products_discount_pct: float = Field(0, ge=0, le=100)
    special_service_id: Optional[int] = None
    special_service_discount_pct: float = Field(0, ge=0, le=100)
    notes: Optional[str] = Field(None, max_length=300)
    is_active: bool = True

    @field_validator("name", "rut", "notes", mode="before")
    @classmethod
    def _strip(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class AgreementCreate(AgreementBase):
    pass


class AgreementUpdate(AgreementBase):
    pass


class AgreementOut(AgreementBase):
    id: int
    special_service_name: Optional[str] = None
    created_at: Optional[datetime] = None
    # Uso: órdenes con el convenio y total descontado (sin canceladas)
    orders_count: int = 0
    total_discount: float = 0.0

    model_config = {"from_attributes": True}


class AgreementOption(BaseModel):
    """Lista liviana para el selector de la orden."""
    id: int
    name: str
    rut: Optional[str] = None
    plans_discount_pct: float = 0
    products_discount_pct: float = 0
    special_service_id: Optional[int] = None
    special_service_name: Optional[str] = None
    special_service_discount_pct: float = 0

    model_config = {"from_attributes": True}

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any
from datetime import datetime
from uuid import UUID
from .models import MemorialStatus, DedicationStatus

class DedicationBase(BaseModel):
    mensajero: str = Field(..., max_length=100)
    mensaje: str = Field(..., max_length=300)

class DedicationCreate(DedicationBase):
    pass

class DedicationUpdate(BaseModel):
    mensajero: Optional[str] = None
    mensaje: Optional[str] = None
    estado: Optional[DedicationStatus] = None

class DedicationResponse(DedicationBase):
    id_dedicatoria: int
    estado: DedicationStatus
    fecha: datetime

    class Config:
        from_attributes = True

class MemorialBase(BaseModel):
    msg_despedida: str = Field(..., max_length=500)
    diseno: Optional[dict] = {}
    es_privado: Optional[bool] = False

class MemorialCreate(MemorialBase):
    id_mascota: int

class MemorialUpdate(BaseModel):
    msg_despedida: Optional[str] = Field(None, max_length=500)
    diseno: Optional[dict] = None
    main_image_url: Optional[str] = None
    es_privado: Optional[bool] = None
    status: Optional[MemorialStatus] = None

class MascotaPublic(BaseModel):
    name: str
    image_url: Optional[str] = None
    images: List[str] = []
    birth_date: Optional[datetime] = None
    death_date: Optional[datetime] = None

class SubscriptionPlanPublic(BaseModel):
    name: str

class TenantPublic(BaseModel):
    name: str
    logo: Optional[str] = None
    plan: str
    subscription_plan: Optional[SubscriptionPlanPublic] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    website: Optional[str] = None

class MemorialPublicResponse(BaseModel):
    id_recuerdo: UUID
    id_mascota: int
    msg_despedida: str
    diseno: dict
    main_image_url: Optional[str] = None
    lista_imagenes: List[str] = []
    imagen_ia: Optional[str] = None
    es_privado: bool
    status: MemorialStatus
    fecha: datetime
    
    mascota: MascotaPublic
    tenant: TenantPublic = Field(alias="tenant_info")
    plan: Optional[str] = None
    dedication_limit: int = 0
    dedications_count: int = 0
    dedicatorias: List[DedicationResponse] = Field(default_factory=list, validation_alias="dedications", serialization_alias="dedicatorias")
    branding: Optional[dict] = {}
    tenant_status: str
    
    @field_validator('dedicatorias', mode='before')
    @classmethod
    def filter_approved_dedications(cls, v):
        """Only show approved dedications in public view"""
        if isinstance(v, list):
            return [d for d in v if hasattr(d, 'estado') and d.estado == DedicationStatus.aprobado]
        return v
    
    class Config:
        from_attributes = True
        populate_by_name = True

class MemorialManageResponse(BaseModel):
    """Response for memorial management - shows ALL dedications"""
    id_recuerdo: UUID
    id_mascota: int
    msg_despedida: str
    diseno: dict
    main_image_url: Optional[str] = None
    lista_imagenes: List[str] = []
    imagen_ia: Optional[str] = None
    es_privado: bool
    status: MemorialStatus
    fecha: datetime
    valid_until: Optional[datetime] = None
    access_key: str
    
    mascota: MascotaPublic
    tenant: TenantPublic = Field(alias="tenant_info")
    plan: Optional[str] = None
    dedication_limit: int = 0
    dedications_count: int = 0
    dedicatorias: List[DedicationResponse] = Field(default_factory=list, validation_alias="dedications", serialization_alias="dedicatorias")
    branding: Optional[dict] = {}
    tenant_status: str
    
    class Config:
        from_attributes = True
        populate_by_name = True

class PinLoginRequest(BaseModel):
    pin: str

class MemorialCardResponse(BaseModel):
    """Schema for memorial cards in the gallery"""
    id_recuerdo: UUID
    pet_name: str
    pet_image_url: Optional[str] = None
    pet_birth_date: Optional[datetime] = None
    pet_death_date: Optional[datetime] = None
    tenant_name: str
    
    class Config:
        from_attributes = True

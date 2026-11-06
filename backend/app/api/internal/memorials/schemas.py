from pydantic import BaseModel, Field, field_validator, computed_field
from typing import List, Optional, Any
from datetime import datetime
from uuid import UUID
from .models import MemorialStatus, DedicationStatus, RitualKind

class DedicationBase(BaseModel):
    mensajero: str = Field(..., max_length=100)
    # El tope real lo pone el plan (max_dedication_chars, 500 por defecto); aquí solo un techo duro
    mensaje: str = Field(..., max_length=2000)

class DedicationCreate(DedicationBase):
    pass

class DedicationUpdate(BaseModel):
    mensajero: Optional[str] = None
    mensaje: Optional[str] = Field(None, max_length=2000)
    estado: Optional[DedicationStatus] = None

class DedicationResponse(DedicationBase):
    id_dedicatoria: int
    estado: DedicationStatus
    fecha: datetime

    class Config:
        from_attributes = True

class RitualCreate(BaseModel):
    kind: RitualKind
    # Solo se guarda para estrellas ("Encendida por …"); opcional
    name: Optional[str] = Field(None, max_length=40)

class LitStar(BaseModel):
    id: int
    name: Optional[str] = None

class RitualStateResponse(BaseModel):
    counts: dict = {}
    stars: List[LitStar] = []

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
    customer_email: Optional[str] = None
    death_date: Optional[datetime] = None

class MascotaPublic(BaseModel):
    name: str
    image_url: Optional[str] = None
    images: List[str] = []
    birth_date: Optional[datetime] = None
    death_date: Optional[datetime] = None
    birth_date_year_only: bool = False
    death_date_year_only: bool = False

class SubscriptionPlanPublic(BaseModel):
    name: str

class TenantPublic(BaseModel):
    name: str
    slug: Optional[str] = None  # para el enlace corto del memorial
    logo: Optional[str] = None
    plan: str
    subscription_plan: Optional[SubscriptionPlanPublic] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    website: Optional[str] = None

class MemorialMelodyUpdate(BaseModel):
    """Melodía del memorial (solo el crematorio). media_id None = sin melodía."""
    media_id: Optional[int] = None
    activa: bool = False


class UpgradeRequest(BaseModel):
    """La familia pide pasar a un plan Vinzer superior (gestión)."""
    plan: str = Field(..., min_length=2, max_length=30)


class FamilyMelodyUpdate(BaseModel):
    """Melodías de la familia (planes Vinzer): hasta `max_melodies` guardadas y cuál suena."""
    favorites: List[int] = Field(default_factory=list, max_length=10)
    media_id: Optional[int] = None
    activa: bool = True
class MemorialPublicResponse(BaseModel):
    id_recuerdo: UUID
    short_code: Optional[str] = None
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
    # Precio congelado del plan contratado (renovaciones al mismo precio)
    plan_price: Optional[float] = None
    plan_currency: Optional[str] = None
    plan_billing: Optional[str] = None
    dedication_limit: int = 0
    img_limit: int = 0
    ritual_counts: dict = {}
    lit_stars: List[LitStar] = []
    dedications_count: int = 0
    dedicatorias: List[DedicationResponse] = Field(default_factory=list, validation_alias="dedications", serialization_alias="dedicatorias")
    branding: Optional[dict] = {}
    tenant_status: str
    owner_dedication: Optional[str] = None
    # Melodía elegida por el crematorio: {id, name, url, duration, activa}.
    melody: Optional[dict] = None
    # Límites y funciones del plan del memorial (app/services/memorial_plans.py)
    plan_features: dict = {}
    is_vinzer_plan: bool = False
    # Vencido (plan anual sin renovar): vista reducida, sin mensajes nuevos
    expired: bool = False
    valid_until: Optional[datetime] = None
    # Línea de tiempo (planes con `timeline`): [{id, fecha, titulo, texto, image_url}]
    timeline: List[dict] = []
    # Video y voz (Infinito): [{id, kind, url, thumbnail_url, duration, titulo}]
    videos: List[dict] = []
    voices: List[dict] = []

    @computed_field
    @property
    def is_from_crematorium(self) -> bool:
        p = (self.plan or "").strip().lower()
        if p in {"mensual", "anual", "eterno", "infinito", "free", "landing", "recuerdo"}:
            return False
        if self.tenant and getattr(self.tenant, "name", None):
            return True
        return False
    
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
    short_code: Optional[str] = None
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
    access_key: Optional[str] = None
    owner_dedication: Optional[str] = None

    @computed_field
    @property
    def pin(self) -> str:
        return self.access_key or ""

    @computed_field
    @property
    def is_from_crematorium(self) -> bool:
        p = (self.plan or "").strip().lower()
        if p in {"mensual", "anual", "eterno", "infinito", "free", "landing", "recuerdo"}:
            return False
        if self.tenant and getattr(self.tenant, "name", None):
            return True
        return False
    
    mascota: MascotaPublic
    tenant: TenantPublic = Field(alias="tenant_info")
    plan: Optional[str] = None
    # Precio congelado del plan contratado (renovaciones al mismo precio)
    plan_price: Optional[float] = None
    plan_currency: Optional[str] = None
    plan_billing: Optional[str] = None
    dedication_limit: int = 0
    img_limit: int = 0
    ritual_counts: dict = {}
    lit_stars: List[LitStar] = []
    dedications_count: int = 0
    dedicatorias: List[DedicationResponse] = Field(default_factory=list, validation_alias="dedications", serialization_alias="dedicatorias")
    branding: Optional[dict] = {}
    tenant_status: str
    owner_dedication: Optional[str] = None
    # Melodía elegida por el crematorio: {id, name, url, duration, activa}.
    melody: Optional[dict] = None
    # Límites y funciones del plan del memorial (app/services/memorial_plans.py)
    plan_features: dict = {}
    is_vinzer_plan: bool = False
    # Vencido (plan anual sin renovar): vista reducida, sin mensajes nuevos
    expired: bool = False
    valid_until: Optional[datetime] = None
    # Línea de tiempo (planes con `timeline`): [{id, fecha, titulo, texto, image_url}]
    timeline: List[dict] = []
    # Video y voz (Infinito): [{id, kind, url, thumbnail_url, duration, titulo}]
    videos: List[dict] = []
    voices: List[dict] = []
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True

class PinLoginRequest(BaseModel):
    pin: str

class MemorialCardResponse(BaseModel):
    """Schema for memorial cards in the gallery"""
    id_recuerdo: UUID
    short_code: Optional[str] = None
    pet_name: str
    pet_image_url: Optional[str] = None
    pet_birth_date: Optional[datetime] = None
    pet_death_date: Optional[datetime] = None
    tenant_name: str
    tenant_logo_url: Optional[str] = None

    class Config:
        from_attributes = True

class PublicCrematoriumResponse(BaseModel):
    """Crematorio con memoriales públicos (landing del memorial)"""
    name: str
    logo_url: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    memorials_count: int


class SendCredentialsRequest(BaseModel):
    email: Optional[str] = None

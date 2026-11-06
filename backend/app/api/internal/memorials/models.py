from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, JSON, Boolean, Text, Float, Date
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from datetime import datetime
from app.database import Base
from app.utils import tz
from sqlalchemy.orm import relationship
from app.utils.r2 import normalize_image_url
from app.utils.generators import generate_memorial_code

class MemorialStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    archived = "archived"
    expired = "expired"

class DedicationStatus(str, enum.Enum):
    pendiente = "pendiente"
    aprobado = "aprobado"
    rechazado = "rechazado"

class MemorialPlan(Base):
    __tablename__ = "rec_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # "Plan Paraíso"
    name_db = Column(String(50), unique=True, index=True) # free, normal, pro, ultra
    price = Column(Float, default=0.0)
    features = Column(JSON, default=dict) # {"max_images": 5, "altar_3d": true}
    default_config = Column(JSON, default=dict) # {"tema": "editorial"}
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    # Planes de memorial (app/services/memorial_plans.py): vinzer | partner | legacy
    kind = Column(String(20), nullable=False, default="legacy", server_default="legacy")
    currency = Column(String(3), nullable=False, default="USD", server_default="USD")
    billing = Column(String(20), nullable=True)  # yearly | one_time | included
    description = Column(String(300), nullable=True)
    highlight = Column(Boolean, nullable=False, default=False, server_default="false")
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")

class Memorial(Base):
    __tablename__ = "rec_recuerdos"
    id = Column(Integer, primary_key=True, index=True)
    id_recuerdo = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    # Código del enlace corto: memorial.<dominio>/<crematorio>/<mascota>-<short_code>
    short_code = Column(String(12), unique=True, index=True, default=generate_memorial_code)
    id_mascota = Column(Integer, ForeignKey("crm_pets.id"), nullable=False)
    id_tenant = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    
    # --- New Plan Relation ---
    plan_id = Column(Integer, ForeignKey("rec_plans.id"), nullable=True)
    memorial_plan = relationship("MemorialPlan")
    
    diseno = Column(JSON, default=dict) # {"color_fondo": "#fff", "particulas": "flores", "tema": "oscuro"}
    lista_imagenes = Column(JSON, default=list) # Array of URLs
    main_image_url = Column(String, nullable=True) # Selected from lista_imagenes
    imagen_ia = Column(String, nullable=True)
    msg_despedida = Column(String(1050))
    plan = Column(String(50), nullable=True) # Old legacy field (e.g. ULTRA, RECUERDO)
    access_key = Column(String(6)) # 6-digit PIN
    status = Column(Enum(MemorialStatus, native_enum=False), default=MemorialStatus.active)
    es_privado = Column(Boolean, default=False)
    valid_until = Column(DateTime, nullable=True) # Expiration date
    # Precio congelado al contratar (subir precios no afecta a los clientes actuales)
    plan_price = Column(Float, nullable=True)
    plan_currency = Column(String(3), nullable=True)
    plan_billing = Column(String(20), nullable=True)
    # valid_until para el que ya se envió el aviso «vence en 1 mes» (uno por vigencia)
    expiry_notice_for = Column(DateTime, nullable=True)
    
    # --- Polar.sh Integration ---
    polar_customer_id = Column(String, nullable=True)
    polar_subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, nullable=True) # active, past_due, canceled, incomplete
    current_period_end = Column(DateTime, nullable=True)
    polar_cancel_at_period_end = Column(Boolean, default=False)

    @property
    def is_premium(self):
        if self.subscription_status == "active":
            return True
        if self.subscription_status == "canceled" and self.current_period_end:
            if isinstance(self.current_period_end, str):
                try:
                    end_dt = datetime.fromisoformat(self.current_period_end.replace('Z', '+00:00'))
                except:
                    return False
            else:
                end_dt = self.current_period_end
            return end_dt > datetime.utcnow()
        return False

    fecha = Column(DateTime(timezone=True), default=tz.get_now)

    pet = relationship("Pet")
    tenant = relationship("Tenant")
    dedications = relationship("Dedication", back_populates="memorial", cascade="all, delete-orphan")

    @property
    def pet_name(self):
        return self.pet.name if self.pet else "Mascota"

    @property
    def pet_species(self):
        return self.pet.species if self.pet else None

    @property
    def pet_breed(self):
        return self.pet.breed if self.pet else None

    @property
    def pet_image_url(self):
        return normalize_image_url(self.pet.image_url) if self.pet else None

    @property
    def pet_images(self):
        imgs = self.pet.images if self.pet else []
        return [normalize_image_url(i) for i in imgs] if imgs else []

    @property
    def tenant_name(self):
        return self.tenant.name if self.tenant else "Empresa"

    @property
    def tenant_logo(self):
        return self.tenant.logo_url if self.tenant else None

    @property
    def tenant_website(self):
        sm = self.tenant.social_media if self.tenant and self.tenant.social_media else {}
        return sm.get('website', None)

    @property
    def tenant_instagram(self):
        sm = self.tenant.social_media if self.tenant and self.tenant.social_media else {}
        return sm.get('instagram', None)
    
    @property
    def tenant_facebook(self):
        sm = self.tenant.social_media if self.tenant and self.tenant.social_media else {}
        return sm.get('facebook', None)

    @property
    def tenant_status(self):
        return self.tenant.status if self.tenant else "active"

    @property
    def customer_email(self):
        return self.pet.customer.email if self.pet and self.pet.customer else None

    @property
    def customer_name(self):
        return self.pet.customer.name if self.pet and self.pet.customer else None

    @property
    def customer_phone(self):
        return self.pet.customer.phone if self.pet and self.pet.customer else None

    @property
    def mascota(self):
        p = self.pet
        if not p: return None
        return {
            "name": p.name,
            "image_url": normalize_image_url(p.image_url),
            "images": [normalize_image_url(i) for i in (p.images or [])],
            "birth_date": p.birth_date,
            "death_date": p.death_date
        }

    @property
    def tenant_info(self):
        t = self.tenant
        if not t: return None
        plan_name = t.subscription_plan.name if t.subscription_plan else "FREE"
        return {
            "name": t.name,
            "logo": t.logo_url,
            "plan": plan_name,
            "social_instagram": self.tenant_instagram,
            "social_facebook": self.tenant_facebook,
            "website": self.tenant_website
        }

    @property
    def dedicatorias(self):
        return [d for d in self.dedications if d.estado == DedicationStatus.aprobado]

    @property
    def branding(self):
        is_suspended = self.tenant.status in ["suspended", "inactive", "pending"] if self.tenant else False
        is_canceled = self.tenant.subscription_status == "canceled" if self.tenant else False
        return {"vinzer_logo": is_suspended or is_canceled}

class Dedication(Base):
    __tablename__ = "rec_dedicatoria"
    id_dedicatoria = Column(Integer, primary_key=True, index=True)
    id_recuerdo = Column(Integer, ForeignKey("rec_recuerdos.id"), nullable=False)
    mensajero = Column(String(100))
    mensaje = Column(String(2000))  # el tope real es del plan (max_dedication_chars)
    estado = Column(Enum(DedicationStatus, native_enum=False), default=DedicationStatus.pendiente)
    fecha = Column(DateTime(timezone=True), default=tz.get_now)

    memorial = relationship("Memorial", back_populates="dedications")


class RitualKind(str, enum.Enum):
    vela = "vela"
    flor = "flor"
    estrella = "estrella"
    beso = "beso"


class Ritual(Base):
    """Gesto simbólico de un visitante (vela, flor, estrella, beso).
    Sin relationship en Memorial: el borrado lo resuelve el ON DELETE CASCADE."""
    __tablename__ = "rec_rituals"
    id = Column(Integer, primary_key=True, index=True)
    id_recuerdo = Column(Integer, ForeignKey("rec_recuerdos.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(20), nullable=False)
    name = Column(String(60), nullable=True)  # solo estrellas: "Encendida por …"
    ip_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)


class MemorialInvite(Base):
    """Enlace para que una familia cree su memorial en memorial.<dominio>/crear?i=<token>
    (Admin → Memoriales → «Enlace para familia»). Un solo uso, con vencimiento."""
    __tablename__ = "rec_memorial_invites"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    plan = Column(String(20), nullable=True)  # plan sugerido (mensual|anual|eterno); NULL = la familia elige
    note = Column(String(200), nullable=True)  # p. ej. nombre de la familia, solo para el SuperAdmin
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    memorial_id = Column(Integer, ForeignKey("rec_recuerdos.id", ondelete="SET NULL"), nullable=True)


class TimelineMoment(Base):
    """Momento de la línea de tiempo del memorial (Eterno/Infinito). Foto propia, aparte de la galería.
    Sin relationship en Memorial: el borrado lo resuelve el ON DELETE CASCADE."""
    __tablename__ = "rec_timeline"
    id = Column(Integer, primary_key=True, index=True)
    id_recuerdo = Column(Integer, ForeignKey("rec_recuerdos.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha = Column(Date, nullable=True)
    titulo = Column(String(80), nullable=False)
    texto = Column(String(1000), nullable=True)
    image_url = Column(String(500), nullable=True)
    orden = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), default=tz.get_now)


class MemorialMedia(Base):
    """Video o audio de voz del memorial (planes con max_videos / max_voice: Infinito 1 + 1, 30 s).
    Sin relationship en Memorial: el borrado lo resuelve el ON DELETE CASCADE."""
    __tablename__ = "rec_media"
    id = Column(Integer, primary_key=True, index=True)
    id_recuerdo = Column(Integer, ForeignKey("rec_recuerdos.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(10), nullable=False)  # video | voice
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    duration = Column(Float, nullable=True)
    titulo = Column(String(80), nullable=True)
    media_id = Column(Integer, nullable=True)  # web_media_library.id
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

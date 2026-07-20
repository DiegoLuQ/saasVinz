from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, JSON, Boolean, Text, Float
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from datetime import datetime
from app.database import Base
from app.utils import tz
from sqlalchemy.orm import relationship
from app.utils.r2 import normalize_image_url

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

class Memorial(Base):
    __tablename__ = "rec_recuerdos"
    id = Column(Integer, primary_key=True, index=True)
    id_recuerdo = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
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
    mensaje = Column(String(300))
    estado = Column(Enum(DedicationStatus, native_enum=False), default=DedicationStatus.pendiente)
    fecha = Column(DateTime(timezone=True), default=tz.get_now)

    memorial = relationship("Memorial", back_populates="dedications")

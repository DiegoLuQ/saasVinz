from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float, UniqueConstraint, Enum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
from app.utils import tz
import enum

class Veterinary(Base):
    __tablename__ = "sys_veterinaries"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    rut = Column(String, unique=True, index=True)
    slug = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    region = Column(String, nullable=True)
    country = Column(String, default="Chile")
    phone = Column(String, nullable=True)
    
    bank_data = Column(JSON, nullable=True)
    
    is_active = Column(Boolean, default=True)
    
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

    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)
    
    links = relationship("PartnerLinkV2", back_populates="veterinary", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="veterinary", cascade="all, delete-orphan")

class PartnerLinkStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    rejected = "rejected"

class PartnerLinkV2(Base):
    __tablename__ = "ptn_partner_links"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    veterinary_id = Column(Integer, ForeignKey("sys_veterinaries.id"), nullable=False, index=True)
    
    status = Column(Enum(PartnerLinkStatus, native_enum=False), default=PartnerLinkStatus.pending)
    
    slug_publico = Column(String, nullable=False)
    
    # Commercial Agreement
    tipo_comision = Column(String, default="porcentaje") # porcentaje | fijo
    monto_comision = Column(Float, default=0.0)
    porcentaje_comision = Column(Float, default=0.0)
    
    # Optional Bank Override
    bank_data_override = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)
    
    tenant = relationship("Tenant", back_populates="partner_links")
    veterinary = relationship("Veterinary", back_populates="links")
    commissions = relationship("PartnerCommission", back_populates="partner_link", cascade="all, delete-orphan")
    cremations = relationship("CremationOC", back_populates="partner_link")

    __table_args__ = (
        UniqueConstraint('tenant_id', 'veterinary_id', name='uix_tenant_veterinary_link'),
        UniqueConstraint('tenant_id', 'slug_publico', name='uix_tenant_link_slug'),
    )

class PartnerCommissionStatus(str, enum.Enum):
    pendiente = "pendiente"
    pagado = "pagado"
    cancelado = "cancelado"

class PartnerCommission(Base):
    __tablename__ = "ptn_partner_commissions"
    id = Column(Integer, primary_key=True, index=True)
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"), nullable=False, index=True)
    partner_link_id = Column(Integer, ForeignKey("ptn_partner_links.id"), nullable=False, index=True)
    
    amount = Column(Float, default=0.0)
    amount_porcentaje = Column(Float, nullable=True, default=0.0)
    status = Column(Enum(PartnerCommissionStatus, native_enum=False), default=PartnerCommissionStatus.pendiente)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String, nullable=True)
    # password = Column(String, nullable=False) # Removed as it does not exist in DB
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    
    cremation = relationship("CremationOC", back_populates="commission")
    partner_link = relationship("PartnerLinkV2", back_populates="commissions")

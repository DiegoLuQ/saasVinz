from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
from app.utils import tz
import enum

class PetStatus(str, enum.Enum):
    received = "received"
    processing = "processing"
    delivered = "delivered"

class Customer(Base):
    __tablename__ = "crm_customers"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    rut = Column(String, index=True)
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    address = Column(String)
    country = Column(String)
    region = Column(String)
    city = Column(String)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'rut', name='uix_customer_rut_tenant'),
    )

class Pet(Base):
    __tablename__ = "crm_pets"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("crm_customers.id"), nullable=False)
    name = Column(String)
    species = Column(String)
    breed = Column(String)
    size = Column(String) # pequeño, mediano, normal, grande, muy grande
    birth_date = Column(DateTime)
    death_date = Column(DateTime)
    age = Column(Integer)
    image_url = Column(String)
    images = Column(JSON, default=[])
    status = Column(Enum(PetStatus, native_enum=False), default=PetStatus.received)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    customer = relationship("Customer")

    __table_args__ = (
        UniqueConstraint('tenant_id', 'customer_id', 'name', name='uix_pet_name_customer_tenant'),
    )

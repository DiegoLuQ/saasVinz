from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float, JSON, UniqueConstraint, Text
from sqlalchemy.orm import relationship, backref
from app.database import Base
from datetime import datetime
from app.utils import tz

class Category(Base):
    __tablename__ = "inv_categories"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    name = Column(String)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uix_category_name_tenant'),
    )

class Provider(Base):
    __tablename__ = "inv_providers"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    name = Column(String)
    rut = Column(String)
    phone = Column(String)
    email = Column(String)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'rut', name='uix_provider_rut_tenant'),
    )

class Product(Base):
    __tablename__ = "inv_products"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("inv_categories.id"))
    provider_id = Column(Integer, ForeignKey("inv_providers.id"))
    code = Column(String, index=True)
    name = Column(String) 
    cost_price = Column(Float)
    sale_price = Column(Float)
    stock = Column(Integer)
    description = Column(String)
    image_url = Column(String) 
    images = Column(JSON, default=[]) 
    availability_status = Column(String, default="Disponible") 
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    category = relationship("Category")
    provider = relationship("Provider")

    __table_args__ = (
        UniqueConstraint('tenant_id', 'code', name='uix_product_code_tenant'),
    )

class Service(Base):
    __tablename__ = "srv_services"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    name = Column(String)
    description = Column(String)
    price = Column(Float)
    cost = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uix_service_name_tenant'),
    )

class Plan(Base):
    __tablename__ = "srv_plans"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    name = Column(String)
    description = Column(String)
    price = Column(Float)
    cost = Column(Float, default=0.0)
    image_url = Column(String, nullable=True)  # Imagen de catálogo (WEBP en R2)
    is_active = Column(Boolean, default=True)
    # Presentación en el catálogo público
    is_featured = Column(Boolean, nullable=False, default=False, server_default="false")  # "Más solicitado" (uno por tenant)
    price_label = Column(String(60), nullable=True)  # Reemplaza al precio (ej. "Según peso")
    important_note = Column(String(200), nullable=True)  # Aviso destacado (ej. "Exclusivo mascotas < 1 kg")
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    # Ordenados según el orden definido en el plan (srv_plan_services.sort_order)
    services = relationship(
        "Service", secondary="srv_plan_services", overlaps="plan,plan_links,service",
        order_by="[PlanService.sort_order, PlanService.id]",
    )
    products = relationship("Product", secondary="srv_plan_products")

    @property
    def optional_service_ids(self) -> list:
        return [link.service_id for link in self.plan_links if link.is_optional]

    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uix_plan_name_tenant'),
    )

class PlanProduct(Base):
    __tablename__ = "srv_plan_products"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("srv_plans.id"))
    product_id = Column(Integer, ForeignKey("inv_products.id"))

    plan = relationship("Plan", backref=backref("product_links", overlaps="products"), overlaps="products")
    product = relationship("Product", backref=backref("plan_links", overlaps="products"), overlaps="products")

class PlanService(Base):
    __tablename__ = "srv_plan_services"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("srv_plans.id"))
    service_id = Column(Integer, ForeignKey("srv_services.id"))
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    is_optional = Column(Boolean, nullable=False, default=False, server_default="false")  # Extra opcional, no incluido

    plan = relationship("Plan", backref=backref("plan_links", overlaps="services"), overlaps="services")
    service = relationship("Service", backref=backref("plan_links", overlaps="services"), overlaps="services")

class WeightPricing(Base):
    __tablename__ = "srv_weight_pricing"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    label = Column(String(40), nullable=True)  # Nombre visible del tramo ("Pequeño")
    min_weight = Column(Float)
    max_weight = Column(Float)  # NULL = tramo abierto ("X kg o más"), solo el último
    price = Column(Float)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

class CatalogShareToken(Base):
    __tablename__ = "inv_catalog_tokens"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True) # opcional: etiqueta o nombre del cliente
    # Mensaje del crematorio en el catálogo de planes (entre el selector de tamaño y los planes)
    message = Column(Text, nullable=True)
    catalog_type = Column(String(20), nullable=False, default="products", server_default="products")  # 'products' | 'plans'
    expires_at = Column(DateTime(timezone=True), nullable=True) # None = sin vencimiento
    is_active = Column(Boolean, default=True)
    views_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("sys_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)


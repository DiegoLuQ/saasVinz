from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Boolean, Float, JSON, UniqueConstraint, Text
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
    # Servicio especial (eutanasia, exhumación…): adicional en el formulario público
    is_special = Column(Boolean, nullable=False, default=False, server_default='false')
    show_in_form = Column(Boolean, nullable=False, default=True, server_default='true')
    # Grupo (texto libre, solo para ordenar el panel). Unicidad: (tenant, nombre, grupo)
    # vía índice uix_service_name_group_tenant (migración a6c8e0b2d359).
    group_name = Column(String(60), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

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
    # Precio por tramo de peso {"<id srv_weight_pricing>": precio}; solo con
    # form_config.weight_pricing_mode = "table" (app/services/public_form_config.py).
    weight_prices = Column(JSON, nullable=True)
    # Grupo del plan (texto libre). Cada enlace del catálogo elige qué grupos muestra
    # (CatalogShareToken.plan_groups). Migración b8e0a2c4d571.
    group_name = Column(String(60), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    # Ordenados según el orden definido en el plan(srv_plan_services.sort_order)
    services = relationship(
        "Service", secondary="srv_plan_services", overlaps="plan,plan_links,service",
        order_by="[PlanService.sort_order, PlanService.id]",
    )
    products = relationship("Product", secondary="srv_plan_products")

    @property
    def optional_service_ids(self) -> list:
        return [link.service_id for link in self.plan_links if link.is_optional]

    # Unicidad: (tenant, nombre, grupo) vía índice uix_plan_name_group_tenant (migración c0f2b4d6e683).

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

class PriceList(Base):
    """Tabla de precios por peso con nombre (promoción / plantilla). Usa los mismos
    rangos que la General y solo cambia precios; vacío = precio de la General.
    Lógica en app/services/price_lists.py (migración d2a4c6e8f795)."""
    __tablename__ = "srv_price_lists"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    name = Column(String(60), nullable=False)
    tier_prices = Column(JSON, nullable=True)   # {"<id tramo>": recargo}
    plan_prices = Column(JSON, nullable=True)   # {"<id plan>": {"<id tramo>": precio}}
    valid_from = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=tz.get_now)


class CatalogShareToken(Base):
    __tablename__ = "inv_catalog_tokens"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True) # opcional: etiqueta o nombre del cliente
    # Mensaje del crematorio en el catálogo de planes (entre el selector de tamaño y los planes)
    message = Column(Text, nullable=True)
    catalog_type = Column(String(20), nullable=False, default="products", server_default="products")  # 'products' | 'plans'
    # Catálogo de planes: grupos de planes que muestra (NULL = todos; "" = «Sin grupo»)
    plan_groups = Column(JSON, nullable=True)
    # Catálogo de planes: tabla de precios que usa (NULL = General)
    price_list_id = Column(Integer, ForeignKey("srv_price_lists.id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True) # None = sin vencimiento
    is_active = Column(Boolean, default=True)
    views_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("sys_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)


class CatalogEvent(Base):
    """Acción anónima de un visitante en un enlace de catálogo (embudo, services/catalog_funnel.py)."""
    __tablename__ = "inv_catalog_events"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    catalog_token_id = Column(Integer, ForeignKey("inv_catalog_tokens.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(20), nullable=False)  # view | size_select | plan_request | whatsapp | form_open
    plan_id = Column(Integer, nullable=True)
    weight_tier = Column(String(40), nullable=True)
    session_id = Column(String(40), nullable=False)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)


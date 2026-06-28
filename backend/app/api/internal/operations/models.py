from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float, Enum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
from app.utils import tz
import enum
import uuid

class OrderStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    converted = "converted"

class WorkflowStep(Base):
    __tablename__ = "ops_workflow_steps"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    tenant = relationship("Tenant")

class OrderEvidence(Base):
    __tablename__ = "ops_order_evidence"
    id = Column(Integer, primary_key=True, index=True)
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"), nullable=False, index=True)
    step_id = Column(Integer, ForeignKey("ops_workflow_steps.id"), nullable=False)
    comments = Column(JSON, default=[]) # List of strings
    # payment_method = Column(String, nullable=True) # Removed: not in DB
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    cremation = relationship("CremationOC", back_populates="evidence")
    step = relationship("WorkflowStep")

class ServicioOC(Base):
    __tablename__ = "oc_services"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"))
    service_id = Column(Integer, ForeignKey("srv_services.id"))
    cantidad = Column(Integer, default=1)
    precio_costo = Column(Float, default=0.0)
    precio_venta = Column(Float, default=0.0)
    es_principal = Column(Boolean, nullable=False, server_default='false', default=False)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    service = relationship("Service")

class PlanOC(Base):
    __tablename__ = "oc_plans"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"))
    plan_id = Column(Integer, ForeignKey("srv_plans.id"))
    cantidad = Column(Integer, default=1)
    precio_costo = Column(Float, default=0.0)
    precio_venta = Column(Float, default=0.0)
    es_principal = Column(Boolean, nullable=False, server_default='false', default=False)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    plan = relationship("Plan")

class ProductoOC(Base):
    __tablename__ = "oc_products"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"))
    product_id = Column(Integer, ForeignKey("inv_products.id"))
    cantidad = Column(Integer, default=1)
    precio_costo = Column(Float, default=0.0)
    precio_venta = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    
    product = relationship("Product")

class CremationOC(Base):
    __tablename__ = "oc_cremations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    pet_id = Column(Integer, ForeignKey("crm_pets.id"))
    
    oc_number = Column(Integer) # Número de OC incrementable por tenant
    cremation_type = Column(String)
    status = Column(String)
    verification_code = Column(String(10), unique=True, index=True, nullable=True)
    weight = Column(Float, nullable=True)
    partner_link_id = Column(Integer, ForeignKey("ptn_partner_links.id"), nullable=True, index=True)

    # Relationships to partitioned tables
    logistics = relationship("CremationLogistics", uselist=False, back_populates="cremation", cascade="all, delete-orphan")
    financial = relationship("CremationFinancial", uselist=False, back_populates="cremation", cascade="all, delete-orphan")
    details = relationship("CremationDetails", uselist=False, back_populates="cremation", cascade="all, delete-orphan")
    scheduling = relationship("CremationScheduling", uselist=False, back_populates="cremation", cascade="all, delete-orphan")
    
    pet = relationship("Pet")
    partner_link = relationship("PartnerLinkV2", back_populates="cremations")
    
    # Nuevas relaciones OC
    servicios = relationship("ServicioOC", backref="cremation", cascade="all, delete-orphan")
    planes = relationship("PlanOC", backref="cremation", cascade="all, delete-orphan")
    productos = relationship("ProductoOC", backref="cremation", cascade="all, delete-orphan")
    evidence = relationship("OrderEvidence", back_populates="cremation", cascade="all, delete-orphan")
    documents = relationship("Document", backref="cremation", cascade="all, delete-orphan")
    certificates = relationship("Certificate", backref="cremation", cascade="all, delete-orphan")
    logistics_tasks = relationship("LogisticsTask", back_populates="cremation", cascade="all, delete-orphan")

    # Relationships to new normalized tables
    technical = relationship("CremationTechnical", uselist=False, back_populates="cremation", cascade="all, delete-orphan")
    commission = relationship("PartnerCommission", uselist=False, back_populates="cremation", cascade="all, delete-orphan")
    tenant = relationship("Tenant")

    # Compatibility for older logic
    @property
    def products(self):
        return self.productos

    @property
    def pet_name(self):
        return self.pet.name if self.pet else None

    @property
    def customer_name(self):
        return self.pet.customer.name if self.pet and self.pet.customer else None

    @property
    def pet_image_url(self):
        return self.pet.image_url if self.pet else None

Cremation = CremationOC # Alias

class CremationTechnical(Base):
    __tablename__ = "oc_cremation_technical"
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"), primary_key=True)
    step_id = Column(Integer, ForeignKey("ops_workflow_steps.id"), nullable=True)
    operator_id = Column(Integer, ForeignKey("sys_users.id"), nullable=True)
    furnace_id = Column(String, nullable=True)
    start_at = Column(DateTime(timezone=True), nullable=True)
    end_at = Column(DateTime(timezone=True), nullable=True)
    temperature = Column(Float, nullable=True)
    evidence_url = Column(String, nullable=True)
    timeline = Column(JSON, default={})
    
    cremation = relationship("CremationOC", back_populates="technical")
    operator = relationship("User", foreign_keys=[operator_id], overlaps="operator")
    step = relationship("WorkflowStep")

class CremationLogistics(Base):
    __tablename__ = "oc_logistics"
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"), primary_key=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    # Dirección de ENTREGA (devolución de cenizas)
    region = Column(String, nullable=True)
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)
    # Dirección de RETIRO (dónde se recoge la mascota)
    pickup_region = Column(String, nullable=True)
    pickup_city = Column(String, nullable=True)
    pickup_address = Column(String, nullable=True)

    cremation = relationship("CremationOC", back_populates="logistics")

class CremationFinancial(Base):
    __tablename__ = "oc_financial"
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"), primary_key=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    total_price = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    weight_price = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)

    cremation = relationship("CremationOC", back_populates="financial")

class CremationDetails(Base):
    __tablename__ = "oc_details"
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"), primary_key=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    images = Column(JSON, default=[])
    notes = Column(String, nullable=True)
    service_code = Column(String, nullable=True) # Código de servicio ingresado por el usuario
    tracking_token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    additional_services = Column(JSON, default=[])

    cremation = relationship("CremationOC", back_populates="details")

class CremationScheduling(Base):
    __tablename__ = "oc_scheduling"
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"), primary_key=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    cremation = relationship("CremationOC", back_populates="scheduling")

class Document(Base):
    __tablename__ = "ops_documents"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"))
    type = Column(String) # certificate | receipt
    # description = Column(String)
    file_url = Column(String)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

class Certificate(Base):
    __tablename__ = "ops_certificates"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"))
    type = Column(String)
    number = Column(String, unique=True)
    issue_date = Column(DateTime(timezone=True), default=tz.get_now)
    html_content = Column(String)
    # sku = Column(String, nullable=True) # Removed: not in DB
    # pdf_url = Column(String, nullable=True) # Removed: not in DB
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

class CertificateTemplate(Base):
    __tablename__ = "ops_certificate_templates"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=True, index=True)
    source_template_id = Column(Integer, ForeignKey("ops_certificate_templates.id"), nullable=True, index=True)  # Tracks if copied from global library
    name = Column(String, nullable=False)
    category = Column(String, default="para mascotas")  # para empresa | para clientes | para mascotas
    paper_format = Column(String, default="Carta") # Carta | Oficio
    theme = Column(String, default="Clásico")
    title = Column(String)
    subtitle = Column(String)
    declaration_text = Column(String)
    signature_text = Column(String)
    memorial_message = Column(String)
    memorial_title = Column(String, default="In Memoriam")
    header_logo_url = Column(String, nullable=True)
    header_logo_x = Column(String, default="center")
    header_logo_y = Column(String, default="0")
    background_logo_url = Column(String, nullable=True)
    background_logo_x = Column(String, default="50%")
    background_logo_y = Column(String, default="50%")
    background_logo_opacity = Column(Float, default=0.05)
    background_logo_rotation = Column(Float, default=-15.0)
    header_logo_shape = Column(String, default="square") # square | circle
    background_logo_shape = Column(String, default="square") # square | circle
    farewell_text = Column(String, nullable=True)
    sections_config = Column(JSON, nullable=True) # Dictionary for visibility and labels
    sections_order = Column(JSON, nullable=True) # List of keys in order
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

class LogisticsTask(Base):
    __tablename__ = "ops_logistics_tasks"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("sys_users.id"), nullable=True)
    cremation_id = Column(Integer, ForeignKey("oc_cremations.id"), nullable=True)
    
    type = Column(String) # 'pickup', 'delivery'
    status = Column(String, default="pending") # pending, in_transit, completed
    
    address = Column(String)
    contact_name = Column(String)
    contact_phone = Column(String)
    
    # Checklist de terreno
    checklist = Column(JSON, default=lambda: {"manta": False, "collar": False, "juguetes": False})
    
    # Evidencia
    evidence_image_url = Column(String)
    signature_url = Column(String)
    
    # issue_date = Column(DateTime(timezone=True), default=tz.get_now)
    # total_amount = Column(Float, nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=tz.get_now)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    tenant = relationship("Tenant")
    driver = relationship("User")
    cremation = relationship("CremationOC", back_populates="logistics_tasks")

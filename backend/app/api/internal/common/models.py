from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Enum, JSON, Float
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
from app.utils import tz
import enum

class RecipientType(str, enum.Enum):
    admin = "admin"
    tenant = "tenant"
    veterinary = "veterinary"

class NotificationPriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"

class Notification(Base):
    __tablename__ = "sys_notifications"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Recipient Identification (only ONE should be populated)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=True, index=True)
    veterinary_id = Column(Integer, ForeignKey("sys_veterinaries.id"), nullable=True, index=True)
    recipient_type = Column(Enum(RecipientType, native_enum=False), nullable=False, default=RecipientType.tenant, index=True)
    
    # Content
    title = Column(String, nullable=False)
    message = Column(String)
    type = Column(String, nullable=False)  # e.g., 'new_submission', 'system', 'payment', 'support'
    data = Column(JSON, nullable=True)  # Extra info like submission_id, urls, etc.
    
    # Metadata
    priority = Column(Enum(NotificationPriority, native_enum=False), default=NotificationPriority.normal, index=True)
    action_url = Column(String, nullable=True)  # URL for call-to-action button
    is_read = Column(Boolean, default=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # For temporary notifications
    
    # Relationships
    tenant = relationship("Tenant", foreign_keys=[tenant_id])
    veterinary = relationship("Veterinary", foreign_keys=[veterinary_id], back_populates="notifications")

class TenantStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    pending = "pending"
    inactive = "inactive"

class AnnouncementType(str, enum.Enum):
    info = "info"
    promo = "promo"
    alert = "alert"
    welcome = "welcome"
    update = "update"

class AnnouncementDisplayType(str, enum.Enum):
    modal = "modal"
    banner = "banner"

class TenantAnnouncement(Base):
    __tablename__ = "sys_tenant_announcements"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=True, index=True) # Null means global/system-wide
    
    type = Column(Enum(AnnouncementType, native_enum=False), nullable=False)
    display_type = Column(Enum(AnnouncementDisplayType, native_enum=False), default=AnnouncementDisplayType.modal)
    
    target_status = Column(Enum(TenantStatus, native_enum=False), nullable=True) # Target specific tenant states
    target_plan_id = Column(Integer, ForeignKey("sys_subscription_plans.id"), nullable=True) # Target specific subscription plan
    
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    
    is_active = Column(Boolean, default=True)
    show_once = Column(Boolean, default=False)
    must_read = Column(Boolean, default=False)
    priority = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)
    
    tenant = relationship("Tenant")
    target_plan = relationship("SubscriptionPlan")

class UserAnnouncementView(Base):
    """Tracks if a 'show_once' announcement was viewed by a user."""
    __tablename__ = "sys_user_announcement_views"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id"), nullable=False, index=True)
    announcement_id = Column(Integer, ForeignKey("sys_tenant_announcements.id"), nullable=False, index=True)
    viewed_at = Column(DateTime(timezone=True), default=tz.get_now)
    
    user = relationship("User")
    announcement = relationship("TenantAnnouncement")

class FarewellTemplate(Base):
    __tablename__ = "ops_farewell_templates"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    config = Column(JSON, nullable=False)
    preview_url = Column(String)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

class ThemeConfig(Base):
    __tablename__ = "web_theme_config"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True, unique=True)
    theme_mode = Column(String, default="auto")  # 'auto', 'light', 'dark'
    auto_light_start = Column(String, default="06:00")  # Time when light theme starts
    auto_light_end = Column(String, default="18:00")  # Time when light theme ends
    custom_theme_colors = Column(JSON)  # Optional custom color schemes

class LandingConfig(Base):
    __tablename__ = "web_landing_configs"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, default="main_landing")
    config = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

class FormSubmission(Base):
    __tablename__ = "web_form_submissions"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    slug = Column(String, index=True)  # To easily track origin
    
    # Store all data as JSON to be processed later
    owner_data = Column(JSON, nullable=False)
    pet_data = Column(JSON, nullable=False)
    selected_services = Column(JSON, default=[]) 
    images = Column(JSON, default=[]) # List of saved paths
    
    # partner_id = Column(Integer, ForeignKey("ptn_partners.id_partner"), nullable=True, index=True)
    
    # Processing tracking
    customer_id = Column(Integer, ForeignKey("crm_customers.id"), nullable=True)
    pet_id = Column(Integer, ForeignKey("crm_pets.id"), nullable=True)
    
    status = Column(String, default="pending") # pending, approved, rejected
    code = Column(String(20), unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    processed_at = Column(DateTime, nullable=True)
    
    # Relations
    tenant = relationship("Tenant")
    # partner = relationship("app.api.internal.partners.models.Partner", backref="submissions")

class MediaLibrary(Base):
    __tablename__ = "web_media_library"
    id = Column(Integer, primary_key=True, index=True)
    # Tenant dueño del archivo (NULL = recurso global del SuperAdmin).
    # Se usa para filtrar la biblioteca por empresa.
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=True, index=True)
    url = Column(String, nullable=False)
    media_type = Column(String) # 'image', 'video'
    category = Column(String) # 'altars', 'backgrounds', 'ui', 'gallery'
    ratio = Column(String) # '1:1', '16:9', '9:16', 'original'
    description = Column(String)
    alt_text = Column(String)
    file_size = Column(Integer) # bytes
    width = Column(Integer)
    height = Column(Integer)
    duration = Column(Float) # For videos
    thumbnail_url = Column(String, nullable=True) # For video covers or optimized image previews
    theme_config = Column(JSON, nullable=True) # Per-background theme overrides (mode, colors)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

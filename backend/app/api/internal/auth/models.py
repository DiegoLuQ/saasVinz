from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
from app.utils import tz
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    recepcion = "recepcion"
    operador_cremacion = "operador_cremacion"
    contabilidad = "contabilidad"
    marketing = "marketing"
    auditor = "auditor"
    operator = "operator"
    driver = "driver"
    creator = "creator" # SuperAdmin for frontend-creador

class Module(Base):
    __tablename__ = "sys_modules"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True) # ej: 'pets', 'payments'
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True) # ej: 'User', 'Settings'
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

class User(Base):
    __tablename__ = "sys_users"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(Enum(UserRole, native_enum=False), default=UserRole.operator)
    is_active = Column(Boolean, default=True)
    # Versión de sesión: se incrementa al cambiar/resetear la contraseña para
    # invalidar los JWT emitidos antes (el token lleva "ver" y debe coincidir).
    token_version = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    # Use simple class name for resolution
    tenant = relationship("Tenant", back_populates="users")
    permissions = relationship("UserModulePermission", back_populates="user", cascade="all, delete-orphan")

class RefreshToken(Base):
    """
    Refresh tokens rotatorios (S-02). El token viaja opaco en cookie httpOnly
    (saasc_refresh) y aquí solo se guarda su SHA-256. `replaced_by_id` encadena
    las rotaciones: si llega un token ya rotado/revocado se asume robo y se
    revocan todos los del usuario. Sin RLS, igual que sys_users (el lookup
    ocurre antes de fijar el contexto de tenant).
    """
    __tablename__ = "sys_refresh_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    replaced_by_id = Column(Integer, ForeignKey("sys_refresh_tokens.id"), nullable=True)
    user_agent = Column(String(255), nullable=True)
    ip = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    user = relationship("User")

class UserModulePermission(Base):
    __tablename__ = "auth_user_module_permissions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id"))
    module_key = Column(String, ForeignKey("sys_modules.key"))
    is_active = Column(Boolean, default=True)
    # Granular actions: {view: bool, create: bool, edit: bool, delete: bool}
    actions = Column(JSON, default=lambda: {"view": True, "create": False, "edit": False, "delete": False})
    
    user = relationship("User", back_populates="permissions")
    module = relationship("Module")

class RoleModuleBlueprint(Base):
    """
    Define qué módulos puede tener cada rol globalmente.
    Definido por el Creador del SaaS.
    """
    __tablename__ = "auth_role_module_blueprints"
    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(UserRole, native_enum=False), nullable=False)
    module_key = Column(String, ForeignKey("sys_modules.key"), nullable=False)
    is_mandatory = Column(Boolean, default=False) # Si es obligatorio, el admin no puede quitarlo

class TenantModuleConfig(Base):
    """
    Configuración específica de módulos activos para los roles de un tenant.
    Administrado por el Admin del Tenant.
    """
    __tablename__ = "auth_tenant_module_configs"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    role = Column(Enum(UserRole, native_enum=False), nullable=False)
    module_key = Column(String, ForeignKey("sys_modules.key"), nullable=False)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

class Role(Base):
    """
    Metadatos / configuración de roles. La AUTORIZACIÓN sigue usando el enum
    UserRole (hardcodeado en el código); esta tabla solo controla la
    visibilidad y asignabilidad de cada rol desde el panel del Creador.
    `key` coincide con UserRole.value. `is_system` marca admin/creator
    (no editables ni eliminables).
    """
    __tablename__ = "sys_roles"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    label = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_system = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

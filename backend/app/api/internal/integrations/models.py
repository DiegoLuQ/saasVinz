from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils import tz


class TenantApiKey(Base):
    """
    Clave pública por tenant para el widget embebible.

    Las claves son PÚBLICAS por diseño (se exponen en el HTML del sitio del
    cliente), por lo que NO se hashean. La seguridad se basa en:
      - is_active: revocación inmediata.
      - allowed_domains: whitelist de hosts validada contra el header Origin.
    """
    __tablename__ = "sys_tenant_api_keys"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(
        Integer,
        ForeignKey("sys_tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False, default="Widget Web")
    api_key = Column(String(255), unique=True, nullable=False, index=True)
    # Lista de hosts autorizados, ej: ["mi-crematorio.cl", "www.mi-crematorio.cl"]
    allowed_domains = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, nullable=False, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

    tenant = relationship("Tenant")

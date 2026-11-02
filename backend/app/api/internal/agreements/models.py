from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils import tz


class Agreement(Base):
    """Convenio del crematorio con una empresa: descuentos para sus clientes.

    Distinto de las veterinarias (PartnerLink): la veterinaria deriva clientes y
    cobra comisión; el convenio rebaja el precio al cliente.
    """
    __tablename__ = "crm_agreements"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    rut = Column(String(20), nullable=True)
    plans_discount_pct = Column(Float, nullable=False, default=0.0)
    products_discount_pct = Column(Float, nullable=False, default=0.0)  # ánforas y productos
    special_service_id = Column(Integer, ForeignKey("srv_services.id", ondelete="SET NULL"), nullable=True)
    special_service_discount_pct = Column(Float, nullable=False, default=0.0)
    notes = Column(String(300), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=tz.get_now)

    special_service = relationship("Service")

    @property
    def special_service_name(self):
        return self.special_service.name if self.special_service else None

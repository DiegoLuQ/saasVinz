from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Numeric
from app.database import Base
from app.utils import tz


class AiCreditBalance(Base):
    """Saldo de créditos IA de un tenant. `monthly_*` se repone cada mes con lo
    que da el plan (no se acumula); `extra_remaining` (regalos/compras) no vence."""
    __tablename__ = "sys_ai_credit_balances"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="CASCADE"), nullable=False, unique=True)
    period = Column(String(7), nullable=False)  # 'YYYY-MM' del bolsillo mensual
    monthly_granted = Column(Integer, nullable=False, default=0)
    monthly_remaining = Column(Integer, nullable=False, default=0)
    extra_remaining = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)


class AiDesignSession(Base):
    """Un crédito usado: un diseño (plantilla + mascota) con `max_attempts` intentos."""
    __tablename__ = "sys_ai_design_sessions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("sys_image_templates.id", ondelete="SET NULL"), nullable=True)
    pet_id = Column(Integer, nullable=True)
    bucket = Column(String(10), nullable=False)  # 'monthly' | 'extra'
    attempts_used = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_by = Column(Integer, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)


class AiCreditLedger(Base):
    """Historial de movimientos de créditos (auditoría y reporte)."""
    __tablename__ = "sys_ai_credit_ledger"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    bucket = Column(String(10), nullable=False)  # 'monthly' | 'extra'
    delta = Column(Integer, nullable=False)
    # monthly_grant | monthly_expire | gift | purchase | consume | refund | adjust
    reason = Column(String(20), nullable=False)
    note = Column(Text, nullable=True)
    session_id = Column(Integer, ForeignKey("sys_ai_design_sessions.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(Integer, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)


class AiCreditPurchase(Base):
    """Solicitud de compra de créditos (transferencia u otro medio). El SuperAdmin
    la aprueba (se suman al saldo extra) o la rechaza; el tenant puede cancelarla
    mientras está pendiente."""
    __tablename__ = "sys_ai_credit_purchases"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    unit_price_usd = Column(Numeric(10, 2), nullable=False)
    total_usd = Column(Numeric(12, 2), nullable=False)
    total_clp = Column(Integer, nullable=True)
    usd_clp_rate = Column(Integer, nullable=True)  # tipo de cambio usado en la solicitud
    method = Column(String(20), nullable=False)  # 'transfer' | 'other'
    reference = Column(String(120), nullable=True)  # N° de operación / comprobante
    note = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # pending | approved | rejected | cancelled
    review_note = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

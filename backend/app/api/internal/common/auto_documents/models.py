from sqlalchemy import Column, Integer, Numeric, ForeignKey, DateTime, JSON, String, Text

from app.database import Base
from app.utils import tz


class DocumentRun(Base):
    """Un "Generar todo" del detalle de un registro: tiempos por paso y consumo IA."""
    __tablename__ = "sys_document_runs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_id = Column(Integer, nullable=True)
    cremation_id = Column(Integer, nullable=True)
    pet_id = Column(Integer, nullable=True)
    ai_session_id = Column(Integer, ForeignKey("sys_ai_design_sessions.id", ondelete="SET NULL"), nullable=True)
    # [{key, state: done|error|skipped, ms, detail}]
    steps = Column(JSON, nullable=False, default=list)
    total_ms = Column(Integer, nullable=False, default=0)
    ok_count = Column(Integer, nullable=False, default=0)
    error_count = Column(Integer, nullable=False, default=0)
    credits_used = Column(Integer, nullable=False, default=0)
    ai_cost_usd = Column(Numeric(10, 5), nullable=False, default=0)
    created_by = Column(Integer, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False, default=tz.get_now)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)


class DocumentJob(Base):
    """Documento generado en segundo plano (hoy: imagen para redes con IA). El
    crematorio lo pide desde la orden y sigue trabajando; el servidor genera el
    texto e ilustración, guarda la ilustración y registra el diseño (receta)."""
    __tablename__ = "sys_document_jobs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    cremation_id = Column(Integer, nullable=True, index=True)
    pet_id = Column(Integer, nullable=True)
    kind = Column(String(20), nullable=False, default="social")
    template_id = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default="queued")  # queued | running | done | error
    detail = Column(String(300), nullable=True)   # progreso o advertencia para mostrar
    error = Column(Text, nullable=True)
    export_id = Column(Integer, nullable=True)      # diseño creado (sys_template_exports)
    ai_session_id = Column(Integer, ForeignKey("sys_ai_design_sessions.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(Integer, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

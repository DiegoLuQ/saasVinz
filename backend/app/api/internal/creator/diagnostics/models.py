"""Diagnóstico 360° para crematorios prospecto (SuperAdmin). Tablas globales, sin RLS.
Lógica en services/diagnostics.py; migración a4c6e8f0b257."""
from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils import tz


class DiagnosticCategory(Base):
    __tablename__ = "sys_diagnostic_categories"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(20), nullable=False, unique=True)
    name = Column(String(80), nullable=False)
    weight = Column(Float, nullable=False, default=0)  # % del total; todas suman 100
    vinzer_feature = Column(Text, nullable=True)       # función de Vinzer que ayuda en esta área
    sort_order = Column(Integer, nullable=False, default=0)

    questions = relationship("DiagnosticQuestion", back_populates="category")


class DiagnosticQuestion(Base):
    __tablename__ = "sys_diagnostic_questions"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("sys_diagnostic_categories.id", ondelete="CASCADE"), nullable=False)
    text = Column(String(300), nullable=False)
    help = Column(Text, nullable=True)                  # explicación del «?»
    options = Column(JSON, nullable=False)              # [{text, pct}]
    allows_na = Column(Boolean, nullable=False, default=False)
    modes = Column(JSON, nullable=False)                # modalidades en que aparece: [10, 15, 20]
    recommendation = Column(Text, nullable=True)        # se muestra si la respuesta queda bajo el umbral
    vinzer_feature = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

    category = relationship("DiagnosticCategory", back_populates="questions")


class Diagnostic(Base):
    __tablename__ = "sys_diagnostics"
    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String(150), nullable=False)
    contact_name = Column(String(120), nullable=True)   # la landing pública no lo pide
    city = Column(String(80), nullable=True)
    region = Column(String(80), nullable=True)
    email = Column(String(150), nullable=True)
    phone = Column(String(40), nullable=True)
    website = Column(String(200), nullable=True)
    monthly_cremations = Column(Integer, nullable=True)
    consent = Column(Boolean, nullable=False, default=False)
    mode = Column(Integer, nullable=False)
    answers = Column(JSON, nullable=False)              # copia de pregunta, alternativa y % al responder
    category_scores = Column(JSON, nullable=False)
    total_pct = Column(Float, nullable=True)
    level = Column(String(40), nullable=True)
    is_partial = Column(Boolean, nullable=False, default=False)
    suggested_plan = Column(JSON, nullable=True)
    status = Column(String(20), nullable=False, default="nuevo")
    notes = Column(Text, nullable=True)
    linked_tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(Integer, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    # Landing pública vinzer.cl/diagnostico (migración b6d8f0a2c379)
    source = Column(String(10), nullable=False, default="admin")      # admin | web
    public_token = Column(String(64), nullable=True, unique=True)     # enlace privado al informe
    completed_at = Column(DateTime(timezone=True), nullable=True)     # NULL = no terminó las preguntas
    utm = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text, ForeignKey, Numeric
from app.database import Base
from app.utils import tz


class ImageTemplate(Base):
    __tablename__ = "sys_image_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)

    # NULL = plantilla global (todos los crematorios). Con valor = exclusiva de
    # ese tenant: solo él la ve y la usa; la edita únicamente el SuperAdmin.
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="CASCADE"), nullable=True, index=True)

    # Default phrase the tenant sees pre-filled (overridable per render).
    default_phrase = Column(Text, nullable=True)

    # Aspect ratios the template was authored for, e.g. ["9:16","1:1"].
    supported_ratios = Column(JSON, nullable=False, default=list)

    # Declarative canvas definition: { background, layers: [...] }
    definition = Column(JSON, nullable=False, default=dict)

    # Preview saved at creation time (R2 url or static path).
    thumbnail_url = Column(String, nullable=True)

    # Prompts IA (Gemini) editables por el SuperAdmin. Usan variables
    # {nombre}, {especie}, ... que se rellenan con los datos de la mascota.
    # El tenant puede retocar el prompt ya resuelto antes de generar, sin
    # modificar el guardado aquí.
    ai_text_prompt = Column(Text, nullable=True)
    ai_image_prompt = Column(Text, nullable=True)
    ai_text_max_chars = Column(Integer, nullable=False, default=500)

    # Counter incremented every time a tenant generates a render using this
    # template. While > 0 the template becomes read-only.
    usage_count = Column(Integer, nullable=False, default=0)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

    @property
    def is_locked(self) -> bool:
        return (self.usage_count or 0) > 0


class AiGeneration(Base):
    """Una generación IA (texto o imagen) hecha por un tenant. Base del cupo mensual."""
    __tablename__ = "sys_ai_generations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    template_id = Column(Integer, ForeignKey("sys_image_templates.id", ondelete="SET NULL"), nullable=True)
    pet_id = Column(Integer, nullable=True)
    kind = Column(String(10), nullable=False)  # 'text' | 'image'
    model = Column(String(80), nullable=False)
    prompt = Column(Text, nullable=True)
    success = Column(Boolean, nullable=False, default=False)
    error = Column(Text, nullable=True)
    cost_usd = Column(Numeric(10, 5), nullable=True)
    # Diseño (crédito) al que pertenece la generación.
    session_id = Column(Integer, ForeignKey("sys_ai_design_sessions.id", ondelete="SET NULL"), nullable=True)
    # Ilustración guardada por el tenant (tenant_{id}/ia/). NULL = descartada.
    media_url = Column(Text, nullable=True)
    # Cuánto tardó la plataforma de IA en responder (reporte de tiempos).
    duration_ms = Column(Integer, nullable=True)
    # Resultado guardado para poder recuperarlo si la respuesta no llegó al
    # navegador (corte de conexión): texto generado e ilustración (data URL WebP)
    # aún no guardada ni descartada. pending_image se borra al guardar/descartar.
    output_text = Column(Text, nullable=True)
    pending_image = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)


class TemplateExport(Base):
    """Lo creado por un tenant en "Diseños para Redes": ilustración IA guardada (WebP en
    tenant_{id}/ia/) o diseño final. Los diseños nuevos no tienen archivo: se guarda su
    receta en `meta` y se dibujan al verlos/descargarlos (los antiguos sí tienen imagen)."""
    __tablename__ = "sys_template_exports"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("sys_tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("sys_image_templates.id", ondelete="SET NULL"), nullable=True)
    pet_id = Column(Integer, nullable=True)
    title = Column(String(250), nullable=False)
    media_url = Column(Text, nullable=True)
    # Receta del diseño: {ratio, ai_text, phrase, pet_name, photos: {slot: {url, zoom, offset_x, offset_y}}}
    meta = Column(JSON, nullable=True)
    kind = Column(String(20), nullable=False, default="design")  # design | illustration | digital (tarjeta de homenaje)
    created_by = Column(Integer, ForeignKey("sys_users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)

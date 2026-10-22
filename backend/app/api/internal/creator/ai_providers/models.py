from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric
from app.database import Base
from app.utils import tz


class AiProvider(Base):
    """Conexión a una plataforma de IA (global, administrada por el SuperAdmin).

    La API key se guarda cifrada (app/utils/secrets_box.py) y nunca se
    devuelve al frontend. use_for_text / use_for_image marcan qué conexiones
    usan las plantillas de imagen; con varias, `priority` define el orden de
    respaldo (si la principal falla se pasa a la siguiente).
    """
    __tablename__ = "sys_ai_providers"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(20), nullable=False)  # gemini | anthropic | openai | openrouter | deepseek
    name = Column(String(120), nullable=False)
    model = Column(String(160), nullable=False)
    api_key_encrypted = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    use_for_text = Column(Boolean, nullable=False, default=False)
    use_for_image = Column(Boolean, nullable=False, default=False)
    # Costo estimado de UNA generación en USD (para medir el gasto). Si la
    # plataforma informa el costo real (OpenRouter), se registra ese.
    cost_per_use_usd = Column(Numeric(10, 5), nullable=False, default=0)
    # Orden dentro de cada uso: 1 = principal; si falla se usa la siguiente (respaldo).
    priority = Column(Integer, nullable=False, default=1)
    last_test_at = Column(DateTime(timezone=True), nullable=True)
    last_test_ok = Column(Boolean, nullable=True)
    last_test_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

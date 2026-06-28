from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text
from app.database import Base
from app.utils import tz


class ImageTemplate(Base):
    __tablename__ = "sys_image_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)

    # Default phrase the tenant sees pre-filled (overridable per render).
    default_phrase = Column(Text, nullable=True)

    # Aspect ratios the template was authored for, e.g. ["9:16","1:1"].
    supported_ratios = Column(JSON, nullable=False, default=list)

    # Declarative canvas definition: { background, layers: [...] }
    definition = Column(JSON, nullable=False, default=dict)

    # Preview saved at creation time (R2 url or static path).
    thumbnail_url = Column(String, nullable=True)

    # Counter incremented every time a tenant generates a render using this
    # template. While > 0 the template becomes read-only.
    usage_count = Column(Integer, nullable=False, default=0)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), default=tz.get_now)
    updated_at = Column(DateTime(timezone=True), default=tz.get_now, onupdate=tz.get_now)

    @property
    def is_locked(self) -> bool:
        return (self.usage_count or 0) > 0

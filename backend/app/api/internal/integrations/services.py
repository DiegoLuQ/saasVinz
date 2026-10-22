import secrets
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models
from app.utils import tz
from .models import TenantApiKey
from . import schemas

from app.services.plan_features import NAME_FALLBACK, tenant_has

# Se controlan desde admin → Planes → "Configurar Características" (Configuración →
# Integraciones). Estos conjuntos son solo la regla anterior por nombre, usada si
# el plan no tiene la casilla guardada (ver app/services/plan_features.py).
WIDGET_ALLOWED_PLANS = NAME_FALLBACK["integraciones:widget"]
FORM_EMBED_ALLOWED_PLANS = NAME_FALLBACK["integraciones:formulario_incrustable"]

KEY_PREFIX = "pk_vinzer_live_"


def tenant_can_use_widget(tenant: models.Tenant) -> bool:
    """Widget / API keys públicas (considera plan demo vía effective_plan)."""
    return tenant_has(tenant, "integraciones:widget")


def tenant_can_use_form_embed(tenant: models.Tenant) -> bool:
    """Formulario incrustable en el sitio del tenant (considera plan demo)."""
    return tenant_has(tenant, "integraciones:formulario_incrustable")


def require_widget_plan(tenant: models.Tenant) -> None:
    if not tenant_can_use_widget(tenant):
        raise HTTPException(
            status_code=403,
            detail="El widget embebible no está incluido en tu plan.",
        )


def _generate_key(db: Session) -> str:
    """Genera una clave pública única."""
    for _ in range(5):
        candidate = f"{KEY_PREFIX}{secrets.token_urlsafe(24)}"
        exists = db.query(TenantApiKey).filter(TenantApiKey.api_key == candidate).first()
        if not exists:
            return candidate
    raise HTTPException(status_code=500, detail="No se pudo generar una clave única, reintenta.")


class ApiKeyService:
    def __init__(self, db: Session):
        self.db = db

    def list(self, tenant_id: int) -> List[TenantApiKey]:
        return (
            self.db.query(TenantApiKey)
            .filter(TenantApiKey.tenant_id == tenant_id)
            .order_by(TenantApiKey.created_at.desc())
            .all()
        )

    def get(self, tenant_id: int, key_id: int) -> TenantApiKey:
        key = (
            self.db.query(TenantApiKey)
            .filter(TenantApiKey.id == key_id, TenantApiKey.tenant_id == tenant_id)
            .first()
        )
        if not key:
            raise HTTPException(status_code=404, detail="API key no encontrada.")
        return key

    def create(self, tenant_id: int, data: schemas.ApiKeyCreate) -> TenantApiKey:
        key = TenantApiKey(
            tenant_id=tenant_id,
            name=(data.name or "Widget Web").strip()[:120],
            api_key=_generate_key(self.db),
            allowed_domains=data.allowed_domains or [],
            is_active=True,
        )
        self.db.add(key)
        self.db.commit()
        self.db.refresh(key)
        return key

    def update(self, tenant_id: int, key_id: int, data: schemas.ApiKeyUpdate) -> TenantApiKey:
        key = self.get(tenant_id, key_id)
        if data.name is not None:
            key.name = data.name.strip()[:120] or key.name
        if data.allowed_domains is not None:
            key.allowed_domains = data.allowed_domains
        if data.is_active is not None:
            key.is_active = data.is_active
        key.updated_at = tz.get_now()
        self.db.commit()
        self.db.refresh(key)
        return key

    def rotate(self, tenant_id: int, key_id: int) -> TenantApiKey:
        """Regenera la clave manteniendo nombre y dominios (revoca la anterior)."""
        key = self.get(tenant_id, key_id)
        key.api_key = _generate_key(self.db)
        key.updated_at = tz.get_now()
        self.db.commit()
        self.db.refresh(key)
        return key

    def delete(self, tenant_id: int, key_id: int) -> None:
        key = self.get(tenant_id, key_id)
        self.db.delete(key)
        self.db.commit()

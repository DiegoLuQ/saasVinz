import secrets
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models
from app.utils import tz
from .models import TenantApiKey
from . import schemas

# Planes que pueden usar el widget embebible / API keys públicas.
WIDGET_ALLOWED_PLANS = {"PRO", "ULTRA"}

KEY_PREFIX = "pk_vinzer_live_"


def tenant_can_use_widget(tenant: models.Tenant) -> bool:
    """Gating por plan: solo PRO y ULTRA (considera plan demo vía effective_plan)."""
    plan = tenant.effective_plan if tenant else None
    if not plan or not plan.name:
        return False
    return plan.name.strip().upper() in WIDGET_ALLOWED_PLANS


def require_widget_plan(tenant: models.Tenant) -> None:
    if not tenant_can_use_widget(tenant):
        raise HTTPException(
            status_code=403,
            detail="El widget embebible está disponible solo en los planes PRO y ULTRA.",
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

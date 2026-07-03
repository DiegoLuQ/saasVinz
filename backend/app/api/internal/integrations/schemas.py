from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
from urllib.parse import urlparse


def normalize_domain(raw: str) -> Optional[str]:
    """
    Normaliza un dominio ingresado por el usuario a solo-host en minúsculas.
    Acepta 'https://mi-crematorio.cl/', 'mi-crematorio.cl', 'MI-CREMATORIO.CL:443'
    y devuelve 'mi-crematorio.cl'. Devuelve None si queda vacío.
    """
    if not raw:
        return None
    value = raw.strip().lower()
    if not value:
        return None
    # urlparse necesita esquema para poblar netloc
    if "://" not in value:
        value = "//" + value
    parsed = urlparse(value)
    host = parsed.netloc or parsed.path
    host = host.split("@")[-1]   # quita user:pass@ si existiera
    host = host.split(":")[0]    # quita puerto
    host = host.strip("/")
    return host or None


def normalize_domains(domains: List[str]) -> List[str]:
    seen: List[str] = []
    for d in domains or []:
        host = normalize_domain(d)
        if host and host not in seen:
            seen.append(host)
    return seen


class ApiKeyCreate(BaseModel):
    name: str = "Widget Web"
    allowed_domains: List[str] = []

    @field_validator("allowed_domains")
    @classmethod
    def _clean_domains(cls, v: List[str]) -> List[str]:
        return normalize_domains(v)


class ApiKeyUpdate(BaseModel):
    name: Optional[str] = None
    allowed_domains: Optional[List[str]] = None
    is_active: Optional[bool] = None

    @field_validator("allowed_domains")
    @classmethod
    def _clean_domains(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        return normalize_domains(v)


class ApiKeyInDB(BaseModel):
    id: int
    tenant_id: int
    name: str
    api_key: str
    allowed_domains: List[str] = []
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

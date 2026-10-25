"""
Cifrado simétrico de secretos guardados en la DB (API keys de plataformas IA).

La clave Fernet se deriva de SECRET_KEY: si SECRET_KEY cambia, los secretos
guardados dejan de poder descifrarse y hay que volver a ingresarlos.
"""
import base64
import hashlib
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256(f"secrets-box:{settings.SECRET_KEY}".encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(token: Optional[str], ttl: Optional[int] = None) -> Optional[str]:
    """None si el token no es válido o (con `ttl`, en segundos) si es más antiguo."""
    if not token:
        return None
    try:
        return _fernet().decrypt(token.encode(), ttl=ttl).decode()
    except (InvalidToken, ValueError):
        return None


def hint(value: Optional[str]) -> Optional[str]:
    """Últimos 4 caracteres, para mostrar qué key está guardada sin exponerla."""
    return f"••••{value[-4:]}" if value and len(value) >= 8 else ("••••" if value else None)

"""Folio automático del certificado (campo `folio` de los diseños con imagen).

El SuperAdmin agrega el campo «Folio» en el editor (Admin → Diseños → editor de
imagen) y elige:
- `folio_mode` = "sequence" (correlativo: 250, 251…) con `folio_format` ({n} = número,
  {año} = año de emisión; por defecto "{n}") y `folio_digits` (rellena con ceros, 0 = no);
- `folio_mode` = "random": `folio_length` (6–8) caracteres sin los que se confunden.

Reglas (decisión 2026-11-20):
- Un folio por crematorio: el correlativo es `sys_tenants.cert_folio_next` (NULL = 1),
  el crematorio fija su número de partida en Configuración → Certificados y nunca se
  reinicia. Dos crematorios pueden tener el mismo número.
- Se asigna una vez por orden: volver a emitir el certificado de la orden reutiliza
  el folio guardado (`ops_certificates.folio`). La vista previa muestra el próximo sin
  consumirlo.
- Se puede corregir al emitir (override `value` del campo): se guarda ese texto y no
  se consume número.
"""
from __future__ import annotations

import secrets
from typing import Optional

from sqlalchemy.orm import Session

from app import models

FIELD_TYPE = "folio"
MAX_FOLIO = 40
RANDOM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # sin 0/O, 1/I/L


def folio_field(fields: list) -> Optional[dict]:
    return next((f for f in fields or [] if isinstance(f, dict) and f.get("type") == FIELD_TYPE), None)


def existing(db: Session, tenant_id: int, cremation_id: Optional[int], cert_type: str) -> Optional[str]:
    if not cremation_id:
        return None
    row = db.query(models.Certificate.folio).filter(
        models.Certificate.tenant_id == tenant_id, models.Certificate.cremation_id == cremation_id,
        models.Certificate.type == cert_type).first()
    return row[0] if row and row[0] else None


def next_number(tenant) -> int:
    return int(getattr(tenant, "cert_folio_next", None) or 1)


def format_sequence(n: int, field: dict, year: int) -> str:
    fmt = str(field.get("folio_format") or "{n}")[:MAX_FOLIO]
    if "{n}" not in fmt:
        fmt += "{n}"
    try:
        digits = max(0, min(int(field.get("folio_digits") or 0), 8))
    except (TypeError, ValueError):
        digits = 0
    return fmt.replace("{n}", str(n).zfill(digits)).replace("{año}", str(year)).replace("{anio}", str(year))[:MAX_FOLIO]


def _random(db: Session, tenant_id: int, length: int) -> str:
    for _ in range(20):
        code = "".join(secrets.choice(RANDOM_ALPHABET) for _ in range(length))
        if not db.query(models.Certificate.id).filter(models.Certificate.tenant_id == tenant_id,
                                                      models.Certificate.folio == code).first():
            return code
    return "".join(secrets.choice(RANDOM_ALPHABET) for _ in range(8))


def _length(field: dict) -> int:
    try:
        return max(6, min(int(field.get("folio_length") or 8), 8))
    except (TypeError, ValueError):
        return 8


def resolve(db: Session, tenant, field: Optional[dict], cremation_id: Optional[int], cert_type: str, year: int,
            override: Optional[str] = None, persist: bool = False) -> Optional[str]:
    """Folio a imprimir. persist=False (vista previa) nunca consume número."""
    if not field:
        return None
    if override is not None and str(override).strip():
        return " ".join(str(override).split())[:MAX_FOLIO]
    prev = existing(db, tenant.id, cremation_id, cert_type)
    if prev:
        return prev
    if field.get("folio_mode") == "random":
        return _random(db, tenant.id, _length(field))
    if not persist:
        return format_sequence(next_number(tenant), field, year)
    # Toma el número con la fila del crematorio bloqueada (dos emisiones a la vez no repiten)
    locked = db.query(models.Tenant).filter(models.Tenant.id == tenant.id).with_for_update().first()
    n = next_number(locked)
    locked.cert_folio_next = n + 1
    db.flush()
    return format_sequence(n, field, year)

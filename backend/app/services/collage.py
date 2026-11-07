"""Collage de las últimas mascotas despedidas (Documentos → Diseños para Redes → Collage).

Toma la foto principal de cada mascota con orden ENTREGADA, en un mes o las
últimas N, y solo si la familia autorizó usarla (crm_pets.photo_consent = true).
Las que no se preguntaron (NULL) se devuelven aparte como «pendientes» para que
el crematorio confirme la autorización; las que dijeron que no (false) se omiten.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models

FINAL_STATUSES = ("entregado", "delivered", "completado", "completed")
MAX_MONTH = 60
MAX_LAST = 40
MAX_PENDING = 30

MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
          "septiembre", "octubre", "noviembre", "diciembre"]


def _tz(tenant) -> ZoneInfo:
    try:
        return ZoneInfo((tenant.timezone if tenant else None) or "America/Santiago")
    except Exception:
        return ZoneInfo("America/Santiago")


def parse_month(value: str) -> tuple[int, int]:
    try:
        y, m = (int(x) for x in value.split("-", 1))
        if not (2000 <= y <= 2100 and 1 <= m <= 12):
            raise ValueError
        return y, m
    except Exception:
        raise ValueError("Mes inválido (usa AAAA-MM)")


def month_label(y: int, m: int) -> str:
    return f"{MONTHS[m - 1].capitalize()} {y}"


def main_photo(pet) -> Optional[str]:
    if pet.image_url:
        return pet.image_url
    imgs = [i for i in (pet.images or []) if isinstance(i, str) and i]
    return imgs[0] if imgs else None


def delivered_photos(db: Session, tenant, *, month: Optional[str] = None, last: Optional[int] = None) -> dict:
    """{label, mode, photos: [{pet_id, pet_name, url, delivered_at}], pending: [...], declined}."""
    C, S, P = models.Cremation, models.CremationScheduling, models.Pet
    closed = func.coalesce(S.completed_at, C.created_at)
    q = (db.query(C.id, closed.label("closed"), P)
         .join(P, P.id == C.pet_id)
         .outerjoin(S, S.cremation_id == C.id)
         .filter(C.tenant_id == tenant.id, func.lower(C.status).in_(FINAL_STATUSES)))

    if month:
        y, m = parse_month(month)
        tz = _tz(tenant)
        start = datetime(y, m, 1, tzinfo=tz)
        end = datetime(y + (m == 12), m % 12 + 1, 1, tzinfo=tz)
        q = q.filter(closed >= start, closed < end)
        label, mode, limit = month_label(y, m), "month", MAX_MONTH
    else:
        limit = max(1, min(int(last or 12), MAX_LAST))
        label, mode = f"Últimos {limit} angelitos", "last"

    photos, pending, declined, seen = [], [], 0, set()
    for _cid, closed_at, pet in q.order_by(closed.desc(), C.id.desc()).yield_per(200):
        if pet.id in seen:
            continue
        seen.add(pet.id)
        url = main_photo(pet)
        if not url:
            continue
        item = {"pet_id": pet.id, "pet_name": pet.name, "url": url,
                "delivered_at": closed_at.isoformat() if closed_at else None}
        if pet.photo_consent is True:
            photos.append(item)
            if len(photos) >= limit:
                break
        elif pet.photo_consent is None:
            if len(pending) < MAX_PENDING:
                pending.append(item)
        else:
            declined += 1
    return {"label": label, "mode": mode, "photos": photos, "pending": pending, "declined": declined}

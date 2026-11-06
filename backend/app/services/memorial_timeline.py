"""Línea de tiempo del memorial (planes con `timeline`: Eterno, Infinito).

La familia arma los momentos desde la gestión (PIN): fecha opcional, título, texto y una
foto propia (aparte de la galería, no cuenta para `max_images`). Tope `max_timeline` del plan.
Orden: por fecha (los sin fecha al final) y luego por `orden`/creación.
"""
from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.internal.memorials import models as mem_models
from app.services import memorial_plans
from app.utils.r2 import normalize_image_url
from app.utils.sanitize import sanitize_text

MAX_TITLE = 80
MAX_TEXT = 500
EXPIRED_MOMENTS = 3  # vista reducida de un memorial vencido


def settings(db: Session, memorial: mem_models.Memorial) -> tuple[bool, int]:
    f = memorial_plans.limits(db, memorial)
    return bool(f.get("timeline")), int(f.get("max_timeline") or 0)


def moments(db: Session, memorial_id: int) -> list[mem_models.TimelineMoment]:
    rows = db.query(mem_models.TimelineMoment).filter(mem_models.TimelineMoment.id_recuerdo == memorial_id).all()
    return sorted(rows, key=lambda m: (m.fecha is None, m.fecha or date.max, m.orden or 0, m.id))


def serialize(m: mem_models.TimelineMoment) -> dict:
    return {
        "id": m.id,
        "fecha": m.fecha.isoformat() if m.fecha else None,
        "titulo": m.titulo,
        "texto": m.texto,
        "image_url": normalize_image_url(m.image_url) if m.image_url else None,
    }


def public_list(db: Session, memorial: mem_models.Memorial) -> list[dict]:
    enabled, _ = settings(db, memorial)
    return [serialize(m) for m in moments(db, memorial.id)] if enabled else []


def clean(titulo: str | None, texto: str | None, fecha: str | None) -> dict:
    t = sanitize_text((titulo or "").strip(), max_length=200)
    if not t:
        raise HTTPException(400, "Escribe un título para el momento.")
    if len(t) > MAX_TITLE:
        raise HTTPException(400, f"El título puede tener hasta {MAX_TITLE} caracteres.")
    x = sanitize_text((texto or "").strip(), max_length=2000) or None
    if x and len(x) > MAX_TEXT:
        raise HTTPException(400, f"El texto puede tener hasta {MAX_TEXT} caracteres.")
    d = None
    if fecha:
        try:
            d = date.fromisoformat(fecha[:10])
        except ValueError:
            raise HTTPException(400, "Fecha inválida.")
        if d > date.today():
            raise HTTPException(400, "La fecha no puede ser futura.")
    return {"titulo": t, "texto": x, "fecha": d}


def check_can_add(db: Session, memorial: mem_models.Memorial) -> None:
    enabled, cap = settings(db, memorial)
    if not enabled:
        raise HTTPException(403, "La línea de tiempo está incluida en los planes Eterno e Infinito.")
    n = db.query(mem_models.TimelineMoment).filter(mem_models.TimelineMoment.id_recuerdo == memorial.id).count()
    if n >= cap:
        raise HTTPException(400, f"Alcanzaste el máximo de {cap} momentos de tu plan.")

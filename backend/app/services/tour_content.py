"""Contenido de la página pública /tour (vinzer.cl/tour): video demo + módulos.

Lo edita el SuperAdmin en Admin → Configuración → «Tour del software» y se guarda
en sys_saas_config.tour_content como {"video_url": str, "modules": [...]}.
NULL = el contenido original del frontend (lib/vinzer/tourContent.ts).

Cada módulo: id (ancla), short_label (botón de navegación), badge, title,
subtitle, description, image_url, image_alt, image_caption, tags, highlights y
video_time (capítulo del video, «01:15»; vacío = no aparece en los capítulos).
"""
from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

MAX_MODULES = 12
MAX_TAGS = 6
MAX_HIGHLIGHTS = 8
LIMITS = {
    "id": 40, "short_label": 30, "badge": 60, "title": 120, "subtitle": 200,
    "description": 1200, "image_url": 1000, "image_alt": 200, "image_caption": 300,
    "tag": 40, "highlight": 160, "video_time": 8,
}

_YT = re.compile(r"(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/)|youtu\.be/)([A-Za-z0-9_-]{11})")
_VIMEO = re.compile(r"vimeo\.com/(?:video/)?(\d{6,12})")


def _line(value: Any, key: str) -> str:
    return " ".join(str(value or "").split())[:LIMITS[key]]


def _slug(value: str) -> str:
    s = re.sub(r"[^a-z0-9-]+", "-", value.lower()).strip("-")
    return s[:LIMITS["id"]]


def normalize_video(url: Any) -> str:
    """URL de YouTube o Vimeo → URL embebible. Vacío = sin sección de video. Otra = 400."""
    raw = str(url or "").strip()
    if not raw:
        return ""
    m = _YT.search(raw)
    if m:
        return f"https://www.youtube-nocookie.com/embed/{m.group(1)}"
    m = _VIMEO.search(raw)
    if m:
        return f"https://player.vimeo.com/video/{m.group(1)}"
    raise HTTPException(status_code=400, detail="El video debe ser un enlace de YouTube o Vimeo.")


def video_thumbnail(embed_url: str) -> str | None:
    m = _YT.search(embed_url or "")
    return f"https://i.ytimg.com/vi/{m.group(1)}/hqdefault.jpg" if m else None


def _image(value: Any) -> str:
    v = str(value or "").strip()[:LIMITS["image_url"]]
    return v if (v.startswith("https://") or v.startswith("http://") or v.startswith("/")) else ""


def _list(value: Any, key: str, limit: int) -> list[str]:
    items = value if isinstance(value, list) else []
    out = [_line(x, key) for x in items]
    return [x for x in out if x][:limit]


def clean(payload: Any) -> dict:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Formato inválido.")
    raw = payload.get("modules")
    if not isinstance(raw, list) or not raw:
        raise HTTPException(status_code=400, detail="Agrega al menos un módulo.")
    if len(raw) > MAX_MODULES:
        raise HTTPException(status_code=400, detail=f"Máximo {MAX_MODULES} módulos.")
    modules, seen = [], set()
    for i, it in enumerate(raw, start=1):
        if not isinstance(it, dict):
            continue
        title = _line(it.get("title"), "title")
        if not title:
            raise HTTPException(status_code=400, detail=f"El módulo {i} necesita un título.")
        mid = _slug(str(it.get("id") or "")) or _slug(title) or f"modulo-{i}"
        base, n = mid, 2
        while mid in seen:
            mid, n = f"{base}-{n}"[:LIMITS["id"]], n + 1
        seen.add(mid)
        vt = _line(it.get("video_time"), "video_time")
        if vt and not re.fullmatch(r"\d{1,2}:\d{2}(?::\d{2})?", vt):
            raise HTTPException(status_code=400, detail=f"El minuto del video del módulo {i} debe ser como 01:15.")
        modules.append({
            "id": mid,
            "short_label": _line(it.get("short_label"), "short_label") or " ".join(title.split()[:2]),
            "badge": _line(it.get("badge"), "badge"),
            "title": title,
            "subtitle": _line(it.get("subtitle"), "subtitle"),
            "description": str(it.get("description") or "").strip()[:LIMITS["description"]],
            "image_url": _image(it.get("image_url")),
            "image_alt": _line(it.get("image_alt"), "image_alt") or title,
            "image_caption": _line(it.get("image_caption"), "image_caption"),
            "tags": _list(it.get("tags"), "tag", MAX_TAGS),
            "highlights": _list(it.get("highlights"), "highlight", MAX_HIGHLIGHTS),
            "video_time": vt,
        })
    return {"video_url": normalize_video(payload.get("video_url")), "modules": modules}


def get(db: Session) -> dict | None:
    """Contenido guardado o None (= el original del frontend)."""
    from app import models
    cfg = db.query(models.SaaSConfig).first()
    data = getattr(cfg, "tour_content", None) if cfg else None
    return data if isinstance(data, dict) and data.get("modules") else None


def save(db: Session, payload: Any | None) -> dict | None:
    """Guarda (o, con None, vuelve al contenido original)."""
    from app import models
    cfg = db.query(models.SaaSConfig).first()
    if not cfg:
        cfg = models.SaaSConfig(name="SaaS Crematorio")
        db.add(cfg)
    cfg.tour_content = clean(payload) if payload is not None else None
    db.commit()
    return get(db)

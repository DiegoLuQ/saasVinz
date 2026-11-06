"""Fotos de las mascotas para descargar (Mascotas → «Fotos de mascotas»).

Lista paginada por foto (no por mascota), búsqueda por nombre de mascota o de
dueño, descarga individual y ZIP con todas las del filtro. Las fotos se leen
solo del almacenamiento propio (R2_PUBLIC_URL): crm_pets.images lo puede
escribir el panel, así que nunca se descarga una URL arbitraria (SSRF).
"""
from __future__ import annotations

import io
import re
import unicodedata
import zipfile
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import requests
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models
from app.core.config import settings
from app.utils.r2 import normalize_image_url

ZIP_MAX_PHOTOS = 300
_EXT_RE = re.compile(r"\.(webp|jpe?g|png|gif|avif)$", re.I)


def _slug(text: Optional[str]) -> str:
    t = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()
    return t[:40] or "sin-nombre"


def _pet_urls(pet) -> list[str]:
    urls: list[str] = []
    for u in [*(pet.images or []), pet.image_url]:
        if u and u not in urls:
            urls.append(u)
    return urls


def _filename(pet, owner: Optional[str], index: int, url: str) -> str:
    m = _EXT_RE.search(url.split("?")[0])
    ext = (m.group(1).lower() if m else "webp").replace("jpeg", "jpg")
    return f"{_slug(pet.name)}-{_slug(owner)}-{index + 1}.{ext}"


def photo_rows(db: Session, tenant_id: int, q: Optional[str] = None) -> list[dict]:
    """Todas las fotos del filtro, mascota más reciente primero."""
    query = (
        db.query(models.Pet, models.Customer.name)
        .outerjoin(models.Customer, models.Customer.id == models.Pet.customer_id)
        .filter(models.Pet.tenant_id == tenant_id)
    )
    term = (q or "").strip()
    if term:
        like = f"%{term}%"
        query = query.filter(or_(models.Pet.name.ilike(like), models.Customer.name.ilike(like)))
    rows: list[dict] = []
    for pet, owner in query.order_by(models.Pet.created_at.desc(), models.Pet.id.desc()).all():
        for i, url in enumerate(_pet_urls(pet)):
            rows.append({
                "pet_id": pet.id,
                "pet_name": pet.name,
                "customer_name": owner,
                "index": i,
                "url": normalize_image_url(url),
                "filename": _filename(pet, owner, i, url),
            })
    return rows


def _allowed(url: str) -> bool:
    base = (settings.R2_PUBLIC_URL or "").rstrip("/")
    return bool(base) and url.startswith(base + "/")


def fetch_photo(url: str) -> Optional[bytes]:
    """Bytes de una foto propia (None si no es del almacenamiento o falla)."""
    if not url or not _allowed(url):
        return None
    try:
        resp = requests.get(url, timeout=15, allow_redirects=False)
        if resp.status_code == 200 and resp.content:
            return resp.content
    except Exception:
        pass
    return None


def build_zip(rows: list[dict]) -> tuple[bytes, int]:
    """ZIP en memoria con las fotos; devuelve (bytes, cuántas entraron)."""
    with ThreadPoolExecutor(max_workers=8) as pool:
        contents = list(pool.map(lambda r: fetch_photo(r["url"]), rows))
    buf = io.BytesIO()
    added = 0
    used: set[str] = set()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as zf:  # las fotos ya vienen comprimidas
        for row, data in zip(rows, contents):
            if not data:
                continue
            name = row["filename"]
            if name in used:
                name = f"{row['pet_id']}-{name}"
            used.add(name)
            zf.writestr(name, data)
            added += 1
    return buf.getvalue(), added

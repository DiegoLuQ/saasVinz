"""Eliminar memoriales desde Admin → Memoriales (individual o varios a la vez).

Regla: un memorial con mensajes (dedicatorias, en cualquier estado: pendientes,
publicados u ocultos) NO se elimina: son palabras de la familia y sus visitas.
Se borra el memorial con su línea de tiempo, video/voz, velas/flores (cascada) y
sus archivos en la nube que ya nadie usa (las fotos de la mascota que siguen en
su ficha se conservan: `_still_referenced`). La mascota y sus órdenes no se tocan.
"""
from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.internal.memorials.models import Dedication, Memorial, MemorialMedia, TimelineMoment

MAX_BULK = 100


def dedication_counts(db: Session, memorial_ids: list[int]) -> dict[int, int]:
    if not memorial_ids:
        return {}
    rows = (db.query(Dedication.id_recuerdo, func.count(Dedication.id_dedicatoria))
            .filter(Dedication.id_recuerdo.in_(memorial_ids)).group_by(Dedication.id_recuerdo).all())
    return {int(mid): int(n) for mid, n in rows}


def _files_of(db: Session, m: Memorial) -> list[str]:
    urls: list = [m.main_image_url, m.imagen_ia, *(m.lista_imagenes or [])]
    urls += [u for (u,) in db.query(TimelineMoment.image_url).filter(
        TimelineMoment.id_recuerdo == m.id, TimelineMoment.image_url.isnot(None)).all()]
    for u, th in db.query(MemorialMedia.url, MemorialMedia.thumbnail_url).filter(MemorialMedia.id_recuerdo == m.id).all():
        urls += [u, th]
    return [u for u in dict.fromkeys(urls)
            if isinstance(u, str) and (u.startswith("http") or u.startswith("/storage") or u.startswith("/static"))]


def delete_memorials(db: Session, ids: list[int]) -> dict:
    """Elimina los que no tienen mensajes; devuelve {deleted: [...], skipped: [...]}."""
    from app.api.internal.crm.pets.purge import delete_unused_files

    ids = list(dict.fromkeys(int(i) for i in ids))[:MAX_BULK]
    memorials = db.query(Memorial).filter(Memorial.id.in_(ids)).all() if ids else []
    counts = dedication_counts(db, [m.id for m in memorials])
    found = {m.id for m in memorials}

    deleted, skipped, files = [], [], []
    for m in memorials:
        name = (m.pet.name if m.pet else None) or f"Memorial #{m.id}"
        n = counts.get(m.id, 0)
        if n:
            skipped.append({"id": m.id, "name": name, "reason": f"Tiene {n} mensaje{'s' if n != 1 else ''}"})
            continue
        files += _files_of(db, m)
        deleted.append({"id": m.id, "name": name})
        db.delete(m)
    for missing in [i for i in ids if i not in found]:
        skipped.append({"id": missing, "name": f"Memorial #{missing}", "reason": "No existe"})
    db.commit()  # primero la base; los archivos después (si fallan, no revierten nada)

    result = delete_unused_files(db, files, label="memorials") if files else {"deleted": 0, "kept_shared": 0, "failed": 0}
    return {"deleted": deleted, "skipped": skipped, "files": result}

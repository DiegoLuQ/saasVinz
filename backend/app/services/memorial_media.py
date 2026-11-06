"""Video y audio de voz del memorial (planes con `max_videos` / `max_voice`: Infinito 1 + 1).

- Video ≤ MAX_SECONDS: se recomprime a MP4 720p con el mismo ffmpeg del video de bienvenida
  (`form_video.transcode`) y se guarda con MediaService (categoría `recuerdos`, miniatura).
- Voz ≤ MAX_SECONDS: se recomprime a M4A/AAC con el pipeline de melodías (`process_audio`).
Los sube la familia desde la gestión (PIN). Tabla `rec_media`; borrar quita también el archivo.
"""
from __future__ import annotations

import logging
import os
import tempfile
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.internal.common.media_service import MediaService
from app.api.internal.memorials import models as mem_models
from app.services import memorial_plans
from app.utils.r2 import normalize_image_url

logger = logging.getLogger(__name__)

KIND_VIDEO = "video"
KIND_VOICE = "voice"
KINDS = {KIND_VIDEO: "max_videos", KIND_VOICE: "max_voice"}
MAX_SECONDS = 30
TOLERANCE = 0.8
MAX_BYTES = {KIND_VIDEO: 80 * 1024 * 1024, KIND_VOICE: 20 * 1024 * 1024}
MAX_TITLE = 80


def caps(db: Session, memorial: mem_models.Memorial) -> dict:
    f = memorial_plans.limits(db, memorial)
    return {k: int(f.get(key) or 0) for k, key in KINDS.items()}


def serialize(m: mem_models.MemorialMedia) -> dict:
    return {
        "id": m.id, "kind": m.kind, "url": normalize_image_url(m.url),
        "thumbnail_url": normalize_image_url(m.thumbnail_url) if m.thumbnail_url else None,
        "duration": m.duration, "titulo": m.titulo,
    }


def items(db: Session, memorial_id: int) -> list[mem_models.MemorialMedia]:
    return db.query(mem_models.MemorialMedia).filter(
        mem_models.MemorialMedia.id_recuerdo == memorial_id).order_by(mem_models.MemorialMedia.id).all()


def public_lists(db: Session, memorial: mem_models.Memorial) -> tuple[list[dict], list[dict]]:
    """Solo lo que el plan actual permite (si baja de plan, deja de mostrarse sin borrarse)."""
    c = caps(db, memorial)
    rows = items(db, memorial.id)
    videos = [serialize(m) for m in rows if m.kind == KIND_VIDEO][: c[KIND_VIDEO]]
    voices = [serialize(m) for m in rows if m.kind == KIND_VOICE][: c[KIND_VOICE]]
    return videos, voices


def _save_temp(upload: UploadFile, limit: int) -> str:
    ext = os.path.splitext(upload.filename or "")[1][:8] or ".bin"
    path = os.path.join(tempfile.gettempdir(), f"memmedia_{uuid.uuid4().hex}{ext}")
    size = 0
    with open(path, "wb") as out:
        while chunk := upload.file.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                out.close()
                os.remove(path)
                raise HTTPException(400, f"El archivo es demasiado grande (máx. {limit // (1024 * 1024)} MB).")
            out.write(chunk)
    return path


def _to_m4a(src: str) -> str:
    import subprocess
    from app.services.memorial_melodies import _ffmpeg
    out = os.path.join(tempfile.gettempdir(), f"memvoz_{uuid.uuid4().hex}.m4a")
    proc = subprocess.run([_ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-vn",
                           "-t", "120", "-c:a", "aac", "-b:a", "128k", out], capture_output=True, text=True, timeout=180)
    if proc.returncode != 0 or not os.path.exists(out):
        logger.warning("ffmpeg no pudo leer la voz: %s", (proc.stderr or "")[-500:])
        if os.path.exists(out):
            os.remove(out)
        raise HTTPException(400, "No se pudo procesar el audio. Prueba con otro archivo (MP3 o M4A).")
    return out


def add(db: Session, memorial: mem_models.Memorial, kind: str, upload: UploadFile, titulo: str | None = None) -> None:
    from app.services import form_video, memorial_melodies

    if kind not in KINDS:
        raise HTTPException(400, "Tipo inválido.")
    cap = caps(db, memorial)[kind]
    if cap <= 0:
        raise HTTPException(403, "El video y la voz están incluidos en el plan Infinito.")
    count = db.query(mem_models.MemorialMedia).filter(
        mem_models.MemorialMedia.id_recuerdo == memorial.id, mem_models.MemorialMedia.kind == kind).count()
    if count >= cap:
        what = "video" if kind == KIND_VIDEO else "audio de voz"
        raise HTTPException(400, f"Tu plan permite {cap} {what}{'s' if cap > 1 and kind == KIND_VIDEO else ''}. Elimina el actual para subir otro.")

    src = _save_temp(upload, MAX_BYTES[kind])
    tmp_out = None
    pet = memorial.pet.name if memorial.pet else "Mascota"
    try:
        if kind == KIND_VIDEO:
            tmp_out, duration = form_video.transcode(src, MAX_SECONDS)
            item = MediaService.upload_media(
                db=db, local_path=tmp_out, media_type="video", category="recuerdos", ratio="original",
                description=f"Video del memorial de {pet}", alt_text=f"Video de {pet}",
                processing_mode="original", custom_prefix="memorial_video", tenant_id=memorial.id_tenant,
            )
        else:
            # Lo grabado en el navegador (webm) no trae la duración: se mide sobre un M4A intermedio
            tmp_out = _to_m4a(src)
            duration = memorial_melodies.probe_duration(tmp_out)
            if duration <= 0:
                raise HTTPException(400, "El archivo no parece ser un audio válido.")
            if duration > MAX_SECONDS + TOLERANCE:
                raise HTTPException(400, f"El audio dura {duration:.0f} s y el máximo es {MAX_SECONDS} s. Recórtalo e inténtalo de nuevo.")
            item = MediaService.upload_media(
                db=db, local_path=tmp_out, media_type="audio", category="recuerdos", ratio="original",
                description=f"Voz del memorial de {pet}", alt_text=f"Voz de {pet}",
                custom_prefix="memorial_voz", tenant_id=memorial.id_tenant,
            )
            duration = item.duration or duration
        t = (titulo or "").strip()[:MAX_TITLE] or None
        db.add(mem_models.MemorialMedia(
            id_recuerdo=memorial.id, kind=kind, url=item.url, thumbnail_url=getattr(item, "thumbnail_url", None),
            duration=round(min(float(duration or 0), MAX_SECONDS), 2), titulo=t, media_id=item.id,
        ))
        db.commit()
    finally:
        for p in (src, tmp_out):
            if p and os.path.exists(p):
                os.remove(p)


def remove(db: Session, row: mem_models.MemorialMedia) -> None:
    urls = [row.url, row.thumbnail_url]
    db.delete(row)
    db.commit()
    for u in urls:
        if not u:
            continue
        try:
            MediaService.delete_media_by_url(db, u)
        except Exception:  # noqa: BLE001 — el registro ya se borró
            logger.exception("No se pudo borrar el archivo %s del memorial", u)
    db.commit()


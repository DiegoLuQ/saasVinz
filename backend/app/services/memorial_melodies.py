"""
Melodías para memoriales.

El SuperAdmin sube melodías a la Biblioteca de Medios (media_type='audio',
globales: tenant_id NULL), de máximo MAX_SECONDS. Al subirlas se recomprimen a
M4A/AAC con el ffmpeg incluido (imageio_ffmpeg) para que pesen poco.

El crematorio (solo el tenant, no la familia) elige una por memorial y decide
si está activa. Se guarda en `memorial.diseno["melodia"] = {"media_id", "activa"}`;
la URL se resuelve al leer, así una melodía borrada de la biblioteca deja de
sonar sin dejar enlaces rotos.
"""
import logging
import os
import re
import subprocess
import tempfile
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.internal.common.models import MediaLibrary

logger = logging.getLogger(__name__)

MAX_SECONDS = 60
# Margen para archivos que miden 60,4 s por el encoder.
DURATION_TOLERANCE = 1.0
MAX_UPLOAD_BYTES = 30 * 1024 * 1024
AUDIO_EXTS = {".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".wav", ".flac", ".webm"}
MEDIA_TYPE = "audio"
CATEGORY = "melodias"
DISENO_KEY = "melodia"


def _ffmpeg() -> str:
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def probe_duration(path: str) -> float:
    proc = subprocess.run([_ffmpeg(), "-hide_banner", "-i", path], capture_output=True, text=True, timeout=60)
    stderr = proc.stderr or ""
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", stderr)
    if not m or "Audio:" not in stderr:
        logger.warning("Melodía sin duración/audio legible: %s", stderr[-500:])
        raise HTTPException(status_code=400, detail="El archivo no parece ser un audio válido.")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def process_audio(src_path: str) -> tuple[str, float]:
    """Valida la duración (≤ MAX_SECONDS) y recomprime a M4A/AAC 128 kbps.
    Devuelve (ruta del archivo procesado, duración en segundos)."""
    if os.path.getsize(src_path) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="El archivo es demasiado grande (máx. 30 MB).")

    duration = probe_duration(src_path)
    if duration <= 0:
        raise HTTPException(status_code=400, detail="El archivo no parece ser un audio válido.")
    if duration > MAX_SECONDS + DURATION_TOLERANCE:
        raise HTTPException(
            status_code=400,
            detail=f"La melodía dura {duration:.0f} s y el máximo es {MAX_SECONDS} s. Recórtala e inténtalo de nuevo.",
        )

    out_path = os.path.join(tempfile.gettempdir(), f"melodia_{uuid.uuid4().hex}.m4a")
    proc = subprocess.run([
        _ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-i", src_path,
        "-vn", "-t", str(MAX_SECONDS),
        "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
        "-movflags", "+faststart",
        out_path,
    ], capture_output=True, text=True, timeout=180)
    if proc.returncode != 0 or not os.path.exists(out_path):
        logger.warning("ffmpeg no pudo convertir la melodía: %s", (proc.stderr or "")[-800:])
        if os.path.exists(out_path):
            os.remove(out_path)
        raise HTTPException(status_code=400, detail="No se pudo procesar el audio. Prueba con otro archivo (MP3 o M4A).")
    return out_path, round(min(duration, MAX_SECONDS), 2)


def _query_melodies(db: Session):
    return db.query(MediaLibrary).filter(
        MediaLibrary.media_type == MEDIA_TYPE,
        MediaLibrary.tenant_id.is_(None),
    )


def serialize(item: MediaLibrary) -> dict:
    return {
        "id": item.id,
        "name": (item.description or item.alt_text or "Melodía").strip(),
        "url": item.url,
        "duration": item.duration,
    }


def list_melodies(db: Session) -> list[dict]:
    items = _query_melodies(db).order_by(MediaLibrary.description.asc(), MediaLibrary.id.asc()).all()
    return [serialize(it) for it in items]


def get_melody(db: Session, media_id: int) -> MediaLibrary | None:
    return _query_melodies(db).filter(MediaLibrary.id == media_id).first()


def resolve(db: Session, diseno: dict | None) -> dict | None:
    """Melodía elegida del memorial: {id, name, url, duration, activa} o None
    si no tiene o la melodía ya no existe en la biblioteca."""
    cfg = (diseno or {}).get(DISENO_KEY)
    if not isinstance(cfg, dict) or not cfg.get("media_id"):
        return None
    try:
        item = get_melody(db, int(cfg["media_id"]))
    except (TypeError, ValueError):
        return None
    if not item:
        return None
    return {**serialize(item), "activa": bool(cfg.get("activa"))}

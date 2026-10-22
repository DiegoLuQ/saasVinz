"""Video de bienvenida del formulario público (planes PRO y ULTRA).

El crematorio puede mostrar un video corto (máx. MAX_SECONDS) desde un botón
"Ver video" en el mensaje de bienvenida. Tres orígenes:

- upload: archivo subido; se valida la duración, se recomprime a MP4 720p
  (H.264 + AAC, faststart) y se guarda en R2 bajo tenant_{id}/form-video/.
- vimeo: enlace de Vimeo; la duración se lee del oEmbed público.
- cloudflare: video de Cloudflare Stream; la duración se suma del manifiesto HLS
  público (si el video exige URL firmada no se puede comprobar y se rechaza).

Los enlaces se guardan solo en su forma canónica de reproductor (embed), armada
aquí a partir del ID: nunca se guarda ni se pide al servidor una URL arbitraria.
"""
import logging
import os
import re
import subprocess
import tempfile
import uuid
from typing import Any

import httpx
from fastapi import HTTPException

from app import models
from app.core.config import settings

MAX_SECONDS = 30
# Margen para redondeos de los contenedores (un video de "30 s" suele medir 30,03).
DURATION_TOLERANCE = 0.6
MAX_UPLOAD_BYTES = 80 * 1024 * 1024
SOURCES = {"upload", "vimeo", "cloudflare"}
DEFAULT_BUTTON_TEXT = "Ver video"

logger = logging.getLogger(__name__)

_VIMEO_IN = re.compile(
    r"^https?://(?:www\.)?(?:player\.)?vimeo\.com/(?:video/)?(\d{5,12})(?:/([0-9a-f]{6,20}))?/?(?:[?#].*)?$", re.I
)
_VIMEO_HASH_PARAM = re.compile(r"[?&]h=([0-9a-f]{6,20})", re.I)
_CF_CUSTOMER_IN = re.compile(
    r"^https?://(customer-[a-z0-9]{6,40})\.cloudflarestream\.com/([0-9a-f]{32})(?:/[\w./-]*)?(?:[?#].*)?$", re.I
)
_CF_DELIVERY_IN = re.compile(
    r"^https?://(?:iframe\.|watch\.)?videodelivery\.net/([0-9a-f]{32})(?:/[\w./-]*)?(?:[?#].*)?$", re.I
)
# Formas canónicas que se aceptan al guardar.
_VIMEO_EMBED = re.compile(r"^https://player\.vimeo\.com/video/\d{5,12}(?:\?h=[0-9a-f]{6,20})?$")
_CF_EMBED = re.compile(
    r"^https://(?:customer-[a-z0-9]{6,40}\.cloudflarestream\.com|iframe\.videodelivery\.net)/[0-9a-f]{32}(?:/iframe)?$"
)


def tenant_can_use_form_video(tenant: models.Tenant | None) -> bool:
    """Característica del plan "Video de bienvenida" (regla anterior: PRO y ULTRA)."""
    from app.services.plan_features import tenant_has
    return tenant_has(tenant, "integraciones:video_bienvenida")


def require_form_video_plan(tenant: models.Tenant | None) -> None:
    if not tenant_can_use_form_video(tenant):
        raise HTTPException(status_code=403, detail="El video de bienvenida no está incluido en tu plan.")


def upload_prefix(tenant_id: int) -> str:
    return f"{settings.R2_PUBLIC_URL}/tenant_{tenant_id}/form-video/"


# ===== Normalización (lo que se guarda en form_config) =====

def normalize_video(raw: Any) -> dict | None:
    """{source, url, duration} válido o None."""
    if not isinstance(raw, dict):
        return None
    source = str(raw.get("source") or "")
    url = str(raw.get("url") or "").strip()
    if source not in SOURCES or not url or len(url) > 500:
        return None
    if source == "vimeo" and not _VIMEO_EMBED.match(url):
        return None
    if source == "cloudflare" and not _CF_EMBED.match(url):
        return None
    if source == "upload" and not (settings.R2_PUBLIC_URL and url.startswith(f"{settings.R2_PUBLIC_URL}/")):
        return None
    try:
        duration = round(float(raw.get("duration") or 0), 2)
    except (TypeError, ValueError):
        duration = 0.0
    return {"source": source, "url": url, "duration": duration}


def _too_long(seconds: float) -> bool:
    return seconds > MAX_SECONDS + DURATION_TOLERANCE


def _too_long_error(seconds: float) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail=f"El video dura {seconds:.0f} s y el máximo es {MAX_SECONDS} s. Recórtalo e inténtalo de nuevo.",
    )


# ===== Enlaces (Vimeo / Cloudflare Stream) =====

def _get(url: str, params: dict | None = None) -> httpx.Response:
    try:
        r = httpx.get(url, params=params, timeout=8, follow_redirects=False, headers={"User-Agent": "Vinzer/1.0"})
    except httpx.HTTPError:
        raise HTTPException(status_code=400, detail="No se pudo consultar el video. Revisa el enlace e inténtalo de nuevo.")
    return r


def _vimeo(video_id: str, hash_: str | None) -> dict:
    page = f"https://vimeo.com/{video_id}" + (f"/{hash_}" if hash_ else "")
    r = _get("https://vimeo.com/api/oembed.json", {"url": page})
    if r.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Vimeo no permite leer este video. Revisa que sea público o «no listado» y que permita insertarse.",
        )
    duration = float((r.json() or {}).get("duration") or 0)
    if duration <= 0:
        raise HTTPException(status_code=400, detail="No se pudo leer la duración del video de Vimeo.")
    if _too_long(duration):
        raise _too_long_error(duration)
    embed = f"https://player.vimeo.com/video/{video_id}" + (f"?h={hash_}" if hash_ else "")
    return {"source": "vimeo", "url": embed, "duration": round(duration, 2)}


def _hls_duration(manifest_url: str) -> float:
    r = _get(manifest_url)
    if r.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="No se pudo leer el video de Cloudflare Stream. Debe ser público (sin URL firmada).",
        )
    text = r.text
    if "#EXTINF" not in text:
        # Lista maestra: tomar la primera variante (misma duración en todas).
        variant = next((ln.strip() for ln in text.splitlines() if ln.strip() and not ln.startswith("#")), None)
        if not variant or "://" in variant or variant.startswith("//"):
            raise HTTPException(status_code=400, detail="No se pudo leer la duración del video de Cloudflare Stream.")
        base = manifest_url.rsplit("/", 1)[0]
        r = _get(f"{base}/{variant.lstrip('/')}")
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail="No se pudo leer la duración del video de Cloudflare Stream.")
        text = r.text
    total = sum(float(m) for m in re.findall(r"#EXTINF:([\d.]+)", text))
    if total <= 0:
        raise HTTPException(status_code=400, detail="No se pudo leer la duración del video de Cloudflare Stream.")
    return total


def _cloudflare(host: str, uid: str) -> dict:
    duration = _hls_duration(f"https://{host}/{uid}/manifest/video.m3u8")
    if _too_long(duration):
        raise _too_long_error(duration)
    embed = f"https://{host}/{uid}/iframe" if host.endswith("cloudflarestream.com") else f"https://iframe.videodelivery.net/{uid}"
    return {"source": "cloudflare", "url": embed, "duration": round(duration, 2)}


def check_link(url: str) -> dict:
    """Valida un enlace de Vimeo o Cloudflare Stream (≤ MAX_SECONDS) y devuelve
    {source, url (reproductor canónico), duration}."""
    url = (url or "").strip()
    m = _VIMEO_IN.match(url)
    if m:
        hash_ = m.group(2)
        if not hash_:
            hm = _VIMEO_HASH_PARAM.search(url)
            hash_ = hm.group(1) if hm else None
        return _vimeo(m.group(1), hash_)
    m = _CF_CUSTOMER_IN.match(url)
    if m:
        return _cloudflare(f"{m.group(1).lower()}.cloudflarestream.com", m.group(2).lower())
    m = _CF_DELIVERY_IN.match(url)
    if m:
        return _cloudflare("videodelivery.net", m.group(1).lower())
    raise HTTPException(
        status_code=400,
        detail="Enlace no reconocido. Pega un enlace de Vimeo (vimeo.com/…) o de Cloudflare Stream.",
    )


# ===== Archivo subido =====

def _ffmpeg() -> str:
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def probe_duration(path: str) -> float:
    proc = subprocess.run([_ffmpeg(), "-hide_banner", "-i", path], capture_output=True, text=True, timeout=60)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", proc.stderr or "")
    if not m:
        logger.warning("Video de bienvenida sin duración legible (%s bytes): %s",
                       os.path.getsize(path) if os.path.exists(path) else 0, (proc.stderr or "")[-500:])
        raise HTTPException(status_code=400, detail="El archivo no parece ser un video válido.")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def process_upload(src_path: str, tenant_id: int) -> dict:
    """Valida la duración, recomprime a MP4 720p y sube a R2."""
    from app.utils.r2 import upload_file_to_r2

    duration = probe_duration(src_path)
    if duration <= 0:
        raise HTTPException(status_code=400, detail="El archivo no parece ser un video válido.")
    if _too_long(duration):
        raise _too_long_error(duration)

    out_path = os.path.join(tempfile.gettempdir(), f"formvideo_{uuid.uuid4().hex}.mp4")
    try:
        proc = subprocess.run([
            _ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-i", src_path,
            "-t", str(MAX_SECONDS + 1),
            # Lado largo máx. 1280 px (720p horizontal o vertical), dimensiones pares.
            "-vf", "scale='if(gt(ih,iw),-2,min(1280,iw))':'if(gt(ih,iw),min(1280,ih),-2)',scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
            out_path,
        ], capture_output=True, text=True, timeout=300)
        if proc.returncode != 0 or not os.path.exists(out_path):
            logger.warning("ffmpeg no pudo convertir el video de bienvenida: %s", (proc.stderr or "")[-800:])
            raise HTTPException(status_code=400, detail="No se pudo procesar el video. Prueba con otro archivo (MP4 o MOV).")
        key = f"tenant_{tenant_id}/form-video/{uuid.uuid4().hex}.mp4"
        url = upload_file_to_r2(out_path, settings.R2_BUCKET_NAME, key)
        if not url:
            raise HTTPException(status_code=502, detail="No se pudo guardar el video. Inténtalo de nuevo.")
        return {"source": "upload", "url": url, "duration": round(min(duration, MAX_SECONDS), 2)}
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


# ===== Recorrido de la configuración =====

def config_videos(cfg: dict) -> list[dict]:
    """Todos los videos de una configuración normalizada (general + formularios)."""
    out = []
    general = (cfg.get("welcome_modal") or {}).get("video")
    if general:
        out.append(general)
    for cf in cfg.get("custom_forms") or []:
        v = (cf.get("welcome_modal") or {}).get("video")
        if v:
            out.append(v)
    return out


def strip_videos(cfg: dict) -> dict:
    """Quita el video de la configuración pública (plan sin la función)."""
    wm = cfg.get("welcome_modal")
    if isinstance(wm, dict):
        wm["video"] = None
        wm["show_video_button"] = False
    for cf in cfg.get("custom_forms") or []:
        cwm = cf.get("welcome_modal")
        if isinstance(cwm, dict):
            cwm["video"] = None
            cwm["show_video_button"] = False
    return cfg


def validate_new_config(tenant: models.Tenant, old_cfg: dict, new_cfg: dict) -> list[str]:
    """Comprueba los videos nuevos y devuelve las claves R2 de los subidos que
    dejaron de usarse (para borrarlos tras guardar)."""
    old = {v["url"]: v for v in config_videos(old_cfg)}
    new = config_videos(new_cfg)
    prefix = upload_prefix(tenant.id)
    for v in new:
        if v["url"] in old:
            continue
        require_form_video_plan(tenant)
        if v["source"] == "upload":
            if not v["url"].startswith(prefix):
                raise HTTPException(status_code=400, detail="Video no válido: súbelo de nuevo.")
        else:
            checked = check_link(v["url"])
            v["duration"] = checked["duration"]
    new_urls = {v["url"] for v in new}
    return [
        url[len(settings.R2_PUBLIC_URL) + 1:]
        for url, v in old.items()
        if v["source"] == "upload" and url not in new_urls and url.startswith(prefix)
    ]

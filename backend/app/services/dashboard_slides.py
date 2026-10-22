"""Carrusel del banner del inicio de los crematorios (/dashboard).

Lo edita el SuperAdmin (Configuración → «Banner del panel») y se guarda en
sys_saas_config.dashboard_slides como {"default": {...}, "slides": [...]}:

- "default": la diapositiva principal. Siempre aparece primero y no se puede
  quitar; sin datos guardados se usa la original del frontend («Cada historia
  merece un adiós digno»). Sin imagen propia usa la imagen original.
- "slides": hasta MAX_SLIDES diapositivas extra.

Cada una: imagen, encuadre, degradado, título, mensaje y botón de WhatsApp (al
número de «Datos del SaaS»). Formato anterior (solo la lista) se sigue leyendo.
Se entregan en /api/public/platform-info.
"""
from __future__ import annotations

import re
from typing import Any

MAX_SLIDES = 3
LIMITS = {"image_url": 1000, "title": 80, "message": 240, "button_label": 30, "whatsapp_text": 300}
DEFAULT_BUTTON = "Escríbenos por WhatsApp"
# Encuadre de la imagen (background-position en %): qué parte de la foto se ve
# en el banner, que es mucho más ancho que alto. Por defecto, a la derecha.
DEFAULT_POS_X = 80
DEFAULT_POS_Y = 50
# Degradé sobre la imagen (desde la izquierda, bajo el texto) y color del texto.
# overlay_auto = celeste en modo claro y azul noche en oscuro (como la original).
DEFAULT_OVERLAY = "#D8EDFA"
DEFAULT_OVERLAY_OPACITY = 85
TEXT_THEMES = ("dark", "light")


def _hex(value: Any, default: str) -> str:
    v = str(value or "").strip()
    return v.upper() if re.fullmatch(r"#[0-9a-fA-F]{6}", v) else default


def _pos(value: Any, default: int) -> int:
    try:
        return max(0, min(100, int(round(float(value)))))
    except (TypeError, ValueError):
        return default


def _text(value: Any, key: str) -> str:
    return " ".join(str(value or "").split())[:LIMITS[key]] if key != "message" else str(value or "").strip()[:LIMITS[key]]


def _clean_one(it: Any, *, principal: bool = False) -> dict | None:
    if not isinstance(it, dict):
        return None
    image = _text(it.get("image_url"), "image_url")
    title = _text(it.get("title"), "title")
    if image and not (image.startswith("http") or image.startswith("/")):
        image = ""
    # Una extra necesita imagen y título; la principal puede venir sin ellos
    # (el frontend completa con la imagen / texto originales).
    if not principal and (not image or not title):
        return None
    return {
        "image_url": image,
        "title": title,
        "message": _text(it.get("message"), "message"),
        "button_label": _text(it.get("button_label"), "button_label") or DEFAULT_BUTTON,
        "whatsapp_text": _text(it.get("whatsapp_text"), "whatsapp_text"),
        "show_button": bool(it.get("show_button", not principal)),
        "pos_x": _pos(it.get("pos_x"), DEFAULT_POS_X),
        "pos_y": _pos(it.get("pos_y"), DEFAULT_POS_Y),
        "overlay_auto": bool(it.get("overlay_auto", principal)),
        "overlay_color": _hex(it.get("overlay_color"), DEFAULT_OVERLAY),
        "overlay_opacity": _pos(it.get("overlay_opacity"), DEFAULT_OVERLAY_OPACITY),
        "text_theme": it.get("text_theme") if it.get("text_theme") in TEXT_THEMES else "dark",
    }


def clean_slides(raw: Any) -> list[dict]:
    """Diapositivas extra: hasta MAX_SLIDES, cada una con imagen y título."""
    out = [s for s in (_clean_one(it) for it in (raw if isinstance(raw, list) else [])) if s]
    return out[:MAX_SLIDES]


def clean_default(raw: Any) -> dict | None:
    """Diapositiva principal guardada, o None = la original del frontend."""
    return _clean_one(raw, principal=True) if isinstance(raw, dict) else None


def parse(stored: Any) -> tuple[dict | None, list[dict]]:
    """(principal, extras) desde lo guardado; acepta el formato anterior (lista)."""
    if isinstance(stored, dict):
        return clean_default(stored.get("default")), clean_slides(stored.get("slides"))
    return None, clean_slides(stored)


def serialize(default: Any, slides: Any) -> dict:
    return {"default": clean_default(default), "slides": clean_slides(slides)}

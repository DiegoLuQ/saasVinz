"""Lógica compartida de memoriales (admin, tenant y gestión familiar)."""

# Claves derivadas que se inyectan solo en la respuesta (no se persisten).
_DERIVED_DISENO_KEYS = {"theme_config"}


_MAX_CAPTIONS = 30
_MAX_CAPTION_LEN = 60


def clean_captions(value) -> dict:
    """Cédulas de la plantilla Galería ({url_foto: texto}): texto plano, acotado
    en largo y cantidad. Las vacías se descartan."""
    from app.utils.sanitize import sanitize_text

    if not isinstance(value, dict):
        return {}
    out: dict = {}
    for url, text in list(value.items())[:_MAX_CAPTIONS]:
        if not isinstance(url, str) or not isinstance(text, str):
            continue
        clean = (sanitize_text(text, max_length=_MAX_CAPTION_LEN) or "").strip()[:_MAX_CAPTION_LEN]
        if clean:
            out[url[:1000]] = clean
    return out


def merge_diseno(current: dict | None, incoming: dict | None) -> dict:
    """
    Combina el diseño guardado con el que llega en un PATCH.

    Cada editor (SuperAdmin, tenant, familia) envía solo las claves que maneja;
    reemplazar el dict completo borraba las del resto (p. ej. el admin pisaba la
    `portada_url` elegida por la familia). Un valor None o "" elimina la clave,
    así `color_fondo` puede volver a "sin color personalizado".
    """
    merged = {k: v for k, v in (current or {}).items() if k not in _DERIVED_DISENO_KEYS}
    for key, value in (incoming or {}).items():
        if key in _DERIVED_DISENO_KEYS:
            continue
        if key == "captions":
            value = clean_captions(value)
        if value is None or value == "" or value == {}:
            merged.pop(key, None)
        else:
            merged[key] = value
    return merged

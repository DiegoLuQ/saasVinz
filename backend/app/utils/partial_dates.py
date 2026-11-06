"""Fechas parciales de la mascota (formularios de la familia).

La familia puede saber la fecha completa, solo el mes y año, o solo el año:
- "2015-03-12" → day
- "2015-03"    → month (se guarda el día 1)
- "2015"       → year  (se guarda el 1 de enero)
La precisión va a crm_pets.birth_date_precision / death_date_precision.
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Optional, Tuple

_RE = re.compile(r"^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$")
MIN_YEAR = 1950
_LEGACY = ("%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d")


def parse_partial_date(raw) -> Tuple[Optional[datetime], str]:
    """(fecha, precisión). Texto vacío o inválido → (None, 'day')."""
    if not raw or not isinstance(raw, str):
        return None, "day"
    s = raw.strip()[:10]
    m = _RE.match(s)
    try:
        if m:
            y, mo, d = int(m.group(1)), m.group(2), m.group(3)
            if d:
                return datetime(y, int(mo), int(d)), "day"
            if mo:
                return datetime(y, int(mo), 1), "month"
            return datetime(y, 1, 1), "year"
        for fmt in _LEGACY:
            try:
                return datetime.strptime(s, fmt), "day"
            except ValueError:
                continue
    except ValueError:
        pass
    return None, "day"


def validate_partial_date(raw, label: str) -> Optional[str]:
    """Normaliza lo que manda el formulario (o lanza ValueError con el mensaje)."""
    if raw in (None, ""):
        return None
    value, precision = parse_partial_date(str(raw))
    if value is None:
        raise ValueError(f"{label}: fecha inválida")
    today = date.today()
    if value.year < MIN_YEAR or value.date() > today:
        raise ValueError(f"{label}: la fecha no puede ser futura ni anterior a {MIN_YEAR}")
    if precision == "year":
        return f"{value.year:04d}"
    if precision == "month":
        return f"{value.year:04d}-{value.month:02d}"
    return value.strftime("%Y-%m-%d")

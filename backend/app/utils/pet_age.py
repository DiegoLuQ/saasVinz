"""Edad de la mascota con unidad: días, semanas, meses o años.

Los formularios de la familia mandan `age` (número) + `ageUnit`; si la familia
puso nacimiento y fallecimiento y dejó la edad vacía, se calcula con las fechas
(aproximada si alguna es solo «año» o «mes y año»)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Tuple

from app.utils.partial_dates import parse_partial_date

AGE_UNITS = ("days", "weeks", "months", "years")
DEFAULT_UNIT = "years"
MAX_AGE = 999
_LABELS = {"days": ("día", "días"), "weeks": ("semana", "semanas"),
           "months": ("mes", "meses"), "years": ("año", "años")}


def clean_unit(unit) -> str:
    return unit if unit in AGE_UNITS else DEFAULT_UNIT


def format_age(value, unit) -> str:
    if value in (None, ""):
        return ""
    n = int(value)
    one, many = _LABELS[clean_unit(unit)]
    return f"{n} {one if n == 1 else many}"


def age_between(birth: datetime, death: datetime) -> Optional[Tuple[int, str]]:
    """Edad al fallecer en la unidad más natural (None si las fechas no cuadran)."""
    days = (death - birth).days
    if days < 0:
        return None
    if days < 31:
        return max(days, 1), "days"
    if days < 91:
        return days // 7, "weeks"
    months = (death.year - birth.year) * 12 + death.month - birth.month - (1 if death.day < birth.day else 0)
    if months < 24:
        return max(months, 1), "months"
    return months // 12, "years"


def age_from_partial_dates(birth_raw, death_raw) -> Optional[Tuple[int, str]]:
    birth, _ = parse_partial_date(birth_raw if isinstance(birth_raw, str) else None)
    death, _ = parse_partial_date(death_raw if isinstance(death_raw, str) else None)
    if not birth or not death:
        return None
    return age_between(birth, death)


def parse_age(raw) -> Optional[int]:
    """«8», «8 años», 8 → 8; vacío o 0 → None; fuera de rango → ValueError."""
    if raw in (None, ""):
        return None
    digits = "".join(ch for ch in str(raw) if ch.isdigit())
    if not digits:
        raise ValueError("Edad inválida")
    n = int(digits)
    if n == 0:
        return None
    if n > MAX_AGE:
        raise ValueError("Edad fuera de rango")
    return n


def normalize_form_age(pet: dict) -> None:
    """Deja pet['age'] (texto con el número) + pet['ageUnit']; calcula con las fechas si falta."""
    n = parse_age(pet.get("age"))
    if n is None:
        pet.pop("ageAuto", None)
        calc = age_from_partial_dates(pet.get("birthDate"), pet.get("deathDate"))
        if calc:
            n, unit = calc
            pet["ageAuto"] = True
        else:
            pet["age"] = ""
            pet.pop("ageUnit", None)
            return
    else:
        unit = clean_unit(pet.get("ageUnit"))
        pet["ageAuto"] = bool(pet.get("ageAuto"))
    pet["age"] = str(n)
    pet["ageUnit"] = unit

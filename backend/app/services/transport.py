"""Cobro de traslado por comuna (zonas).

El crematorio agrupa comunas en zonas con un precio de traslado (ej. «Zona urbana:
sin cargo», «Zona 2: $8.000») y elige qué comunas cuentan: la del retiro de la
mascota, la de entrega de cenizas o ambas. El traslado se cobra UNA vez por servicio
(el mismo valor cubre retiro y entrega): si las comunas caen en zonas distintas se
cobra la zona más cara. Una comuna sin zona solo muestra un aviso (no bloquea el
envío) y todo el traslado queda «a cotizar».

Config en `sys_tenants.transport_config` (una sola tarifa para todo el crematorio,
no cambia con las tablas de precios). La solicitud web congela el cobro en
`owner_data.transport` y la orden lo guarda en `oc_financial.transport_price`
(+ `transport_detail`). Como el recargo por peso: el convenio no lo rebaja.

Las comunas se comparan por nombre normalizado (sin tildes, minúsculas), porque el
formulario usa la lista de `country-state-city` y la región puede venir escrita
distinto. Espejo en frontend: lib/transport.ts.
"""
from __future__ import annotations

import re
import unicodedata
import uuid
from typing import Any, Optional

MAX_ZONES = 20
MAX_COMMUNES = 400          # en total, sumando todas las zonas
MAX_ZONE_NAME = 40
MAX_COMMUNE_NAME = 60
MAX_MESSAGE = 200
MAX_PRICE = 10_000_000
DEFAULT_MESSAGE = "No tenemos una tarifa fija de traslado para esa comuna: te contactaremos para cotizarlo."

DEFAULT_CONFIG: dict = {
    "enabled": False,
    "charge_pickup": True,
    "charge_delivery": True,
    "show_prices": True,
    "uncovered_message": "",
    "zones": [],
}


def norm(name: Any) -> str:
    """«Ñuñoa » → «nunoa» (para comparar comunas)."""
    s = unicodedata.normalize("NFKD", str(name or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip().lower()


def _clean_text(value: Any, limit: int) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def clean_config(raw: Any) -> dict:
    """Valida y normaliza la configuración. ValueError con mensaje para el usuario."""
    raw = raw if isinstance(raw, dict) else {}
    zones_in = raw.get("zones") or []
    if not isinstance(zones_in, list):
        raise ValueError("Zonas inválidas")
    if len(zones_in) > MAX_ZONES:
        raise ValueError(f"Máximo {MAX_ZONES} zonas")

    zones, seen, total = [], {}, 0
    for i, z in enumerate(zones_in, start=1):
        if not isinstance(z, dict):
            raise ValueError("Zona inválida")
        name = _clean_text(z.get("name"), MAX_ZONE_NAME)
        if not name:
            raise ValueError(f"La zona {i} necesita un nombre")
        try:
            price = round(float(z.get("price") or 0))
        except (TypeError, ValueError):
            raise ValueError(f"Precio inválido en «{name}»")
        if price < 0 or price > MAX_PRICE:
            raise ValueError(f"Precio inválido en «{name}»")
        communes = []
        for c in z.get("communes") or []:
            cname = _clean_text(c, MAX_COMMUNE_NAME)
            key = norm(cname)
            if not key:
                continue
            if key in seen:
                if seen[key] == name:
                    continue
                raise ValueError(f"«{cname}» está en dos zonas («{seen[key]}» y «{name}»)")
            seen[key] = name
            communes.append(cname)
        total += len(communes)
        zid = _clean_text(z.get("id"), 40) or uuid.uuid4().hex[:10]
        zones.append({"id": zid, "name": name, "price": price, "communes": communes})
    if total > MAX_COMMUNES:
        raise ValueError(f"Máximo {MAX_COMMUNES} comunas en total")

    return {
        "enabled": bool(raw.get("enabled")),
        "charge_pickup": bool(raw.get("charge_pickup", True)),
        "charge_delivery": bool(raw.get("charge_delivery", True)),
        "show_prices": bool(raw.get("show_prices", True)),
        "uncovered_message": _clean_text(raw.get("uncovered_message"), MAX_MESSAGE),
        "zones": zones,
    }


def config_of(tenant) -> dict:
    """Configuración guardada (o la de defecto). Nunca lanza."""
    raw = getattr(tenant, "transport_config", None)
    if not isinstance(raw, dict):
        return dict(DEFAULT_CONFIG)
    try:
        return clean_config(raw)
    except ValueError:
        return dict(DEFAULT_CONFIG)


def is_active(cfg: dict) -> bool:
    return bool(cfg.get("enabled")) and bool(cfg.get("charge_pickup") or cfg.get("charge_delivery"))


def zone_for(cfg: dict, commune: Any) -> Optional[dict]:
    key = norm(commune)
    if not key:
        return None
    for z in cfg.get("zones") or []:
        if any(norm(c) == key for c in z.get("communes") or []):
            return z
    return None


def _leg(cfg: dict, commune: Any) -> Optional[dict]:
    name = _clean_text(commune, MAX_COMMUNE_NAME)
    if not name:
        return None
    z = zone_for(cfg, name)
    if z is None:
        return {"commune": name, "zone": None, "price": None, "covered": False}
    return {"commune": name, "zone": z["name"], "price": z["price"], "covered": True}


def quote(cfg: dict, pickup_commune: Any, delivery_commune: Any) -> Optional[dict]:
    """Cobro de traslado: {pickup, delivery, zone, total, uncovered}. None si está apagado.

    Un solo cobro para retiro + entrega: la zona más cara de las comunas que cuentan.
    Si alguna comuna no tiene zona, el traslado completo queda a cotizar (total 0).
    """
    if not is_active(cfg):
        return None
    pickup = _leg(cfg, pickup_commune) if cfg.get("charge_pickup") else None
    delivery = _leg(cfg, delivery_commune) if cfg.get("charge_delivery") else None
    legs = [l for l in (pickup, delivery) if l]
    uncovered = [l["commune"] for l in legs if not l["covered"]]
    top = max((l for l in legs if l["covered"]), key=lambda l: l["price"] or 0, default=None)
    return {
        "pickup": pickup,
        "delivery": delivery,
        "zone": top["zone"] if top and not uncovered else None,
        "total": (top["price"] or 0) if top and not uncovered else 0,
        "uncovered": uncovered,
    }


def owner_communes(owner: dict) -> tuple[str, str]:
    """(comuna de retiro, comuna de entrega) de los datos del formulario."""
    owner = owner if isinstance(owner, dict) else {}
    delivery = owner.get("commune") or ""
    pickup = owner.get("pickupCommune") or ""
    if owner.get("pickupSameAsOwner") and not pickup:
        pickup = delivery
    return str(pickup), str(delivery)


def quote_owner(cfg: dict, owner: dict) -> Optional[dict]:
    pickup, delivery = owner_communes(owner)
    return quote(cfg, pickup, delivery)


def snapshot_into(cfg: dict, owner: dict) -> None:
    """Congela el cobro en owner_data.transport (o lo quita si no corresponde)."""
    q = quote_owner(cfg, owner)
    if q and (q["pickup"] or q["delivery"]):
        owner["transport"] = {**q, "show_prices": bool(cfg.get("show_prices"))}
    else:
        owner.pop("transport", None)


def submission_charge(owner: Any) -> float:
    """Monto congelado en una solicitud web (0 si no tiene)."""
    t = owner.get("transport") if isinstance(owner, dict) else None
    if not isinstance(t, dict):
        return 0.0
    try:
        return float(t.get("total") or 0)
    except (TypeError, ValueError):
        return 0.0


def submission_detail(owner: Any) -> Optional[dict]:
    t = owner.get("transport") if isinstance(owner, dict) else None
    if not isinstance(t, dict):
        return None
    return {"pickup": t.get("pickup"), "delivery": t.get("delivery"), "zone": t.get("zone")}


def public_config(cfg: dict) -> Optional[dict]:
    """Lo que ve el formulario público (precios solo si el crematorio los muestra)."""
    if not is_active(cfg):
        return None
    show = bool(cfg.get("show_prices"))
    return {
        "charge_pickup": bool(cfg.get("charge_pickup")),
        "charge_delivery": bool(cfg.get("charge_delivery")),
        "show_prices": show,
        "uncovered_message": cfg.get("uncovered_message") or DEFAULT_MESSAGE,
        "zones": [{"name": z["name"], "price": z["price"] if show else None, "communes": z["communes"]}
                  for z in cfg.get("zones") or []],
    }


def places_text(detail: Any) -> str:
    """«retiro y entrega en Maipú» / «retiro en Puente Alto · entrega en Maipú»."""
    if not isinstance(detail, dict):
        return ""
    p = detail.get("pickup") if isinstance(detail.get("pickup"), dict) else None
    d = detail.get("delivery") if isinstance(detail.get("delivery"), dict) else None
    pc, dc = (p or {}).get("commune"), (d or {}).get("commune")
    if pc and dc and norm(pc) == norm(dc):
        return f"retiro y entrega en {dc}"
    parts = [f"retiro en {pc}"] if pc else []
    if dc:
        parts.append(f"entrega en {dc}")
    return " · ".join(parts)


def detail_label(detail: Any) -> str:
    """«Traslado (retiro y entrega en Maipú)» para comprobantes."""
    places = places_text(detail)
    return f"Traslado ({places})" if places else "Traslado"

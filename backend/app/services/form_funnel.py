"""Embudo del FORMULARIO OFICIAL del crematorio (hasta dónde llega cada familia y qué toca).

Solo se mide el formulario que el crematorio eligió como oficial en Configuración →
«Enlaces oficiales» (`sys_tenants.official_links.form`: 'main' o el id de un formulario
personalizado). Sin formulario oficial no se registra nada.

Cada visita tiene un id de sesión anónimo (navegador, sin IP ni datos personales; se
renueva al enviar). Tabla `web_form_events` (migración a5b7c9d1e246, RLS): una fila por
sesión + formulario + evento + detalle (ON CONFLICT DO NOTHING → la primera vez; su hora
mide el tiempo entre pasos). Eventos:
  open · step_view:<paso> · field_error:<campo> · back:<paso> · size_select ·
  service_select · photo_add · welcome_video · souvenir_click · whatsapp_click ·
  submit_click · submit_error · submitted
"""
from __future__ import annotations

import logging
import re
from statistics import median

from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.utils import tz

logger = logging.getLogger(__name__)

SESSION_RE = re.compile(r"^[A-Za-z0-9_-]{8,40}$")
DETAIL_RE = re.compile(r"^[A-Za-z0-9_.-]{0,60}$")
STEPS = ("familia", "angel", "camino", "recuerdos", "resumen")
STEP_LABELS = {"familia": "Familia", "angel": "Ángel", "camino": "Camino", "recuerdos": "Recuerdos",
               "resumen": "Resumen", "submit_click": "Pulsó «Enviar»", "submitted": "Enviado"}
WITH_DETAIL = {"step_view": STEPS, "back": STEPS, "field_error": None}
KINDS = ("open", "step_view", "field_error", "back", "size_select", "service_select", "photo_add",
         "welcome_video", "souvenir_click", "whatsapp_click", "submit_click", "submit_error", "submitted")
CLICK_LABELS = {
    "size_select": "Eligió tamaño",
    "service_select": "Eligió plan o servicio",
    "photo_add": "Subió fotos",
    "welcome_video": "Vio el video de bienvenida",
    "back": "Volvió a un paso anterior",
    "submit_error": "Error al enviar",
    "souvenir_click": "Abrió la tiendita de recuerdos",
    "whatsapp_click": "Escribió por WhatsApp",
}
FIELD_LABELS = {
    "fullName": "Nombre del dueño", "phone": "Teléfono", "rut": "RUT", "email": "Correo",
    "contactPreference": "Preferencia de contacto", "address": "Dirección", "veterinary": "Lugar de retiro",
    "comments": "Comentarios", "name": "Nombre de la mascota", "type": "Especie", "nickname": "Apodo",
    "breed": "Raza", "birthDate": "Fecha de nacimiento", "deathDate": "Fecha de fallecimiento",
    "healthStatus": "Estado de salud", "weightRange": "Rango de peso", "weightKg": "Peso (kg)", "age": "Edad",
    "photos": "Fotos", "dedication": "Dedicatoria",
}
TOP_LIMIT = 10


# ===== Formulario oficial =====

def resolve_form_id(tenant, form: str | None) -> str:
    """Igual que el formulario público: `?form=` = id o nombre de un personalizado; si no, el principal."""
    if not form:
        return "main"
    from app.services.public_form_config import normalize_form_config

    wanted = str(form).strip().lower()
    for f in normalize_form_config(tenant.form_config).get("custom_forms", []) or []:
        if f.get("id") and (str(f["id"]).lower() == wanted or str(f.get("name") or "").strip().lower() == wanted):
            return str(f["id"])
    return "main"


def official_form_id(tenant) -> str | None:
    raw = tenant.official_links if isinstance(getattr(tenant, "official_links", None), dict) else {}
    form = raw.get("form")
    if not form:
        return None
    form = str(form)
    if form == "main":
        return form
    from app.services.official_links import form_options
    return form if any(o["id"] == form for o in form_options(tenant)) else None


def is_official(tenant, form: str | None) -> bool:
    off = official_form_id(tenant)
    return bool(off) and resolve_form_id(tenant, form) == off


def form_name(tenant, form_id: str | None) -> str:
    if not form_id:
        return "—"
    from app.services.official_links import form_options
    return next((o["name"] for o in form_options(tenant) if o["id"] == form_id), form_id)


# ===== Escritura =====

def clean_event(kind: str, detail: str | None) -> tuple[str, str] | None:
    if kind not in KINDS:
        return None
    detail = (detail or "").strip()[:60]
    allowed = WITH_DETAIL.get(kind, ())
    if kind in WITH_DETAIL:
        if not detail or not DETAIL_RE.match(detail) or (allowed is not None and detail not in allowed):
            return None
    else:
        detail = ""
    return kind, detail


def record(db: Session, tenant, form: str | None, session_id: str, kind: str, detail: str | None = None) -> bool:
    """Guarda el evento si el formulario es el oficial (una vez por sesión). Nunca rompe la petición."""
    if not (session_id and SESSION_RE.match(session_id)):
        return False
    ev = clean_event(kind, detail)
    if not ev or not is_official(tenant, form):
        return False
    try:
        db.execute(
            text("""
                INSERT INTO web_form_events (tenant_id, form_id, session_id, kind, detail, created_at)
                VALUES (:tid, :fid, :sid, :kind, :detail, :now)
                ON CONFLICT DO NOTHING
            """),
            {"tid": tenant.id, "fid": resolve_form_id(tenant, form), "sid": session_id,
             "kind": ev[0], "detail": ev[1], "now": tz.get_now()},
        )
        db.commit()
        return True
    except Exception as exc:  # las métricas nunca rompen el formulario
        db.rollback()
        logger.warning("No se pudo registrar evento del formulario: %s", exc)
        return False


# ===== Lectura (SuperAdmin) =====

def _sessions(rows) -> dict:
    """{(tenant, sesión): {"events": {(kind, detail): created_at}}}"""
    out: dict = {}
    for tid, fid, sid, kind, detail, at in rows:
        s = out.setdefault((tid, sid), {"form_id": fid, "events": {}})
        s["events"][(kind, detail or "")] = at
    return out


def _last_step(ev: dict) -> str:
    if ("submitted", "") in ev:
        return "submitted"
    if ("submit_click", "") in ev:
        return "submit_click"
    reached = [s for s in STEPS if ("step_view", s) in ev]
    return reached[-1] if reached else "open"


def _summary(sessions: list[dict]) -> dict:
    n_open = len(sessions)
    submitted = sum(1 for s in sessions if ("submitted", "") in s["events"])

    # Pasos (solo los que el formulario usa) + «Enviar» + «Enviado»
    keys = [("step_view", st) for st in STEPS] + [("submit_click", ""), ("submitted", "")]
    steps, prev_count, prev_key = [], n_open, ("open", "")
    for key in keys:
        hit = [s for s in sessions if key in s["events"]]
        if not hit and key[0] == "step_view":
            continue
        secs = [
            (s["events"][key] - s["events"][prev_key]).total_seconds()
            for s in hit if prev_key in s["events"] and s["events"][key] >= s["events"][prev_key]
        ]
        name = key[1] if key[0] == "step_view" else key[0]
        steps.append({
            "key": name, "label": STEP_LABELS.get(name, name), "sessions": len(hit),
            "pct": round(len(hit) * 100 / n_open, 1) if n_open else 0,
            "lost": max(prev_count - len(hit), 0),
            "median_seconds": round(median(secs)) if secs else None,
        })
        prev_count, prev_key = len(hit), key

    abandon: dict[str, int] = {}
    for s in sessions:
        last = _last_step(s["events"])
        if last != "submitted":
            abandon[last] = abandon.get(last, 0) + 1
    order = ["open", *STEPS, "submit_click"]
    abandon_list = [
        {"key": k, "label": "Solo abrió" if k == "open" else STEP_LABELS.get(k, k), "sessions": n}
        for k, n in sorted(abandon.items(), key=lambda kv: (-kv[1], order.index(kv[0]) if kv[0] in order else 99))
    ]

    errors: dict[str, int] = {}
    clicks: dict[str, int] = {}
    for s in sessions:
        seen_back = False
        for kind, detail in s["events"]:
            if kind == "field_error":
                errors[detail] = errors.get(detail, 0) + 1
            elif kind == "back":
                if not seen_back:
                    clicks["back"] = clicks.get("back", 0) + 1
                    seen_back = True
            elif kind in CLICK_LABELS:
                clicks[kind] = clicks.get(kind, 0) + 1
    return {
        "sessions": n_open,
        "submitted": submitted,
        "conversion": round(submitted * 100 / n_open, 1) if n_open else 0,
        "steps": steps,
        "abandon": abandon_list,
        "field_errors": [
            {"field": f, "label": FIELD_LABELS.get(f, f), "sessions": n}
            for f, n in sorted(errors.items(), key=lambda kv: -kv[1])[:TOP_LIMIT]
        ],
        "clicks": [
            {"kind": k, "label": CLICK_LABELS[k], "sessions": clicks.get(k, 0),
             "pct": round(clicks.get(k, 0) * 100 / n_open, 1) if n_open else 0}
            for k in CLICK_LABELS
        ],
    }


def report(db: Session, date_from, date_to, tenant_id: int | None) -> dict:
    """Embudo del formulario oficial. Una sesión entra al periodo por su evento `open`."""
    params: dict = {}
    where = ["o.kind = 'open'"]
    if date_from:
        where.append("o.created_at >= :df")
        params["df"] = date_from
    if date_to:
        where.append("o.created_at < :dt")
        params["dt"] = date_to
    if tenant_id:
        where.append("o.tenant_id = :tid")
        params["tid"] = tenant_id
    rows = db.execute(text(f"""
        SELECT e.tenant_id, e.form_id, e.session_id, e.kind, e.detail, e.created_at
          FROM web_form_events e
          JOIN web_form_events o
            ON o.tenant_id = e.tenant_id AND o.form_id = e.form_id AND o.session_id = e.session_id
         WHERE {' AND '.join(where)}
    """), params).all()
    by_session = _sessions(rows)
    all_sessions = list(by_session.values())

    per_tenant: dict[int, list] = {}
    for (tid, _sid), s in by_session.items():
        per_tenant.setdefault(tid, []).append(s)
    tenants = {t.id: t for t in db.query(models.Tenant).filter(models.Tenant.id.in_(list(per_tenant))).all()} if per_tenant else {}

    by_tenant = []
    for tid, sess in per_tenant.items():
        summ = _summary(sess)
        t = tenants.get(tid)
        forms = {s["form_id"] for s in sess}
        by_tenant.append({
            "tenant_id": tid,
            "tenant_name": t.name if t else f"#{tid}",
            "form_name": ", ".join(form_name(t, f) for f in sorted(forms)) if t else ", ".join(sorted(forms)),
            "sessions": summ["sessions"], "submitted": summ["submitted"], "conversion": summ["conversion"],
            "main_abandon": summ["abandon"][0]["label"] if summ["abandon"] else None,
        })
    by_tenant.sort(key=lambda r: -r["sessions"])

    # Crematorios sin formulario oficial (no se mide nada)
    without = []
    if not tenant_id:
        for t in db.query(models.Tenant).filter(models.Tenant.status == models.TenantStatus.active).all():
            if not official_form_id(t):
                without.append({"tenant_id": t.id, "tenant_name": t.name})
    else:
        t = db.get(models.Tenant, tenant_id)
        if t and not official_form_id(t):
            without.append({"tenant_id": t.id, "tenant_name": t.name})

    return {**_summary(all_sessions), "by_tenant": by_tenant, "without_official": without}

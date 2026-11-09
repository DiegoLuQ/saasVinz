"""Embudo del FORMULARIO OFICIAL del crematorio (hasta dónde llega cada familia y qué toca).

Solo se mide el formulario que el crematorio eligió como oficial en Configuración →
«Enlaces oficiales» (`sys_tenants.official_links.form`: 'main' o el id de un formulario
personalizado). Sin formulario oficial no se registra nada.

Cada visita tiene un id de sesión anónimo (navegador, sin IP ni datos personales; se
renueva al enviar). Tabla `web_form_events` (migración a5b7c9d1e246, RLS): una fila por
sesión + formulario + evento + detalle (ON CONFLICT DO NOTHING → la primera vez; su hora
mide el tiempo entre pasos). Eventos:
  open · step_view:<paso> · field_error:<campo> · field_touch:<paso>.<campo> · back:<paso> · size_select ·
  service_select · photo_add ·
  welcome_shown · welcome_video_offer · welcome_video · welcome_close · end_video ·
  souvenir_click · card_download · whatsapp_click ·
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
WITH_DETAIL = {"step_view": STEPS, "back": STEPS, "field_error": None, "field_touch": None}
KINDS = ("open", "step_view", "field_error", "field_touch", "back", "size_select", "service_select", "photo_add",
         "welcome_shown", "welcome_video_offer", "welcome_video", "welcome_close", "end_video", "souvenir_click", "card_download", "whatsapp_click", "submit_click", "submit_error", "submitted")
CLICK_LABELS = {
    "size_select": "Eligió tamaño",
    "service_select": "Eligió plan o servicio",
    "photo_add": "Subió fotos",
    "welcome_video": "Vio el video de bienvenida",
    "back": "Volvió a un paso anterior",
    "submit_error": "Error al enviar",
    "souvenir_click": "Entró al catálogo de productos (tiendita de recuerdos)",
    "card_download": "Descargó la imagen conmemorativa",
    "whatsapp_click": "Escribió por WhatsApp",
}
FIELD_LABELS = {
    "fullName": "Nombre del dueño", "phone": "Teléfono", "rut": "RUT", "email": "Correo",
    "contactPreference": "Preferencia de contacto", "address": "Dirección", "veterinary": "Lugar de retiro",
    "comments": "Comentarios", "name": "Nombre de la mascota", "type": "Especie", "nickname": "Apodo",
    "breed": "Raza", "birthDate": "Fecha de nacimiento", "deathDate": "Fecha de fallecimiento",
    "healthStatus": "Estado de salud", "weightRange": "Rango de peso", "weightKg": "Peso (kg)", "age": "Edad",
    "photos": "Fotos", "dedication": "Dedicatoria", "weight": "Peso / tamaño", "services": "Plan o servicio",
    "photoConsent": "Autorización de fotos",
}
TOP_LIMIT = 10

# Fase a la que pertenece cada campo (para ubicar los errores de validación)
FIELD_STEP = {
    **{f: "familia" for f in ("fullName", "phone", "rut", "email", "contactPreference", "address", "veterinary", "comments")},
    **{f: "angel" for f in ("name", "type", "nickname", "breed", "birthDate", "deathDate", "healthStatus",
                            "weightRange", "weightKg", "weight", "age")},
    "services": "camino",
    **{f: "recuerdos" for f in ("photos", "dedication", "photoConsent")},
}
# Acciones que se muestran dentro de cada fase
PHASE_ACTIONS = {
    "angel": [("size_select", "Eligió tamaño")],
    "camino": [("service_select", "Eligió plan o servicio")],
    "recuerdos": [("photo_add", "Subió fotos")],
    "resumen": [("submit_click", "Pulsó «Enviar»"), ("submit_error", "Error al enviar")],
    "enviado": [("card_download", "Descargó la imagen conmemorativa"),
                ("souvenir_click", "Entró al catálogo de productos (tiendita)"),
                ("whatsapp_click", "Escribió por WhatsApp"),
                ("end_video", "Vio el video final")],
}


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
        if kind == "field_touch":  # «<paso>.<campo>»
            step, _, field = detail.partition(".")
            if step not in STEPS or not field or "." in field:
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


def _count(sessions: list[dict], key: tuple[str, str]) -> int:
    return sum(1 for s in sessions if key in s["events"])


def _phases(sessions: list[dict], abandon: dict[str, int], last_fields: dict[str, dict[str, int]]) -> list[dict]:
    """Recorrido fase por fase: Inicio (bienvenida/video) → pasos del formulario → Enviado.
    En cada una: cuántos llegan, qué tocan, campos que llenan, errores y cuántos se quedaron ahí."""
    n = len(sessions)
    pct = lambda v, base=n: round(v * 100 / base, 1) if base else 0  # noqa: E731
    out = []

    # Inicio: abrió el formulario, mensaje de bienvenida y video
    shown = _count(sessions, ("welcome_shown", ""))
    offered = [s for s in sessions if ("welcome_video_offer", "") in s["events"]]
    watched = sum(1 for s in offered if ("welcome_video", "") in s["events"])
    acts = [{"key": "welcome_shown", "label": "Vio el mensaje de bienvenida", "sessions": shown, "pct": pct(shown)}]
    if offered:
        acts += [
            {"key": "welcome_video", "label": "Vio el video", "sessions": watched, "pct": pct(watched, len(offered))},
            {"key": "welcome_skip", "label": "Saltó el video", "sessions": len(offered) - watched,
             "pct": pct(len(offered) - watched, len(offered))},
        ]
    out.append({"key": "inicio", "label": "Inicio", "reached": n, "pct": 100.0 if n else 0,
                "lost_here": abandon.get("open", 0), "median_seconds": None, "actions": acts,
                "video_offered": len(offered), "fields": [], "errors": [], "last_fields": []})

    prev_key = ("open", "")
    for st in STEPS:
        key = ("step_view", st)
        hit = [s for s in sessions if key in s["events"]]
        if not hit:
            continue
        secs = [(s["events"][key] - s["events"][prev_key]).total_seconds()
                for s in hit if prev_key in s["events"] and s["events"][key] >= s["events"][prev_key]]
        touched: dict[str, int] = {}
        errs: dict[str, int] = {}
        for s in hit:
            for (k, d) in s["events"]:
                if k == "field_touch" and d.startswith(f"{st}."):
                    f = d.split(".", 1)[1]
                    touched[f] = touched.get(f, 0) + 1
                elif k == "field_error" and FIELD_STEP.get(d) == st:
                    errs[d] = errs.get(d, 0) + 1
        acts = [{"key": k, "label": lbl, "sessions": c, "pct": pct(c, len(hit))}
                for k, lbl in PHASE_ACTIONS.get(st, []) for c in [_count(hit, (k, ""))]]
        back = _count(hit, ("back", st))
        if back:
            acts.append({"key": "back", "label": "Volvió al paso anterior", "sessions": back, "pct": pct(back, len(hit))})
        lost = abandon.get(st, 0) + (abandon.get("submit_click", 0) if st == "resumen" else 0)
        lf = last_fields.get(st, {})
        out.append({
            "key": st, "label": STEP_LABELS[st], "reached": len(hit), "pct": pct(len(hit)),
            "lost_here": lost, "median_seconds": round(median(secs)) if secs else None,
            "actions": acts,
            "fields": [{"field": f, "label": FIELD_LABELS.get(f, f), "sessions": c, "pct": pct(c, len(hit))}
                       for f, c in sorted(touched.items(), key=lambda kv: -kv[1])],
            "errors": [{"field": f, "label": FIELD_LABELS.get(f, f), "sessions": c}
                       for f, c in sorted(errs.items(), key=lambda kv: -kv[1])],
            "last_fields": [{"field": f, "label": FIELD_LABELS.get(f, f) if f else "Sin tocar ningún campo", "sessions": c}
                            for f, c in sorted(lf.items(), key=lambda kv: (kv[0] == "", -kv[1]))],
            "stuck_on_submit": abandon.get("submit_click", 0) if st == "resumen" else 0,
        })
        prev_key = key

    sent = [s for s in sessions if ("submitted", "") in s["events"]]
    sent_secs = [(s["events"][("submitted", "")] - s["events"][prev_key]).total_seconds()
                 for s in sent if prev_key in s["events"] and s["events"][("submitted", "")] >= s["events"][prev_key]]
    out.append({
        "key": "enviado", "label": "Enviado", "reached": len(sent), "pct": pct(len(sent)), "lost_here": 0,
        "median_seconds": round(median(sent_secs)) if sent_secs else None,
        "actions": [{"key": k, "label": lbl, "sessions": c, "pct": pct(c, len(sent))}
                    for k, lbl in PHASE_ACTIONS["enviado"] for c in [_count(sent, (k, ""))]],
        "fields": [], "errors": [], "last_fields": [],
    })
    return out


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
    last_fields: dict[str, dict[str, int]] = {}
    for s in sessions:
        last = _last_step(s["events"])
        if last == "submitted":
            continue
        abandon[last] = abandon.get(last, 0) + 1
        if last in STEPS:
            # Último campo que tocó en esa fase (o «Sin tocar ningún campo»)
            touched = [(at, d.split(".", 1)[1]) for (k, d), at in s["events"].items()
                       if k == "field_touch" and d.startswith(f"{last}.")]
            field = max(touched)[1] if touched else ""
            last_fields.setdefault(last, {})[field] = last_fields.setdefault(last, {}).get(field, 0) + 1
    order = ["open", *STEPS, "submit_click"]
    abandon_list = [
        {"key": k, "label": "Solo abrió" if k == "open" else STEP_LABELS.get(k, k), "sessions": n,
         "fields": [
             {"field": f, "label": FIELD_LABELS.get(f, f) if f else "Sin tocar ningún campo", "sessions": c}
             for f, c in sorted(last_fields.get(k, {}).items(), key=lambda kv: (kv[0] == "", -kv[1]))
         ]}
        for k, n in sorted(abandon.items(), key=lambda kv: (-kv[1], order.index(kv[0]) if kv[0] in order else 99))
    ]

    phases = _phases(sessions, abandon, last_fields)

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
        "phases": phases,
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

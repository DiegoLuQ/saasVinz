"""Diagnóstico 360° para crematorios prospecto (Admin → Comercial → «Diagnóstico 360°»).
Especificación: docs/DIAGNOSTICO_360.md.

- Cada alternativa vale un % de cumplimiento; «No aplica» no cuenta.
- % de categoría = promedio de sus preguntas respondidas.
- % total = Σ (peso × % categoría) ÷ Σ (pesos de las categorías con respuesta), así
  10, 15 y 20 preguntas dan resultados comparables.
- Las respuestas se guardan con copia del texto y del %: editar el banco de preguntas
  no cambia los informes ya hechos.
"""
from __future__ import annotations

from copy import deepcopy

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app import models
from app.api.internal.creator.diagnostics.models import Diagnostic, DiagnosticCategory, DiagnosticQuestion

MODES = (10, 15, 20)
STATUSES = ("nuevo", "contactado", "demo", "cliente", "descartado")
NA = "na"

DEFAULT_CONFIG = {
    "levels": [
        {"min": 0, "name": "Inicial",
         "message": "Tu crematorio tiene importantes oportunidades de organización y profesionalización."},
        {"min": 40, "name": "En desarrollo",
         "message": "Ya tienes prácticas implementadas, pero hay áreas clave que fortalecer."},
        {"min": 60, "name": "Bien encaminado",
         "message": "Tienes una base sólida; optimizar procesos te hará destacar."},
        {"min": 80, "name": "Alto nivel",
         "message": "Tu crematorio está profesionalizado; el siguiente paso es escalar."},
    ],
    "recommend_below": 60,   # una respuesta bajo este % muestra su recomendación
    "min_applicable": 70,    # % mínimo de preguntas aplicables para no ser «diagnóstico parcial»
    "plan_rules": {"free_below": 40},  # el volumen mensual se compara con max_orders de cada plan
    "cta_url": "https://vinzer.cl/crear-cuenta",
    # Landing pública vinzer.cl/diagnostico
    "public_mode": 10,       # modalidad que responde el crematorio (corta = más la terminan)
    "promo_pct": 45,         # descuento que se ofrece en el informe (0 = sin promoción)
    "promo_text": "Por ser de los primeros crematorios en diagnosticarse",
}


# ===== Configuración =====

def get_config(db: Session) -> dict:
    cfg = deepcopy(DEFAULT_CONFIG)
    row = db.query(models.SaaSConfig).first()
    saved = (row.diagnostic_config if row else None) or {}
    for key in ("levels", "recommend_below", "min_applicable", "cta_url", "public_mode", "promo_pct", "promo_text"):
        if saved.get(key) not in (None, "", []):
            cfg[key] = saved[key]
    if isinstance(saved.get("plan_rules"), dict):
        cfg["plan_rules"].update({k: v for k, v in saved["plan_rules"].items() if v is not None})
    cfg["levels"] = sorted(cfg["levels"], key=lambda lv: lv["min"])
    return cfg


def save_config(db: Session, data: dict) -> dict:
    levels = data.get("levels") or []
    if levels:
        mins = sorted(int(lv.get("min", 0)) for lv in levels)
        if mins[0] != 0 or len(set(mins)) != len(mins) or mins[-1] > 100:
            raise HTTPException(400, "Los niveles deben empezar en 0 %, sin repetir el mínimo y hasta 100 %.")
        if any(not (lv.get("name") or "").strip() for lv in levels):
            raise HTTPException(400, "Cada nivel necesita un nombre.")
    row = db.query(models.SaaSConfig).first()
    if not row:
        raise HTTPException(404, "Falta la configuración del SaaS")
    clean = {
        "levels": [{"min": int(lv["min"]), "name": lv["name"].strip(), "message": (lv.get("message") or "").strip()}
                   for lv in levels] or None,
        "recommend_below": data.get("recommend_below"),
        "min_applicable": data.get("min_applicable"),
        "plan_rules": data.get("plan_rules"),
        "cta_url": (data.get("cta_url") or "").strip() or None,
        "public_mode": data.get("public_mode") if data.get("public_mode") in MODES else None,
        "promo_pct": data.get("promo_pct"),
        "promo_text": (data.get("promo_text") or "").strip() or None,
    }
    row.diagnostic_config = clean
    db.commit()
    return get_config(db)


# ===== Banco de preguntas =====

def categories(db: Session) -> list[DiagnosticCategory]:
    return db.query(DiagnosticCategory).order_by(DiagnosticCategory.sort_order, DiagnosticCategory.id).all()


def questions(db: Session, mode: int | None = None, only_active: bool = True) -> list[DiagnosticQuestion]:
    q = (
        db.query(DiagnosticQuestion)
        .options(selectinload(DiagnosticQuestion.category))
        .join(DiagnosticCategory)
        .order_by(DiagnosticCategory.sort_order, DiagnosticQuestion.sort_order, DiagnosticQuestion.id)
    )
    if only_active:
        q = q.filter(DiagnosticQuestion.is_active == True)  # noqa: E712
    rows = q.all()
    if mode:
        rows = [r for r in rows if mode in (r.modes or [])]
    return rows


def mode_counts(db: Session) -> dict[int, int]:
    rows = questions(db)
    return {m: sum(1 for r in rows if m in (r.modes or [])) for m in MODES}


def validate_question(data: dict) -> None:
    options = data.get("options") or []
    if len(options) < 2:
        raise HTTPException(400, "La pregunta necesita al menos 2 alternativas.")
    for o in options:
        if not (o.get("text") or "").strip():
            raise HTTPException(400, "Todas las alternativas necesitan texto.")
        if not 0 <= float(o.get("pct", -1)) <= 100:
            raise HTTPException(400, "El % de cada alternativa debe estar entre 0 y 100.")
    if any(m not in MODES for m in data.get("modes") or []):
        raise HTTPException(400, "Modalidades válidas: 10, 15 y 20.")


def save_category_weights(db: Session, items: list[dict]) -> list[DiagnosticCategory]:
    total = round(sum(float(i.get("weight") or 0) for i in items), 2)
    if abs(total - 100) > 0.01:
        raise HTTPException(400, f"Los pesos deben sumar 100 % (suman {total:g} %).")
    by_id = {c.id: c for c in categories(db)}
    for i in items:
        cat = by_id.get(i.get("id"))
        if not cat:
            raise HTTPException(404, "Categoría no encontrada")
        if not (i.get("name") or "").strip():
            raise HTTPException(400, "Cada categoría necesita un nombre.")
        cat.name = i["name"].strip()[:80]
        cat.weight = float(i["weight"])
        cat.vinzer_feature = (i.get("vinzer_feature") or "").strip() or None
    db.commit()
    return categories(db)


# ===== Cálculo =====

def _level(cfg: dict, total: float | None) -> dict | None:
    if total is None:
        return None
    current = cfg["levels"][0]
    for lv in cfg["levels"]:
        if total >= lv["min"]:
            current = lv
    return current


# Orden comercial de los planes (de menor a mayor) para comparar «lo que necesita» con «lo que le cabe».
PLAN_ORDER = ("free", "track", "normal", "pro", "ultra")


def _rank(name: str | None) -> int:
    n = (name or "").lower()
    return PLAN_ORDER.index(n) if n in PLAN_ORDER else -1


def paid_plans(db: Session) -> list[dict]:
    """Planes pagados activos por capacidad (órdenes al mes), sin repetir el mismo tope."""
    rows = (
        db.query(models.SubscriptionPlan)
        .filter(models.SubscriptionPlan.is_active == True, models.SubscriptionPlan.price > 0)  # noqa: E712
        .all()
    )
    out: list[dict] = []
    for p in sorted(rows, key=lambda r: (r.max_orders or 0, _rank(r.name), r.price or 0)):
        if not p.max_orders or (out and out[-1]["max_orders"] >= p.max_orders):
            continue
        out.append({"name": p.name, "max_orders": int(p.max_orders)})
    return out


def volume_ranges(plans: list[dict]) -> list[dict]:
    """Rangos de cremaciones al mes que calzan con el tope de órdenes de cada plan.
    `value` es lo que se guarda en monthly_cremations (el tope del rango; el último, tope anterior + 1)."""
    out, prev = [], 0
    for i, p in enumerate(plans):
        last = i == len(plans) - 1
        if last and prev:
            label, value = f"Más de {prev}", prev + 1
        elif not prev:
            label, value = f"Hasta {p['max_orders']}", p["max_orders"]
        else:
            label, value = f"{prev + 1} a {p['max_orders']}", p["max_orders"]
        out.append({"value": value, "label": label})
        prev = p["max_orders"]
    return out


def capacity_plan(plans: list[dict], monthly: int | None) -> dict | None:
    """Plan más chico cuyo tope de órdenes mensuales cubre el volumen del crematorio."""
    if not monthly or not plans:
        return None
    return next((p for p in plans if p["max_orders"] >= monthly), plans[-1])


def suggest_plan(cfg: dict, cat_pct: dict[str, float | None], monthly: int | None, total: float | None,
                 plans: list[dict] | None = None) -> dict:
    """Recomienda UN plan: el mayor entre lo que necesita según sus respuestas y lo que le cabe por volumen."""
    rules = cfg["plan_rules"]

    def low(key: str) -> bool:
        pct = cat_pct.get(key)
        return pct is not None and pct < cfg["recommend_below"]

    if low("C1") or low("C10"):
        plan, reason = "NORMAL", "Certificados con tu marca, configuración completa y veterinarias aliadas."
    elif low("C3") or low("C4"):
        plan, reason = "Track", "Ordenar la operación y dar seguimiento en línea a cada familia."
    else:
        plan, reason = "NORMAL", "Profesionalizar la atención, la marca y los certificados."
    needs = plan
    cap = capacity_plan(plans or [], monthly)
    by_volume = bool(cap and _rank(cap["name"]) > _rank(plan))
    if by_volume:
        plan = cap["name"]
        reason = (f"Por tu volumen de cremaciones necesitas capacidad para {cap['max_orders']} órdenes al mes. "
                  f"Incluye todo lo de {needs}: {reason[0].lower()}{reason[1:]}")
    return {
        "plan": plan, "reason": reason, "needs_plan": needs, "by_volume": by_volume,
        "start_free": not by_volume and total is not None and total < rules["free_below"],
    }


def compute(db: Session, mode: int, raw_answers: dict, monthly: int | None) -> dict:
    """Valida las respuestas de la modalidad y arma la copia + puntajes."""
    if mode not in MODES:
        raise HTTPException(400, "Modalidad inválida")
    cfg = get_config(db)
    qs = questions(db, mode)
    if not qs:
        raise HTTPException(400, "No hay preguntas activas para esta modalidad.")
    answers = {str(k): v for k, v in (raw_answers or {}).items()}

    snapshot, missing = [], []
    for q in qs:
        value = answers.get(str(q.id))
        options = q.options or []
        entry = {
            "question_id": q.id,
            "category_key": q.category.key,
            "category_name": q.category.name,
            "question": q.text,
            "help": q.help,
            "vinzer_feature": q.vinzer_feature,
            "na": False, "option_index": None, "answer": None, "pct": None, "recommendation": None,
        }
        if value == NA and q.allows_na:
            entry.update(na=True, answer="No aplica")
        elif isinstance(value, int) and not isinstance(value, bool) and 0 <= value < len(options):
            pct = float(options[value]["pct"])
            entry.update(option_index=value, answer=options[value]["text"], pct=pct)
            if pct < cfg["recommend_below"]:
                entry["recommendation"] = q.recommendation
        else:
            missing.append(q.text)
            continue
        snapshot.append(entry)
    if missing:
        raise HTTPException(400, f"Faltan {len(missing)} respuestas: {missing[0]}")

    scores, cat_pct = [], {}
    for cat in categories(db):
        items = [a for a in snapshot if a["category_key"] == cat.key]
        if not items:
            continue
        applicable = [a["pct"] for a in items if not a["na"]]
        pct = round(sum(applicable) / len(applicable), 1) if applicable else None
        cat_pct[cat.key] = pct
        scores.append({
            "key": cat.key, "name": cat.name, "weight": cat.weight, "pct": pct,
            "questions": len(items), "applicable": len(applicable), "vinzer_feature": cat.vinzer_feature,
        })

    weighted = [(s["weight"], s["pct"]) for s in scores if s["pct"] is not None and s["weight"] > 0]
    total = round(sum(w * p for w, p in weighted) / sum(w for w, _ in weighted), 1) if weighted else None
    applicable_n = sum(1 for a in snapshot if not a["na"])
    level = _level(cfg, total)
    return {
        "answers": snapshot,
        "category_scores": scores,
        "total_pct": total,
        "level": level["name"] if level else None,
        "is_partial": applicable_n * 100 < cfg["min_applicable"] * len(snapshot),
        "suggested_plan": suggest_plan(cfg, cat_pct, monthly, total, paid_plans(db)),
    }


# ===== Prospectos =====

def link_tenant(db: Session, diag: Diagnostic) -> None:
    """Si el correo ya es de un crematorio registrado (o de uno de sus usuarios), lo vincula."""
    email = (diag.email or "").strip().lower()
    if not email:
        return
    tenant = db.query(models.Tenant).filter(func.lower(models.Tenant.email) == email).first()
    if tenant:
        diag.linked_tenant_id = tenant.id
        return
    user = (
        db.query(models.User)
        .filter(func.lower(models.User.email) == email, models.User.role != models.UserRole.creator)
        .first()
    )
    if user and user.tenant_id:
        diag.linked_tenant_id = user.tenant_id


def plan_prices(db: Session) -> dict[str, dict]:
    """Precio actual de cada plan (por nombre, sin distinguir mayúsculas) para el informe."""
    out = {}
    for p in db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.is_active == True).all():  # noqa: E712
        out[(p.name or "").lower()] = {
            "name": p.name,
            "price": float(p.price or 0),
            "annual_price": float(p.annual_price) if getattr(p, "annual_price", None) else None,
        }
    return out


def summary(db: Session) -> dict:
    rows = db.query(Diagnostic).all()
    by_level: dict[str, int] = {}
    by_status = {s: 0 for s in STATUSES}
    cat_acc: dict[str, dict] = {}
    totals = []
    for d in rows:
        if d.level:
            by_level[d.level] = by_level.get(d.level, 0) + 1
        by_status[d.status] = by_status.get(d.status, 0) + 1
        if d.total_pct is not None:
            totals.append(d.total_pct)
        for s in d.category_scores or []:
            if s.get("pct") is None:
                continue
            acc = cat_acc.setdefault(s["key"], {"key": s["key"], "name": s["name"], "sum": 0.0, "n": 0})
            acc["sum"] += s["pct"]
            acc["n"] += 1
    order = {c.key: i for i, c in enumerate(categories(db))}
    cats = sorted(
        ({"key": a["key"], "name": a["name"], "avg": round(a["sum"] / a["n"], 1), "count": a["n"]} for a in cat_acc.values()),
        key=lambda c: order.get(c["key"], 99),
    )
    cfg = get_config(db)
    return {
        "count": len(rows),
        "avg_total": round(sum(totals) / len(totals), 1) if totals else None,
        "by_level": [{"name": lv["name"], "count": by_level.get(lv["name"], 0)} for lv in cfg["levels"]],
        "by_status": by_status,
        "categories": cats,
        "registered": sum(1 for d in rows if d.linked_tenant_id),
        "from_web": sum(1 for d in rows if d.source == "web"),
        "incomplete": sum(1 for d in rows if not d.completed_at),
    }


# ===== Informe (admin y página pública) =====

def report_url(token: str) -> str:
    from app.core.config import settings
    return f"{settings.FRONTEND_URL.rstrip('/')}/diagnostico/informe/{token}"


def report(db: Session, d: Diagnostic) -> dict:
    """Informe completo, sin datos comerciales internos (notas, estado)."""
    cfg = get_config(db)
    level = next((lv for lv in cfg["levels"] if lv["name"] == d.level), None)
    plan_name = (d.suggested_plan or {}).get("plan")
    saas = db.query(models.SaaSConfig).first()
    return {
        "business_name": d.business_name, "contact_name": d.contact_name, "city": d.city, "region": d.region,
        "mode": d.mode, "created_at": d.created_at, "completed_at": d.completed_at,
        "total_pct": d.total_pct, "level": d.level, "is_partial": d.is_partial,
        "level_message": level["message"] if level else None,
        "answers": d.answers or [], "category_scores": d.category_scores or [],
        "suggested_plan": d.suggested_plan,
        "plan_price": plan_prices(db).get((plan_name or "").lower()),
        "cta_url": cfg["cta_url"],
        "promo_pct": cfg["promo_pct"] or 0,
        "promo_text": cfg["promo_text"],
        "sales_whatsapp": (saas.whatsapp if saas else None) or None,
    }

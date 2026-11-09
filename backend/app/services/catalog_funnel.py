"""Embudo del catálogo de planes (enlaces compartidos desde Gestión de Servicios).

Cada visitante del catálogo tiene un id de sesión anónimo (aleatorio, guardado
en su navegador; sin IP ni datos personales). El catálogo y el formulario
registran en inv_catalog_events una fila por sesión + evento + plan + tamaño
(índice único), así recargar la página no infla los números:

    view → size_select → plan_request («Solicitar este plan») / whatsapp
         → form_open → formulario enviado → orden → orden entregada

Los formularios enviados se cuentan desde web_form_submissions.catalog_token_id
(no son eventos) y su avance se sigue por la mascota creada al procesarlos.
Las métricas existen desde que se implementó (migración f2a4c6e8b135); el
contador histórico inv_catalog_tokens.views_count se conserva aparte.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta

from sqlalchemy import and_, distinct, func, text
from sqlalchemy.orm import Session, joinedload

from app import models
from app.api.internal.catalog.models import CatalogEvent, CatalogShareToken, Plan
from app.api.internal.memorials import models as mem_models
from app.utils import tz

logger = logging.getLogger(__name__)

KINDS = ("view", "size_select", "plan_request", "whatsapp", "form_open")
SESSION_RE = re.compile(r"^[A-Za-z0-9_-]{8,40}$")
DELIVERED = "entregado"
TOP_LIMIT = 10

_link_views_table_ready = False


def _ensure_link_views_table(db: Session) -> None:
    """Crea de forma idempotente la tabla ligera de aperturas de links públicos (memorial y tracking)."""
    global _link_views_table_ready
    if _link_views_table_ready:
        return
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS sys_public_link_views (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL,
                kind VARCHAR(20) NOT NULL,
                resource_key VARCHAR(64) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_public_link_views_tenant_kind_date
            ON sys_public_link_views (tenant_id, kind, created_at)
        """))
        db.commit()
        _link_views_table_ready = True
    except Exception as exc:
        db.rollback()
        logger.warning("No se pudo inicializar sys_public_link_views: %s", exc)


def record_link_view(db: Session, tenant_id: int | None, kind: str, resource_key: str) -> None:
    """Registra un ingreso al link público de un memorial ('memorial') o de seguimiento ('tracking')."""
    if not tenant_id or kind not in ("memorial", "tracking"):
        return
    try:
        _ensure_link_views_table(db)
        db.execute(
            text("""
                INSERT INTO sys_public_link_views (tenant_id, kind, resource_key, created_at)
                VALUES (:tid, :kind, :rkey, :now)
            """),
            {
                "tid": int(tenant_id),
                "kind": kind,
                "rkey": str(resource_key or "")[:64],
                "now": tz.get_now(),
            },
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("No se pudo registrar vista de %s: %s", kind, exc)


def _tenant_has_memorials(tenant: models.Tenant | None, memorials_total: int = 0) -> bool:
    """Determina si el crematorio tiene habilitado el módulo de Memoriales (PRO/ULTRA o ya tiene memoriales)."""
    if memorials_total > 0:
        return True
    if not tenant:
        return False
    plan = getattr(tenant, "effective_plan", None) or getattr(tenant, "subscription_plan", None)
    plan_name = ((plan.name if plan else None) or getattr(tenant, "plan", None) or "FREE").upper()
    features = plan.features if plan and isinstance(plan.features, dict) else {}
    if "mascotas:memorial" in features and not features.get("mascotas:memorial"):
        return False
    return "PRO" in plan_name or "ULTRA" in plan_name


def valid_session(session_id: str | None) -> bool:
    return bool(session_id and SESSION_RE.match(session_id))


def record_event(
    db: Session,
    token: CatalogShareToken,
    kind: str,
    session_id: str,
    plan_id: int | None = None,
    weight_tier: str | None = None,
) -> None:
    """Guarda el evento una sola vez por sesión (ON CONFLICT DO NOTHING)."""
    tier = (weight_tier or "").strip()[:40] or None
    db.execute(
        text("""
            INSERT INTO inv_catalog_events (tenant_id, catalog_token_id, kind, plan_id, weight_tier, session_id, created_at)
            VALUES (:tenant_id, :token_id, :kind, :plan_id, :tier, :sid, :now)
            ON CONFLICT DO NOTHING
        """),
        {
            "tenant_id": token.tenant_id,
            "token_id": token.id,
            "kind": kind,
            "plan_id": plan_id,
            "tier": tier,
            "sid": session_id,
            "now": tz.get_now(),
        },
    )
    db.commit()


# ===== Lectura =====

def _event_counts(db: Session, filters: list, group_by=None) -> dict:
    """Sesiones distintas por evento (y por la columna de agrupación, si hay)."""
    cols = [CatalogEvent.kind, func.count(distinct(CatalogEvent.session_id))]
    if group_by is not None:
        cols.insert(0, group_by)
    q = db.query(*cols).filter(*filters)
    q = q.group_by(group_by, CatalogEvent.kind) if group_by is not None else q.group_by(CatalogEvent.kind)
    out: dict = {}
    for row in q.all():
        if group_by is not None:
            key, kind, n = row
            out.setdefault(key, {})[kind] = n
        else:
            kind, n = row
            out[kind] = n
    return out


def _submission_counts(db: Session, filters: list, group_by=None, catalog_only: bool = True) -> dict:
    """Formularios enviados y cuántos llegaron a orden / entrega. Por defecto solo los que vienen
    de un catálogo; con `catalog_only=False`, todos los formularios web (enlace directo, QR,
    formularios personalizados), para comparar cuánto aporta el catálogo."""
    sub = models.FormSubmission
    oc = models.CremationOC
    has_order = (
        db.query(oc.id)
        .filter(oc.pet_id == sub.pet_id, oc.created_at >= sub.created_at - timedelta(days=1))
        .exists()
    )
    delivered = (
        db.query(oc.id)
        .filter(oc.pet_id == sub.pet_id, oc.created_at >= sub.created_at - timedelta(days=1), oc.status == DELIVERED)
        .exists()
    )
    cols = [
        func.count(sub.id),
        func.count(sub.id).filter(sub.status == "pending"),
        func.count(sub.id).filter(and_(sub.pet_id.isnot(None), has_order)),
        func.count(sub.id).filter(and_(sub.pet_id.isnot(None), delivered)),
    ]
    if group_by is not None:
        cols.insert(0, group_by)
    q = db.query(*cols).filter(*filters)
    if catalog_only:
        q = q.filter(sub.catalog_token_id.isnot(None))
    if group_by is not None:
        q = q.group_by(group_by)
    out: dict = {}
    for row in q.all():
        if group_by is not None:
            key, *vals = row
        else:
            key, vals = None, list(row)
        out[key] = dict(zip(("form_submit", "pending", "order", "delivered"), vals))
    return out if group_by is not None else out.get(None, {})


def _normalize_species(raw: str | None) -> str:
    val = (raw or "").strip()
    if not val:
        return "Sin especificar"
    low = val.lower()
    mapping = {
        "canino": "Canino",
        "perro": "Canino",
        "felino": "Felino",
        "gato": "Felino",
        "ave": "Ave",
        "mamífero pequeño": "Mamífero pequeño",
        "mamifero pequeño": "Mamífero pequeño",
        "mamifero pequeno": "Mamífero pequeño",
        "reptil / anfibio": "Reptil / Anfibio",
        "exótico": "Exótico",
        "exotico": "Exótico",
        "roedor": "Roedor",
        "otro": "Otro",
    }
    if low in mapping:
        return mapping[low]
    return val[:1].upper() + val[1:].lower()


def _species_breakdown(db: Session, sub_f: list) -> list[dict]:
    """Desglose por especie de los formularios enviados (desde catálogo y totales) y sus órdenes."""
    sub = models.FormSubmission
    pe = models.Pet
    oc = models.CremationOC
    has_order = (
        db.query(oc.id)
        .filter(oc.pet_id == sub.pet_id, oc.created_at >= sub.created_at - timedelta(days=1))
        .exists()
    )
    rows = (
        db.query(
            pe.species,
            sub.pet_data,
            sub.catalog_token_id.isnot(None),
            and_(sub.pet_id.isnot(None), has_order),
        )
        .outerjoin(pe, pe.id == sub.pet_id)
        .filter(*sub_f, func.coalesce(sub.status, "") != "deleted")
        .all()
    )
    agg: dict[str, dict] = {}
    for pet_species, pet_data, is_catalog, is_order in rows:
        raw = pet_species
        if not raw and isinstance(pet_data, dict):
            raw = pet_data.get("type") or pet_data.get("species")
        label = _normalize_species(str(raw) if raw is not None else None)
        slot = agg.setdefault(label, {"species": label, "catalog": 0, "forms_all": 0, "orders": 0})
        slot["forms_all"] += 1
        if is_catalog:
            slot["catalog"] += 1
        if is_order:
            slot["orders"] += 1

    return sorted(
        agg.values(),
        key=lambda r: (-r["catalog"], -r["forms_all"], -r["orders"], r["species"]),
    )


def _link_views_summary(
    db: Session,
    date_from: datetime | None,
    date_to: datetime | None,
    tenant_id: int | None,
) -> tuple[dict[int, dict], dict[int, dict]]:
    """Devuelve (views_period_by_tenant, views_total_by_tenant) para memorial y tracking."""
    _ensure_link_views_table(db)
    where_total = ["1=1"]
    params_total: dict = {}
    if tenant_id:
        where_total.append("tenant_id = :tid")
        params_total["tid"] = int(tenant_id)

    where_period = list(where_total)
    params_period = dict(params_total)
    if date_from:
        where_period.append("created_at >= :df")
        params_period["df"] = date_from
    if date_to:
        where_period.append("created_at < :dt")
        params_period["dt"] = date_to

    period_by_tenant: dict[int, dict] = {}
    total_by_tenant: dict[int, dict] = {}
    try:
        rows_period = db.execute(
            text(f"""
                SELECT tenant_id, kind, COUNT(*) AS views, COUNT(DISTINCT resource_key) AS resources
                FROM sys_public_link_views
                WHERE {' AND '.join(where_period)}
                GROUP BY tenant_id, kind
            """),
            params_period,
        ).all()
        for tid, kind, views, resources in rows_period:
            slot = period_by_tenant.setdefault(int(tid), {})
            slot[f"{kind}_views"] = int(views or 0)
            slot[f"{kind}_resources"] = int(resources or 0)

        rows_total = db.execute(
            text(f"""
                SELECT tenant_id, kind, COUNT(*) AS views
                FROM sys_public_link_views
                WHERE {' AND '.join(where_total)}
                GROUP BY tenant_id, kind
            """),
            params_total,
        ).all()
        for tid, kind, views in rows_total:
            slot = total_by_tenant.setdefault(int(tid), {})
            slot[f"{kind}_views_total"] = int(views or 0)
    except Exception as exc:
        logger.warning("Error consultando sys_public_link_views: %s", exc)

    return period_by_tenant, total_by_tenant


def link_stats(db: Session, token_ids: list[int]) -> dict[int, dict]:
    """Resumen por enlace para la lista del tenant (RLS ya fijado)."""
    if not token_ids:
        return {}
    events = _event_counts(db, [CatalogEvent.catalog_token_id.in_(token_ids)], CatalogEvent.catalog_token_id)
    subs = _submission_counts(
        db, [models.FormSubmission.catalog_token_id.in_(token_ids)], models.FormSubmission.catalog_token_id
    )
    result = {}
    for tid in token_ids:
        ev = events.get(tid, {})
        sb = subs.get(tid, {})
        result[tid] = {
            "visitors": ev.get("view", 0),
            "plan_requests": ev.get("plan_request", 0),
            "whatsapp_clicks": ev.get("whatsapp", 0),
            "forms_submitted": sb.get("form_submit", 0),
            "orders": sb.get("order", 0),
            "delivered": sb.get("delivered", 0),
        }
    return result


def _all_forms(sb: dict) -> dict:
    """Todos los formularios web (con o sin catálogo) y sus órdenes."""
    return {
        "forms_all": sb.get("form_submit", 0),
        "orders_all": sb.get("order", 0),
        "delivered_all": sb.get("delivered", 0),
    }


def _funnel(ev: dict, sb: dict) -> dict:
    return {
        "visitors": ev.get("view", 0),
        "size_select": ev.get("size_select", 0),
        "plan_request": ev.get("plan_request", 0),
        "whatsapp": ev.get("whatsapp", 0),
        "form_open": ev.get("form_open", 0),
        "form_submit": sb.get("form_submit", 0),
        "pending": sb.get("pending", 0),
        "order": sb.get("order", 0),
        "delivered": sb.get("delivered", 0),
    }


def report(db: Session, date_from: datetime | None, date_to: datetime | None, tenant_id: int | None) -> dict:
    """KPIs del catálogo de planes para el SuperAdmin (RLS en bypass)."""
    ev_f, sub_f, tok_f = [], [], [CatalogShareToken.catalog_type == "plans"]
    mem_total_f, mem_period_f = [], []
    if date_from:
        ev_f.append(CatalogEvent.created_at >= date_from)
        sub_f.append(models.FormSubmission.created_at >= date_from)
        mem_period_f.append(mem_models.Memorial.fecha >= date_from)
    if date_to:
        ev_f.append(CatalogEvent.created_at < date_to)
        sub_f.append(models.FormSubmission.created_at < date_to)
        mem_period_f.append(mem_models.Memorial.fecha < date_to)
    if tenant_id:
        ev_f.append(CatalogEvent.tenant_id == tenant_id)
        sub_f.append(models.FormSubmission.tenant_id == tenant_id)
        tok_f.append(CatalogShareToken.tenant_id == tenant_id)
        mem_total_f.append(mem_models.Memorial.id_tenant == tenant_id)
        mem_period_f.append(mem_models.Memorial.id_tenant == tenant_id)

    totals = _funnel(_event_counts(db, ev_f), _submission_counts(db, sub_f))
    totals.update(_all_forms(_submission_counts(db, sub_f, catalog_only=False)))

    # Por crematorio: enlaces creados (en el periodo y en total) + embudo + memoriales + tracking
    tenants = {
        t.id: t
        for t in db.query(models.Tenant).options(joinedload(models.Tenant.subscription_plan)).all()
    }
    links_total = dict(
        db.query(CatalogShareToken.tenant_id, func.count(CatalogShareToken.id))
        .filter(*tok_f).group_by(CatalogShareToken.tenant_id).all()
    )
    period_f = list(tok_f)
    if date_from:
        period_f.append(CatalogShareToken.created_at >= date_from)
    if date_to:
        period_f.append(CatalogShareToken.created_at < date_to)
    links_period = dict(
        db.query(CatalogShareToken.tenant_id, func.count(CatalogShareToken.id))
        .filter(*period_f).group_by(CatalogShareToken.tenant_id).all()
    )
    legacy_views = dict(
        db.query(CatalogShareToken.tenant_id, func.coalesce(func.sum(CatalogShareToken.views_count), 0))
        .filter(*tok_f).group_by(CatalogShareToken.tenant_id).all()
    )

    # Memoriales por crematorio (total y en el periodo)
    mem_total_by_tenant = dict(
        db.query(mem_models.Memorial.id_tenant, func.count(mem_models.Memorial.id))
        .filter(*mem_total_f).group_by(mem_models.Memorial.id_tenant).all()
    )
    mem_period_by_tenant = dict(
        db.query(mem_models.Memorial.id_tenant, func.count(mem_models.Memorial.id))
        .filter(*mem_period_f).group_by(mem_models.Memorial.id_tenant).all()
    )

    # Aperturas de links públicos (Memoriales y Tracking)
    lv_period, lv_total = _link_views_summary(db, date_from, date_to, tenant_id)

    ev_by_tenant = _event_counts(db, ev_f, CatalogEvent.tenant_id)
    sub_by_tenant = _submission_counts(db, sub_f, models.FormSubmission.tenant_id)
    all_by_tenant = _submission_counts(db, sub_f, models.FormSubmission.tenant_id, catalog_only=False)

    all_tids = (
        set(links_total)
        | set(ev_by_tenant)
        | set(sub_by_tenant)
        | set(all_by_tenant)
        | set(mem_total_by_tenant)
        | set(lv_period)
    )
    if tenant_id and tenant_id in tenants:
        all_tids.add(tenant_id)

    by_tenant = []
    for tid in all_tids:
        t = tenants.get(tid)
        m_tot = int(mem_total_by_tenant.get(tid, 0) or 0)
        m_per = int(mem_period_by_tenant.get(tid, 0) or 0)
        lv_p = lv_period.get(tid, {})
        lv_t = lv_total.get(tid, {})
        has_mem = _tenant_has_memorials(t, m_tot)

        row = _funnel(ev_by_tenant.get(tid, {}), sub_by_tenant.get(tid, {}))
        row.update(_all_forms(all_by_tenant.get(tid, {})))
        row.update(
            tenant_id=tid,
            tenant_name=t.name if t else f"#{tid}",
            tenant_slug=t.slug if t else None,
            links_total=links_total.get(tid, 0),
            links_period=links_period.get(tid, 0),
            views_total=int(legacy_views.get(tid, 0) or 0),
            has_memorials=has_mem,
            memorials_total=m_tot,
            memorials_period=m_per,
            memorial_views=int(lv_p.get("memorial_views", 0)),
            memorial_views_total=int(lv_t.get("memorial_views_total", 0)),
            tracking_views=int(lv_p.get("tracking_views", 0)),
            tracking_views_total=int(lv_t.get("tracking_views_total", 0)),
            tracking_orders_viewed=int(lv_p.get("tracking_resources", 0)),
        )
        by_tenant.append(row)
    by_tenant.sort(key=lambda r: (r["visitors"], r["forms_all"], r["links_total"]), reverse=True)

    # Planes más pedidos: SOLO planes activos (is_active == True, excluyendo eliminados e inactivos)
    ask_f = ev_f + [CatalogEvent.kind.in_(("plan_request", "whatsapp")), CatalogEvent.plan_id.isnot(None)]
    plan_rows = (
        db.query(CatalogEvent.plan_id, CatalogEvent.kind, func.count(distinct(CatalogEvent.session_id)))
        .filter(*ask_f).group_by(CatalogEvent.plan_id, CatalogEvent.kind).all()
    )
    per_plan: dict[int, dict] = {}
    for pid, kind, n in plan_rows:
        per_plan.setdefault(pid, {"plan_request": 0, "whatsapp": 0})[kind] = n

    if tenant_id:
        active_plans_q = db.query(Plan).filter(Plan.tenant_id == tenant_id, Plan.is_active.is_(True)).all()
        plans = {p.id: p for p in active_plans_q}
        plan_ids_to_show = list(plans.keys())
    else:
        plans = {
            p.id: p
            for p in db.query(Plan).filter(
                Plan.id.in_(list(per_plan) or [0]),
                Plan.is_active.is_(True),
            ).all()
        }
        plan_ids_to_show = [pid for pid in per_plan if pid in plans]

    top_plans = sorted(
        (
            {
                "plan_id": pid,
                "plan_name": plans[pid].name,
                "tenant_name": tenants[plans[pid].tenant_id].name if plans[pid].tenant_id in tenants else None,
                "price": float(plans[pid].price or 0),
                "plan_request": per_plan.get(pid, {}).get("plan_request", 0),
                "whatsapp": per_plan.get(pid, {}).get("whatsapp", 0),
                "total": per_plan.get(pid, {}).get("plan_request", 0) + per_plan.get(pid, {}).get("whatsapp", 0),
            }
            for pid in plan_ids_to_show
        ),
        key=lambda r: (r["total"], r["plan_request"]),
        reverse=True,
    )[:TOP_LIMIT]

    # Cada crematorio define sus propios rangos: el ranking es por crematorio + tamaño
    n_sessions = func.count(distinct(CatalogEvent.session_id))
    size_rows = (
        db.query(CatalogEvent.tenant_id, CatalogEvent.weight_tier, n_sessions)
        .filter(*ev_f, CatalogEvent.kind.in_(("plan_request", "whatsapp")), CatalogEvent.weight_tier.isnot(None))
        .group_by(CatalogEvent.tenant_id, CatalogEvent.weight_tier)
        .order_by(n_sessions.desc())
        .limit(TOP_LIMIT).all()
    )
    top_sizes = [
        {
            "weight_tier": w, "count": n, "tenant_id": tid,
            "tenant_name": tenants[tid].name if tid in tenants else f"#{tid}",
        }
        for tid, w, n in size_rows
    ]

    # Métrica por especie (formularios desde catálogo, totales y órdenes generadas)
    by_species = _species_breakdown(db, sub_f)

    selected_tenant = tenants.get(tenant_id) if tenant_id else None
    memorials_total_sum = sum(mem_total_by_tenant.values())
    memorials_period_sum = sum(mem_period_by_tenant.values())
    has_memorials_scope = (
        _tenant_has_memorials(selected_tenant, memorials_total_sum)
        if tenant_id
        else True
    )
    memorial_views_period = sum(v.get("memorial_views", 0) for v in lv_period.values())
    memorial_views_total = sum(v.get("memorial_views_total", 0) for v in lv_total.values())
    tracking_views_period = sum(v.get("tracking_views", 0) for v in lv_period.values())
    tracking_views_total = sum(v.get("tracking_views_total", 0) for v in lv_total.values())
    tracking_orders_viewed = sum(v.get("tracking_resources", 0) for v in lv_period.values())

    return {
        "totals": totals,
        "links_total": sum(links_total.values()),
        "links_period": sum(links_period.values()),
        "has_memorials": has_memorials_scope,
        "memorials_total": memorials_total_sum,
        "memorials_period": memorials_period_sum,
        "memorial_views": memorial_views_period,
        "memorial_views_total": memorial_views_total,
        "tracking_views": tracking_views_period,
        "tracking_views_total": tracking_views_total,
        "tracking_orders_viewed": tracking_orders_viewed,
        "by_tenant": by_tenant,
        "top_plans": top_plans,
        "top_sizes": top_sizes,
        "by_species": by_species,
        "tenants": sorted(
            ({"id": t.id, "name": t.name} for t in tenants.values()), key=lambda r: r["name"] or ""
        ),
    }

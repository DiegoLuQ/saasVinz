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

import re
from datetime import datetime, timedelta

from sqlalchemy import and_, distinct, func, text
from sqlalchemy.orm import Session

from app import models
from app.api.internal.catalog.models import CatalogEvent, CatalogShareToken, Plan
from app.utils import tz

KINDS = ("view", "size_select", "plan_request", "whatsapp", "form_open")
SESSION_RE = re.compile(r"^[A-Za-z0-9_-]{8,40}$")
DELIVERED = "entregado"
TOP_LIMIT = 10


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
    if date_from:
        ev_f.append(CatalogEvent.created_at >= date_from)
        sub_f.append(models.FormSubmission.created_at >= date_from)
    if date_to:
        ev_f.append(CatalogEvent.created_at < date_to)
        sub_f.append(models.FormSubmission.created_at < date_to)
    if tenant_id:
        ev_f.append(CatalogEvent.tenant_id == tenant_id)
        sub_f.append(models.FormSubmission.tenant_id == tenant_id)
        tok_f.append(CatalogShareToken.tenant_id == tenant_id)

    totals = _funnel(_event_counts(db, ev_f), _submission_counts(db, sub_f))
    totals.update(_all_forms(_submission_counts(db, sub_f, catalog_only=False)))

    # Por crematorio: enlaces creados (en el periodo y en total) + embudo
    tenants = {t.id: t for t in db.query(models.Tenant).all()}
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
    ev_by_tenant = _event_counts(db, ev_f, CatalogEvent.tenant_id)
    sub_by_tenant = _submission_counts(db, sub_f, models.FormSubmission.tenant_id)
    all_by_tenant = _submission_counts(db, sub_f, models.FormSubmission.tenant_id, catalog_only=False)

    by_tenant = []
    for tid in set(links_total) | set(ev_by_tenant) | set(sub_by_tenant) | set(all_by_tenant):
        t = tenants.get(tid)
        row = _funnel(ev_by_tenant.get(tid, {}), sub_by_tenant.get(tid, {}))
        row.update(_all_forms(all_by_tenant.get(tid, {})))
        row.update(
            tenant_id=tid,
            tenant_name=t.name if t else f"#{tid}",
            tenant_slug=t.slug if t else None,
            links_total=links_total.get(tid, 0),
            links_period=links_period.get(tid, 0),
            views_total=int(legacy_views.get(tid, 0) or 0),
        )
        by_tenant.append(row)
    by_tenant.sort(key=lambda r: (r["visitors"], r["forms_all"], r["links_total"]), reverse=True)

    # Planes y tamaños más pedidos («Solicitar este plan» + WhatsApp, sesiones distintas)
    ask_f = ev_f + [CatalogEvent.kind.in_(("plan_request", "whatsapp")), CatalogEvent.plan_id.isnot(None)]
    plan_rows = (
        db.query(CatalogEvent.plan_id, CatalogEvent.kind, func.count(distinct(CatalogEvent.session_id)))
        .filter(*ask_f).group_by(CatalogEvent.plan_id, CatalogEvent.kind).all()
    )
    per_plan: dict[int, dict] = {}
    for pid, kind, n in plan_rows:
        per_plan.setdefault(pid, {"plan_request": 0, "whatsapp": 0})[kind] = n
    plans = {
        p.id: p for p in db.query(Plan).filter(Plan.id.in_(list(per_plan) or [0])).all()
    }
    top_plans = sorted(
        (
            {
                "plan_id": pid,
                "plan_name": plans[pid].name if pid in plans else "Plan eliminado",
                "tenant_name": tenants[plans[pid].tenant_id].name if pid in plans and plans[pid].tenant_id in tenants else None,
                "price": float(plans[pid].price or 0) if pid in plans else None,
                **counts,
                "total": counts["plan_request"] + counts["whatsapp"],
            }
            for pid, counts in per_plan.items()
        ),
        key=lambda r: r["total"], reverse=True,
    )[:TOP_LIMIT]

    # Cada crematorio define sus propios rangos: el ranking es por crematorio + tamaño
    # (con «Todos» se muestra a qué crematorio pertenece cada rango; nunca se suman entre sí).
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

    return {
        "totals": totals,
        "links_total": sum(links_total.values()),
        "links_period": sum(links_period.values()),
        "by_tenant": by_tenant,
        "top_plans": top_plans,
        "top_sizes": top_sizes,
        "tenants": sorted(
            ({"id": t.id, "name": t.name} for t in tenants.values()), key=lambda r: r["name"] or ""
        ),
    }

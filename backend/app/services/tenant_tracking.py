"""Detalle de métricas de UN crematorio (SuperAdmin → KPIs del catálogo → clic en el crematorio).

Junta lo que se mide de sus enlaces públicos: enlaces oficiales, enlaces de catálogo
(con su embudo histórico), aperturas del seguimiento y de los memoriales por día,
qué seguimientos / memoriales se abren más (la vista guarda la huella SHA-256 del
token/uuid: se compara con la huella de los de este crematorio), avisos enviados a
las familias y la encuesta. El embudo del catálogo y del formulario oficial se leen
de sus propios endpoints con `tenant_id`.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app import models
from app.api.internal.catalog.models import CatalogShareToken
from app.api.internal.operations.models import FamilyNotice, ServiceFeedback
from app.utils import tz

TOP = 15


def _period(col: str, date_from, date_to, params: dict) -> str:
    sql = ""
    if date_from:
        sql += f" AND {col} >= :df"
        params["df"] = date_from
    if date_to:
        sql += f" AND {col} < :dt"
        params["dt"] = date_to
    return sql


def _safe(db: Session, sql: str, params: dict) -> list:
    """Lee dentro de un savepoint: si la tabla de vistas falla, el resto del detalle sigue."""
    try:
        with db.begin_nested():
            return db.execute(text(sql), params).all()
    except Exception:
        return []


def detail(db: Session, tenant_id: int, date_from: datetime | None, date_to: datetime | None,
           stage: str = "in_progress") -> dict | None:
    from app.services import catalog_funnel, official_links
    from app.services.form_funnel import form_name, official_form_id
    from app.services.family_notices import tracking_url

    tenant = db.get(models.Tenant, tenant_id)
    if not tenant:
        return None
    plan = getattr(tenant, "effective_plan", None) or getattr(tenant, "subscription_plan", None)

    # --- Enlaces oficiales y enlaces de catálogo ---
    official = official_links.status(db, tenant)
    off_form = official_form_id(tenant)
    links = (db.query(CatalogShareToken).filter(CatalogShareToken.tenant_id == tenant_id)
             .order_by(CatalogShareToken.created_at.desc()).all())
    stats = catalog_funnel.link_stats(db, [l.id for l in links if l.catalog_type == "plans"])
    now = tz.get_now()
    off_ids = {(official.get("plans") or {}).get("id"), (official.get("products") or {}).get("id")}
    link_rows = [{
        "id": l.id, "name": l.name or ("Catálogo de planes" if l.catalog_type == "plans" else "Catálogo de productos"),
        "type": l.catalog_type or "products",
        "official": l.id in off_ids,
        "active": bool(l.is_active) and not (l.expires_at and now > l.expires_at),
        "created_at": l.created_at, "expires_at": l.expires_at,
        "views_count": l.views_count or 0, "last_viewed_at": l.last_viewed_at,
        **(stats.get(l.id) or {}),
    } for l in links]

    # --- Aperturas por día (seguimiento y memorial) ---
    p: dict = {"tid": tenant_id}
    where = _period("created_at", date_from, date_to, p)
    st_sql, st_params = catalog_funnel.stage_filter(stage)
    st_v, _ = catalog_funnel.stage_filter(stage, "v")
    p.update(st_params)
    where += st_sql
    daily: dict[str, dict] = {}
    for day, kind, n in _safe(db, f"""
        SELECT to_char(created_at AT TIME ZONE :tzn, 'YYYY-MM-DD') AS d, kind, count(*)
          FROM sys_public_link_views WHERE tenant_id = :tid {where}
         GROUP BY 1, 2 ORDER BY 1
    """, {**p, "tzn": "America/Santiago"}):
        daily.setdefault(day, {"date": day, "tracking": 0, "memorial": 0})[kind] = int(n)

    totals = {k: 0 for k in ("tracking", "memorial")}
    distinct = {k: 0 for k in ("tracking", "memorial")}
    for kind, n, d in _safe(db, f"""
        SELECT kind, count(*), count(DISTINCT resource_key) FROM sys_public_link_views
         WHERE tenant_id = :tid {where} GROUP BY kind
    """, dict(p)):
        totals[kind], distinct[kind] = int(n), int(d)

    # --- Últimos 15 seguimientos abiertos, el más reciente primero (huella del tracking_token) ---
    # Además del estado al abrir, la orden debe estar HOY en ese estado: con «En proceso»
    # no aparecen órdenes ya entregadas (antes salían porque se abrieron mientras corrían).
    from app.api.internal.operations.operations.board import CANCELED_STATUSES, FINAL_STATUSES
    p_orders = dict(p)
    cur = ""
    if stage in ("in_progress", "delivered"):
        p_orders["finals"] = tuple(x.lower() for x in FINAL_STATUSES)
        p_orders["canceled"] = tuple(x.lower() for x in CANCELED_STATUSES)
        cur = (" AND lower(coalesce(oc.status, '')) IN :finals" if stage == "delivered"
               else " AND lower(coalesce(oc.status, '')) NOT IN :finals AND lower(coalesce(oc.status, '')) NOT IN :canceled")
    orders = []
    for oc_id, code, num, status, pet, views, last in _safe(db, f"""
        SELECT oc.id, oc.verification_code, oc.oc_number, oc.status, pe.name, count(v.id), max(v.created_at)
          FROM sys_public_link_views v
          JOIN oc_details d ON d.tenant_id = v.tenant_id
               AND encode(sha256(convert_to(d.tracking_token, 'UTF8')), 'hex') = v.resource_key
          JOIN oc_cremations oc ON oc.id = d.cremation_id
          LEFT JOIN crm_pets pe ON pe.id = oc.pet_id
         WHERE v.tenant_id = :tid AND v.kind = 'tracking' {_period('v.created_at', date_from, date_to, p_orders)}{st_v}{cur}
         GROUP BY oc.id, oc.verification_code, oc.oc_number, oc.status, pe.name
         ORDER BY max(v.created_at) DESC LIMIT {TOP}
    """, p_orders):
        oc = db.get(models.CremationOC, oc_id)
        orders.append({"id": oc_id, "code": code, "oc_number": num, "status": status, "pet_name": pet,
                       "views": int(views), "last_view": last, "url": tracking_url(tenant, oc) if oc else None})

    memorials = []
    for mid, uuid_, short, pet, views, last in _safe(db, f"""
        SELECT r.id, r.id_recuerdo::text, r.short_code, pe.name, count(v.id), max(v.created_at)
          FROM sys_public_link_views v
          JOIN rec_recuerdos r ON r.id_tenant = v.tenant_id
               AND encode(sha256(convert_to(r.id_recuerdo::text, 'UTF8')), 'hex') = v.resource_key
          LEFT JOIN crm_pets pe ON pe.id = r.id_mascota
         WHERE v.tenant_id = :tid AND v.kind = 'memorial' {_period('v.created_at', date_from, date_to, p)}
         GROUP BY r.id, r.id_recuerdo, r.short_code, pe.name
         ORDER BY count(v.id) DESC, max(v.created_at) DESC LIMIT {TOP}
    """, dict(p)):
        memorials.append({"id": mid, "uuid": uuid_, "short_code": short, "pet_name": pet,
                          "views": int(views), "last_view": last})

    # --- Órdenes del periodo: cuántas tuvieron su seguimiento abierto ---
    oq = db.query(func.count(models.CremationOC.id)).filter(models.CremationOC.tenant_id == tenant_id)
    if date_from:
        oq = oq.filter(models.CremationOC.created_at >= date_from)
    if date_to:
        oq = oq.filter(models.CremationOC.created_at < date_to)
    orders_period = oq.scalar() or 0
    pv: dict = {"tid": tenant_id, **st_params}
    opened = _safe(db, f"""
        SELECT count(DISTINCT oc.id) FROM oc_cremations oc
          JOIN oc_details d ON d.cremation_id = oc.id
         WHERE oc.tenant_id = :tid {_period('oc.created_at', date_from, date_to, pv)}
           AND EXISTS (SELECT 1 FROM sys_public_link_views v WHERE v.tenant_id = oc.tenant_id AND v.kind = 'tracking'
                       AND v.resource_key = encode(sha256(convert_to(d.tracking_token, 'UTF8')), 'hex'){st_v})
    """, pv)
    orders_opened = int(opened[0][0]) if opened else 0

    # --- Avisos a la familia y encuesta ---
    nq = db.query(FamilyNotice.channel, FamilyNotice.kind, func.count(FamilyNotice.id)).filter(
        FamilyNotice.tenant_id == tenant_id, FamilyNotice.status == "sent")
    fq = db.query(func.count(ServiceFeedback.id), func.avg(ServiceFeedback.rating)).filter(ServiceFeedback.tenant_id == tenant_id)
    if date_from:
        nq = nq.filter(FamilyNotice.created_at >= date_from)
        fq = fq.filter(ServiceFeedback.created_at >= date_from)
    if date_to:
        nq = nq.filter(FamilyNotice.created_at < date_to)
        fq = fq.filter(ServiceFeedback.created_at < date_to)
    notices = {"email": 0, "whatsapp": 0, "finish": 0}
    for channel, kind, n in nq.group_by(FamilyNotice.channel, FamilyNotice.kind).all():
        notices[channel] = notices.get(channel, 0) + int(n)
        if kind == "finish":
            notices["finish"] += int(n)
    fb_n, fb_avg = fq.one()

    return {
        "tenant": {
            "id": tenant.id, "name": tenant.name, "slug": tenant.slug,
            "status": getattr(tenant.status, "value", tenant.status),
            "plan": (plan.name if plan else None) or getattr(tenant, "plan", None),
            "created_at": tenant.created_at,
        },
        "official": {
            "form": form_name(tenant, off_form) if off_form else None,
            "plans": official.get("plans"), "products": official.get("products"),
            "complete": official.get("complete"), "missing": official.get("missing_labels"),
        },
        "links": link_rows,
        "views": {
            "tracking": totals["tracking"], "tracking_distinct": distinct["tracking"],
            "memorial": totals["memorial"], "memorial_distinct": distinct["memorial"],
            "daily": list(daily.values()),
        },
        "tracking_stage": stage if stage in ("in_progress", "delivered") else "all",
        "orders_period": orders_period,
        "orders_opened": orders_opened,
        "top_orders": orders,
        "top_memorials": memorials,
        "notices": notices,
        "feedback": {"count": int(fb_n or 0), "avg": round(float(fb_avg), 1) if fb_avg else None},
    }

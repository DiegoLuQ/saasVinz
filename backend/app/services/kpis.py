"""Indicadores (KPIs) del crematorio: /dashboard/indicadores.

Periodo = año completo o un mes, en la zona horaria del crematorio. Órdenes = solo
las ENTREGADAS (status entregado), por fecha de entrega (oc_scheduling.completed_at, o
created_at si falta); ingresos = oc_financial.total_price.
Rankings por plan, servicio, producto (+ compras externas del catálogo), ciudad,
especie, convenio y veterinaria; memoriales creados y formularios recibidos
(con su conversión a orden). La serie mensual es siempre del año elegido.
"""
from __future__ import annotations

from datetime import datetime

import pytz
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.utils.time import get_tenant_timezone_str

LIMIT = 50
FULL_LIMIT = 1000  # productos / servicios: lista completa (pestaña propia)


def _window(tz_name: str, year: int, month: int | None) -> tuple[datetime, datetime]:
    zone = pytz.timezone(tz_name)
    if month:
        start = datetime(year, month, 1)
        end = datetime(year + (month == 12), 1 if month == 12 else month + 1, 1)
    else:
        start, end = datetime(year, 1, 1), datetime(year + 1, 1, 1)
    return zone.localize(start).astimezone(pytz.utc), zone.localize(end).astimezone(pytz.utc)


# Solo órdenes entregadas; `created_at` aquí = fecha de entrega (la usan los rankings y la serie).
ORDERS = """
    SELECT c.id, c.pet_id, c.partner_link_id, coalesce(sch.completed_at, c.created_at) AS created_at
    FROM oc_cremations c
    LEFT JOIN oc_scheduling sch ON sch.cremation_id = c.id
    WHERE c.tenant_id = :tid AND lower(coalesce(c.status, '')) = 'entregado'
      AND coalesce(sch.completed_at, c.created_at) >= :s AND coalesce(sch.completed_at, c.created_at) < :e
"""


def _rank(rows: list[dict], limit: int = LIMIT) -> list[dict]:
    out = [{"label": r["label"], "count": int(r["count"] or 0), "revenue": float(r.get("revenue") or 0),
            **({"extra": float(r["extra"] or 0)} if "extra" in r else {})} for r in rows]
    out.sort(key=lambda r: (-r["count"], -r["revenue"], r["label"]))
    return out[:limit]


def compute(db: Session, tenant_id: int, year: int, month: int | None) -> dict:
    tz_name = get_tenant_timezone_str(db, tenant_id)
    s, e = _window(tz_name, year, month)
    ys, ye = _window(tz_name, year, None)
    p = {"tid": tenant_id, "s": s, "e": e, "tz": tz_name}

    def q(sql: str, params: dict | None = None) -> list[dict]:
        return [dict(r._mapping) for r in db.execute(text(sql), params or p)]

    totals = q(f"""
        WITH o AS ({ORDERS})
        SELECT count(*) AS orders, coalesce(sum(f.total_price), 0) AS revenue
        FROM o LEFT JOIN oc_financial f ON f.cremation_id = o.id
    """)[0]

    by_plan = q(f"""
        WITH o AS ({ORDERS})
        SELECT coalesce(sp.name, 'Plan eliminado') AS label, count(DISTINCT o.id) AS count,
               coalesce(sum(pl.precio_venta * coalesce(pl.cantidad, 1)), 0) AS revenue
        FROM o JOIN oc_plans pl ON pl.cremation_id = o.id
        LEFT JOIN srv_plans sp ON sp.id = pl.plan_id
        GROUP BY 1
    """)
    by_service = q(f"""
        WITH o AS ({ORDERS})
        SELECT coalesce(ss.name, 'Servicio eliminado') AS label, count(DISTINCT o.id) AS count,
               coalesce(sum(sv.precio_venta * coalesce(sv.cantidad, 1)), 0) AS revenue
        FROM o JOIN oc_services sv ON sv.cremation_id = o.id
        LEFT JOIN srv_services ss ON ss.id = sv.service_id
        GROUP BY 1
    """)
    by_product = q(f"""
        WITH o AS ({ORDERS})
        SELECT coalesce(ip.name, 'Producto eliminado') AS label, ip.id AS pid,
               coalesce(sum(pr.cantidad), 0) AS count,
               coalesce(sum(pr.precio_venta * coalesce(pr.cantidad, 1)), 0) AS revenue
        FROM o JOIN oc_products pr ON pr.cremation_id = o.id
        LEFT JOIN inv_products ip ON ip.id = pr.product_id
        GROUP BY 1, 2
    """)
    # Compras externas del catálogo (aceptadas o entregadas, por fecha de aceptación)
    external = q("""
        SELECT items FROM inv_product_requests
        WHERE tenant_id = :tid AND kind = 'external' AND status IN ('accepted', 'delivered')
          AND coalesce(decided_at, created_at) >= :s AND coalesce(decided_at, created_at) < :e
    """)
    prod_map: dict = {(r["pid"], r["label"]): {"label": r["label"], "count": int(r["count"]), "revenue": float(r["revenue"])}
                      for r in by_product}
    external_units = external_revenue = 0
    for row in external:
        for it in row["items"] or []:
            if it.get("state") not in (None, "added"):
                continue
            try:
                qty, price = int(it.get("qty") or 0), float(it.get("price") or 0)
                key = next((k for k in prod_map if k[0] == int(it.get("product_id"))), (int(it.get("product_id")), it.get("name") or "Producto"))
            except (TypeError, ValueError):
                continue
            slot = prod_map.setdefault(key, {"label": key[1], "count": 0, "revenue": 0.0})
            slot["count"] += qty
            slot["revenue"] += qty * price
            external_units += qty
            external_revenue += qty * price

    by_city = q(f"""
        WITH o AS ({ORDERS})
        SELECT coalesce(nullif(initcap(trim(cu.city)), ''), 'Sin ciudad') AS label, count(*) AS count,
               coalesce(sum(f.total_price), 0) AS revenue
        FROM o LEFT JOIN crm_pets pe ON pe.id = o.pet_id
        LEFT JOIN crm_customers cu ON cu.id = pe.customer_id
        LEFT JOIN oc_financial f ON f.cremation_id = o.id
        GROUP BY 1
    """)
    by_species = q(f"""
        WITH o AS ({ORDERS})
        SELECT coalesce(nullif(initcap(trim(pe.species)), ''), 'Sin especie') AS label, count(*) AS count,
               coalesce(sum(f.total_price), 0) AS revenue
        FROM o LEFT JOIN crm_pets pe ON pe.id = o.pet_id
        LEFT JOIN oc_financial f ON f.cremation_id = o.id
        GROUP BY 1
    """)
    by_agreement = q(f"""
        WITH o AS ({ORDERS})
        SELECT f.agreement_name AS label, count(*) AS count, coalesce(sum(f.total_price), 0) AS revenue,
               coalesce(sum(f.agreement_discount), 0) AS extra
        FROM o JOIN oc_financial f ON f.cremation_id = o.id
        WHERE f.agreement_name IS NOT NULL AND f.agreement_name <> ''
        GROUP BY 1
    """)
    by_vet = q(f"""
        WITH o AS ({ORDERS})
        SELECT coalesce(v.name, 'Veterinaria') AS label, count(*) AS count, coalesce(sum(f.total_price), 0) AS revenue,
               coalesce(sum(f.commission), 0) AS extra
        FROM o JOIN ptn_partner_links pl ON pl.id = o.partner_link_id
        LEFT JOIN sys_veterinaries v ON v.id = pl.veterinary_id
        LEFT JOIN oc_financial f ON f.cremation_id = o.id
        GROUP BY 1
    """)

    memorials = q("""
        SELECT count(*) AS n FROM rec_recuerdos WHERE id_tenant = :tid AND fecha >= :s AND fecha < :e
    """)[0]["n"]
    forms = q("""
        SELECT count(*) AS n,
               count(*) FILTER (WHERE status = 'processed' OR pet_id IS NOT NULL) AS processed
        FROM web_form_submissions
        WHERE tenant_id = :tid AND created_at >= :s AND created_at < :e AND coalesce(status, '') <> 'deleted'
    """)[0]

    # Serie mensual del año (independiente del filtro de mes)
    yp = {**p, "s": ys, "e": ye}
    series = {m: {"month": m, "orders": 0, "revenue": 0.0, "forms": 0, "memorials": 0} for m in range(1, 13)}
    for r in q(f"""
        WITH o AS ({ORDERS})
        SELECT extract(month FROM o.created_at AT TIME ZONE :tz)::int AS m, count(*) AS n,
               coalesce(sum(f.total_price), 0) AS revenue
        FROM o LEFT JOIN oc_financial f ON f.cremation_id = o.id GROUP BY 1
    """, yp):
        series[r["m"]].update(orders=int(r["n"]), revenue=float(r["revenue"]))
    for r in q("""
        SELECT extract(month FROM created_at AT TIME ZONE :tz)::int AS m, count(*) AS n FROM web_form_submissions
        WHERE tenant_id = :tid AND created_at >= :s AND created_at < :e AND coalesce(status, '') <> 'deleted' GROUP BY 1
    """, yp):
        series[r["m"]]["forms"] = int(r["n"])
    for r in q("""
        SELECT extract(month FROM fecha AT TIME ZONE :tz)::int AS m, count(*) AS n FROM rec_recuerdos
        WHERE id_tenant = :tid AND fecha >= :s AND fecha < :e GROUP BY 1
    """, yp):
        series[r["m"]]["memorials"] = int(r["n"])

    orders = int(totals["orders"] or 0)
    revenue = float(totals["revenue"] or 0)
    forms_n = int(forms["n"] or 0)
    return {
        "year": year, "month": month, "timezone": tz_name,
        "totals": {
            "orders": orders, "revenue": revenue,
            "avg_ticket": round(revenue / orders) if orders else 0,
            "forms": forms_n, "forms_processed": int(forms["processed"] or 0),
            "form_conversion": round(100 * int(forms["processed"] or 0) / forms_n, 1) if forms_n else None,
            "memorials": int(memorials or 0),
            "external_product_units": external_units, "external_product_revenue": external_revenue,
        },
        "by_plan": _rank(by_plan),
        "by_service": _rank(by_service, FULL_LIMIT),
        "by_product": _rank(list(prod_map.values()), FULL_LIMIT),
        "by_city": _rank(by_city),
        "by_species": _rank(by_species),
        "by_agreement": _rank(by_agreement),
        "by_veterinary": _rank(by_vet),
        "monthly": [series[m] for m in range(1, 13)],
    }


def available_years(db: Session, tenant_id: int, tz_name: str) -> list[int]:
    rows = db.execute(text("""
        SELECT DISTINCT extract(year FROM created_at AT TIME ZONE :tz)::int AS y
        FROM oc_cremations WHERE tenant_id = :tid AND created_at IS NOT NULL ORDER BY 1 DESC
    """), {"tid": tenant_id, "tz": tz_name}).all()
    years = [int(r[0]) for r in rows]
    now = datetime.now(pytz.timezone(tz_name)).year
    if now not in years:
        years.insert(0, now)
    return sorted(set(years), reverse=True)

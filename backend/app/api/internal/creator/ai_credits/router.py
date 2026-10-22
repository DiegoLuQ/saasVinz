"""
SuperAdmin: créditos IA (regalar/ajustar, historial, reporte de gasto y configuración).

El reporte cruza el costo real de cada generación (sys_ai_generations.cost_usd)
con el valor de los créditos consumidos (consumos del ledger × precio actual
del crédito) para ver el margen.
"""
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_creator
from app.core.tenant_context import apply_bypass_rls
from app.database import get_db
from app.services import ai_credits
from app.utils import tz

router = APIRouter()


def _db(db: Session = Depends(get_db), _creator=Depends(get_current_creator)) -> Session:
    # Lectura y escritura cruzando todos los tenants (tablas con RLS).
    apply_bypass_rls(db)
    return db


class CreditSettings(BaseModel):
    # Valor de referencia: valoriza los créditos en el reporte y es el precio de
    # los planes sin precio propio de crédito extra.
    credit_price_usd: float = Field(..., ge=0, le=1000)
    attempts_per_credit: int = Field(..., ge=1, le=20)
    session_days: int = Field(..., ge=1, le=90)
    # CLP por 1 USD (fijo): los precios se muestran y cobran en CLP y USD.
    usd_clp_rate: int = Field(..., ge=1, le=100_000)


class PlanCredits(BaseModel):
    ai_monthly_credits: Optional[int] = Field(None, ge=0, le=1000)
    ai_extra_credit_price_usd: Optional[float] = Field(None, ge=0, le=1000)


class GrantRequest(BaseModel):
    amount: int = Field(..., ge=-1000, le=1000)
    reason: Literal["gift", "purchase", "adjust"] = "gift"
    note: Optional[str] = Field(None, max_length=300)


def _period_bounds(period: str):
    try:
        start = datetime.strptime(period, "%Y-%m").replace(tzinfo=tz.CHILE_TZ)
    except ValueError:
        raise HTTPException(status_code=400, detail="Periodo inválido (formato AAAA-MM)")
    end = start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)
    return start, end


# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

@router.get("/settings", response_model=CreditSettings)
def get_settings(db: Session = Depends(_db)):
    price, attempts, days = ai_credits._config(db)
    cfg = db.query(models.SaaSConfig).first()
    return CreditSettings(credit_price_usd=price, attempts_per_credit=attempts, session_days=days,
                          usd_clp_rate=(cfg.usd_clp_rate if cfg else None) or ai_credits.DEFAULT_USD_CLP_RATE)


@router.put("/settings", response_model=CreditSettings)
def update_settings(payload: CreditSettings, db: Session = Depends(_db)):
    cfg = db.query(models.SaaSConfig).first()
    if cfg is None:
        raise HTTPException(status_code=404, detail="Configuración global no inicializada")
    cfg.ai_credit_price_usd = payload.credit_price_usd
    cfg.ai_attempts_per_credit = payload.attempts_per_credit
    cfg.ai_session_days = payload.session_days
    cfg.usd_clp_rate = payload.usd_clp_rate
    db.commit()
    return payload


@router.get("/plans")
def list_plan_credits(db: Session = Depends(_db)):
    plans = db.query(models.SubscriptionPlan).order_by(models.SubscriptionPlan.display_order, models.SubscriptionPlan.id).all()
    return [{"id": p.id, "name": p.name, "is_active": p.is_active, "ai_monthly_credits": p.ai_monthly_credits or 0,
             "ai_extra_credit_price_usd": float(p.ai_extra_credit_price_usd) if p.ai_extra_credit_price_usd is not None else None}
            for p in plans]


@router.put("/plans/{plan_id}")
def update_plan_credits(plan_id: int, payload: PlanCredits, db: Session = Depends(_db)):
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == plan_id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    fields = payload.model_fields_set
    if "ai_monthly_credits" in fields and payload.ai_monthly_credits is not None:
        # Aplica desde el próximo mes (o la próxima asignación mensual del tenant).
        plan.ai_monthly_credits = payload.ai_monthly_credits
    if "ai_extra_credit_price_usd" in fields:
        # Aplica a las próximas solicitudes de compra (las pendientes conservan su precio).
        plan.ai_extra_credit_price_usd = (round(payload.ai_extra_credit_price_usd, 2)
                                          if payload.ai_extra_credit_price_usd is not None else None)
    db.commit()
    return {"id": plan.id, "name": plan.name, "ai_monthly_credits": plan.ai_monthly_credits,
            "ai_extra_credit_price_usd": float(plan.ai_extra_credit_price_usd) if plan.ai_extra_credit_price_usd is not None else None}


# ---------------------------------------------------------------------------
# Saldos y regalos
# ---------------------------------------------------------------------------

@router.get("/balances")
def list_balances(db: Session = Depends(_db)):
    """Saldo de cada crematorio. Si su bolsillo mensual es de un mes anterior se
    muestra lo que recibirá al usar IA este mes (sin escribir nada)."""
    period = ai_credits._period()
    start, end = _period_bounds(period)
    balances = {b.tenant_id: b for b in db.query(models.AiCreditBalance).all()}
    used = dict(
        db.query(models.AiDesignSession.tenant_id, func.count(models.AiDesignSession.id))
        .filter(models.AiDesignSession.created_at >= start, models.AiDesignSession.created_at < end)
        .group_by(models.AiDesignSession.tenant_id).all()
    )
    rows = []
    for t in db.query(models.Tenant).order_by(models.Tenant.name).all():
        plan = getattr(t, "effective_plan", None) or t.subscription_plan
        plan_credits = ai_credits.plan_monthly_credits(t)
        b = balances.get(t.id)
        current = b is not None and b.period == period
        monthly_remaining = b.monthly_remaining if current else plan_credits
        extra = b.extra_remaining if b else 0
        rows.append({
            "tenant_id": t.id,
            "tenant_name": t.name,
            "plan": plan.name if plan else None,
            "plan_monthly_credits": plan_credits,
            "monthly_remaining": monthly_remaining,
            "extra_remaining": extra,
            "available": monthly_remaining + extra,
            "designs_this_month": used.get(t.id, 0),
        })
    return {"period": period, "items": rows}


@router.post("/tenants/{tenant_id}/grant")
def grant_credits(tenant_id: int, payload: GrantRequest, db: Session = Depends(_db),
                  creator=Depends(get_current_creator)):
    """Regalo / venta manual (+) o ajuste (±) del bolsillo extra (no vence)."""
    if payload.amount == 0:
        raise HTTPException(status_code=400, detail="La cantidad no puede ser 0")
    if not (payload.note or "").strip():
        raise HTTPException(status_code=400, detail="Indica el motivo (queda en el historial)")
    if payload.reason in ("gift", "purchase") and payload.amount < 0:
        raise HTTPException(status_code=400, detail="Para quitar créditos usa el motivo 'ajuste'")
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Crematorio no encontrado")
    apply_bypass_rls(db)
    bal = ai_credits.grant_extra(db, tenant, payload.amount, reason=payload.reason,
                                 note=(payload.note or "").strip() or None, user_id=creator.id)
    return {"tenant_id": tenant_id, "monthly_remaining": bal.monthly_remaining,
            "extra_remaining": bal.extra_remaining, "available": bal.monthly_remaining + bal.extra_remaining}


# ---------------------------------------------------------------------------
# Historial
# ---------------------------------------------------------------------------

@router.get("/ledger")
def list_ledger(tenant_id: Optional[int] = None, reason: Optional[str] = None,
                page: int = 1, page_size: int = 50, db: Session = Depends(_db)):
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    q = db.query(models.AiCreditLedger)
    if tenant_id is not None:
        q = q.filter(models.AiCreditLedger.tenant_id == tenant_id)
    if reason:
        q = q.filter(models.AiCreditLedger.reason == reason)
    total = q.count()
    rows = (q.order_by(models.AiCreditLedger.created_at.desc(), models.AiCreditLedger.id.desc())
            .offset((page - 1) * page_size).limit(page_size).all())
    tenant_names = dict(db.query(models.Tenant.id, models.Tenant.name)
                        .filter(models.Tenant.id.in_({r.tenant_id for r in rows} or {0})).all())
    user_ids = {r.created_by for r in rows if r.created_by}
    users = dict(db.query(models.User.id, models.User.email).filter(models.User.id.in_(user_ids)).all()) if user_ids else {}
    return {
        "total": total, "page": page, "page_size": page_size,
        "items": [{
            "id": r.id, "tenant_id": r.tenant_id, "tenant_name": tenant_names.get(r.tenant_id),
            "bucket": r.bucket, "delta": r.delta, "reason": r.reason, "note": r.note,
            "session_id": r.session_id, "created_by": users.get(r.created_by), "created_at": r.created_at,
        } for r in rows],
    }


# ---------------------------------------------------------------------------
# Reporte: gasto real vs. valor de los créditos
# ---------------------------------------------------------------------------

@router.get("/provider-balances")
async def provider_balances(db: Session = Depends(_db)):
    """Saldo real en las plataformas IA, consultado en vivo con la clave guardada.

    OpenRouter informa el saldo de la cuenta (cargado / gastado) y el tope propio
    de la clave, si tiene: cuando la clave llega a su tope deja de funcionar
    aunque la cuenta tenga saldo. Otras plataformas no exponen el saldo por API.
    Se agrupa por clave (varias conexiones pueden compartirla) y se estima cuántas
    generaciones de imagen alcanzan con el costo promedio de los últimos 30 días.
    """
    import asyncio
    from datetime import timedelta

    import httpx

    from app.api.internal.creator.ai_providers.models import AiProvider
    from app.utils import secrets_box

    rows = db.query(AiProvider).filter(AiProvider.is_active.is_(True)).order_by(AiProvider.provider, AiProvider.id).all()
    groups: dict[str, dict] = {}
    for p in rows:
        key = secrets_box.decrypt(p.api_key_encrypted) if p.api_key_encrypted else None
        gid = f"{p.provider}:{secrets_box.hint(key) if key else p.id}"
        g = groups.setdefault(gid, {"provider": p.provider, "key_hint": secrets_box.hint(key) if key else None,
                                    "key": key, "connections": [], "models": []})
        g["connections"].append(p.name)
        g["models"].append(p.model)

    since = tz.get_now() - timedelta(days=30)
    gen = models.AiGeneration

    async def fetch(client: httpx.AsyncClient, g: dict) -> dict:
        out = {k: g[k] for k in ("provider", "key_hint", "connections", "models")}
        out["supported"] = g["provider"] == "openrouter" and bool(g["key"])
        # Costo promedio real por generación de imagen con estos modelos (últimos 30 días).
        avg = db.query(func.avg(gen.cost_usd)).filter(
            gen.model.in_(g["models"]), gen.kind == "image", gen.success.is_(True),
            gen.cost_usd > 0, gen.created_at >= since,
        ).scalar()
        recorded = db.query(func.coalesce(func.sum(gen.cost_usd), 0)).filter(gen.model.in_(g["models"])).scalar()
        out["avg_image_cost_usd"] = round(float(avg), 5) if avg else None
        out["recorded_cost_usd"] = round(float(recorded or 0), 4)
        if not out["supported"]:
            return out
        headers = {"Authorization": f"Bearer {g['key']}"}
        try:
            credits, key_info = await asyncio.gather(
                client.get("https://openrouter.ai/api/v1/credits", headers=headers),
                client.get("https://openrouter.ai/api/v1/key", headers=headers),
            )
            if credits.status_code == 200:
                d = credits.json().get("data") or {}
                total, used = float(d.get("total_credits") or 0), float(d.get("total_usage") or 0)
                out["account"] = {"total_usd": total, "used_usd": round(used, 4), "remaining_usd": round(total - used, 4)}
            else:
                out["error"] = f"OpenRouter respondió {credits.status_code} al consultar el saldo"
            if key_info.status_code == 200:
                k = key_info.json().get("data") or {}
                if k.get("limit") is not None:
                    out["key_limit"] = {"limit_usd": float(k["limit"]), "remaining_usd": float(k.get("limit_remaining") or 0),
                                        "used_usd": round(float(k["limit"]) - float(k.get("limit_remaining") or 0), 4)}
        except httpx.HTTPError as e:
            out["error"] = f"No se pudo consultar OpenRouter: {e.__class__.__name__}"
        return out

    async with httpx.AsyncClient(timeout=10) as client:
        items = await asyncio.gather(*(fetch(client, g) for g in groups.values()))
    return {"items": items, "checked_at": tz.get_now()}


@router.get("/report")
def credits_report(period: Optional[str] = None, db: Session = Depends(_db)):
    period = period or ai_credits._period()
    start, end = _period_bounds(period)
    price, _attempts, _days = ai_credits._config(db)
    gen = models.AiGeneration

    def in_period(col):
        return (col >= start) & (col < end)

    consumed = dict(
        db.query(models.AiCreditLedger.tenant_id, func.coalesce(func.sum(-models.AiCreditLedger.delta), 0))
        .filter(models.AiCreditLedger.reason == "consume", in_period(models.AiCreditLedger.created_at))
        .group_by(models.AiCreditLedger.tenant_id).all()
    )
    attempts = dict(
        db.query(models.AiDesignSession.tenant_id, func.coalesce(func.sum(models.AiDesignSession.attempts_used), 0))
        .filter(in_period(models.AiDesignSession.created_at))
        .group_by(models.AiDesignSession.tenant_id).all()
    )
    gen_rows = (
        db.query(gen.tenant_id, gen.kind, gen.success,
                 func.count(gen.id), func.coalesce(func.sum(gen.cost_usd), 0),
                 func.count(gen.media_url))
        .filter(in_period(gen.created_at))
        .group_by(gen.tenant_id, gen.kind, gen.success).all()
    )
    by_model = (
        db.query(gen.kind, gen.model, func.count(gen.id), func.coalesce(func.sum(gen.cost_usd), 0),
                 func.avg(gen.duration_ms),
                 func.percentile_cont(0.5).within_group(gen.duration_ms),
                 func.max(gen.duration_ms))
        .filter(in_period(gen.created_at), gen.success.is_(True))
        .group_by(gen.kind, gen.model).all()
    )

    per_tenant: dict = {}

    def row(tid):
        return per_tenant.setdefault(tid, {
            "tenant_id": tid, "credits_consumed": 0, "attempts": 0,
            "texts": 0, "images": 0, "images_saved": 0, "failed": 0, "cost_usd": 0.0,
        })

    for tid, n in consumed.items():
        row(tid)["credits_consumed"] = int(n)
    for tid, n in attempts.items():
        row(tid)["attempts"] = int(n)
    for tid, kind, success, count, cost, saved in gen_rows:
        r = row(tid)
        if not success:
            r["failed"] += count
            continue
        r["texts" if kind == "text" else "images"] += count
        if kind == "image":
            r["images_saved"] += saved
        r["cost_usd"] += float(cost or 0)

    names = dict(db.query(models.Tenant.id, models.Tenant.name)
                 .filter(models.Tenant.id.in_(per_tenant.keys() or {0})).all())
    items = []
    for r in per_tenant.values():
        r["tenant_name"] = names.get(r["tenant_id"])
        r["credits_value_usd"] = round(r["credits_consumed"] * price, 2)
        r["cost_usd"] = round(r["cost_usd"], 4)
        r["margin_usd"] = round(r["credits_value_usd"] - r["cost_usd"], 4)
        items.append(r)
    items.sort(key=lambda x: x["cost_usd"], reverse=True)

    totals = {k: sum(i[k] for i in items) for k in
              ("credits_consumed", "attempts", "texts", "images", "images_saved", "failed")}
    totals["cost_usd"] = round(sum(i["cost_usd"] for i in items), 4)
    totals["credits_value_usd"] = round(totals["credits_consumed"] * price, 2)
    totals["margin_usd"] = round(totals["credits_value_usd"] - totals["cost_usd"], 4)

    return {
        "period": period,
        "credit_price_usd": price,
        "document_runs": _document_runs_summary(db, in_period),
        "totals": totals,
        "items": items,
        # Tiempos en segundos (None si las generaciones son anteriores a la medición).
        "by_model": [{
            "kind": k, "model": m, "count": c, "cost_usd": round(float(cost or 0), 4),
            "avg_seconds": round(float(avg) / 1000, 1) if avg is not None else None,
            "median_seconds": round(float(med) / 1000, 1) if med is not None else None,
            "max_seconds": round(float(mx) / 1000, 1) if mx is not None else None,
        } for k, m, c, cost, avg, med, mx in by_model],
    }


def _document_runs_summary(db: Session, in_period) -> dict:
    """Consumo de los "Generar todo" del periodo: tiempos (total y por paso), créditos y costo IA."""
    run = models.DocumentRun
    rows = db.query(run.total_ms, run.steps, run.error_count, run.credits_used, run.ai_cost_usd)         .filter(in_period(run.created_at)).all()
    per_step: dict = {}
    for _total, steps, *_ in rows:
        for st in steps or []:
            if st.get("state") == "done" and st.get("key"):
                per_step.setdefault(st["key"], []).append(int(st.get("ms") or 0))
    count = len(rows)
    return {
        "count": count,
        "with_errors": sum(1 for r in rows if r.error_count),
        "avg_seconds": round(sum(r.total_ms for r in rows) / count / 1000, 1) if count else None,
        "max_seconds": round(max(r.total_ms for r in rows) / 1000, 1) if count else None,
        "credits_used": sum(r.credits_used for r in rows),
        "ai_cost_usd": round(sum(float(r.ai_cost_usd or 0) for r in rows), 4),
        "steps": [{"key": k, "count": len(v), "avg_seconds": round(sum(v) / len(v) / 1000, 1)}
                  for k, v in per_step.items()],
    }


# ---------------------------------------------------------------------------
# Datos de pago de Vinzer y solicitudes de compra
# ---------------------------------------------------------------------------

class BankInfo(BaseModel):
    holder_name: str = Field("", max_length=120)
    rut: str = Field("", max_length=20)
    bank: str = Field("", max_length=80)
    account_type: str = Field("", max_length=40)
    account_number: str = Field("", max_length=40)
    email: str = Field("", max_length=120)


class PaymentSettings(BaseModel):
    bank: BankInfo
    other_instructions: str = Field("", max_length=1500)


class ReviewRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=500)


@router.get("/payment-settings")
def get_payment_settings(db: Session = Depends(_db)):
    return ai_credits.payment_settings(db)


@router.put("/payment-settings")
def update_payment_settings(payload: PaymentSettings, db: Session = Depends(_db)):
    cfg = db.query(models.SaaSConfig).first()
    if cfg is None:
        raise HTTPException(status_code=404, detail="Configuración global no inicializada")
    cfg.payment_bank_info = {k: v.strip() for k, v in payload.bank.model_dump().items()}
    cfg.payment_other_instructions = payload.other_instructions.strip() or None
    db.commit()
    return ai_credits.payment_settings(db)


@router.get("/purchases")
def list_purchases(status: Optional[str] = None, page: int = 1, page_size: int = 50, db: Session = Depends(_db)):
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    q = db.query(models.AiCreditPurchase)
    if status:
        q = q.filter(models.AiCreditPurchase.status == status)
    total = q.count()
    pending = db.query(func.count(models.AiCreditPurchase.id)).filter(models.AiCreditPurchase.status == "pending").scalar()
    rows = (q.order_by(models.AiCreditPurchase.created_at.desc())
            .offset((page - 1) * page_size).limit(page_size).all())
    names = dict(db.query(models.Tenant.id, models.Tenant.name)
                 .filter(models.Tenant.id.in_({r.tenant_id for r in rows} or {0})).all())
    user_ids = {r.created_by for r in rows if r.created_by}
    users = dict(db.query(models.User.id, models.User.email).filter(models.User.id.in_(user_ids)).all()) if user_ids else {}
    return {
        "total": total, "pending": pending, "page": page, "page_size": page_size,
        "items": [{**ai_credits.purchase_info(r), "tenant_name": names.get(r.tenant_id),
                   "requested_by": users.get(r.created_by)} for r in rows],
    }


@router.post("/purchases/{purchase_id}/approve")
def approve_purchase(purchase_id: int, payload: ReviewRequest, db: Session = Depends(_db),
                     creator=Depends(get_current_creator)):
    apply_bypass_rls(db)
    return ai_credits.purchase_info(ai_credits.review_purchase(db, purchase_id, approve=True, note=payload.note, user_id=creator.id))


@router.post("/purchases/{purchase_id}/reject")
def reject_purchase(purchase_id: int, payload: ReviewRequest, db: Session = Depends(_db),
                    creator=Depends(get_current_creator)):
    apply_bypass_rls(db)
    return ai_credits.purchase_info(ai_credits.review_purchase(db, purchase_id, approve=False, note=payload.note, user_id=creator.id))

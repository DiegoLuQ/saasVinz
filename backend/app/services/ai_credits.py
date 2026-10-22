"""
Créditos IA para las plantillas de redes.

Reglas:
- 1 crédito = 1 diseño (plantilla + mascota) con `ai_attempts_per_credit`
  intentos (3), vigente `ai_session_days` días (7) o hasta gastar los intentos.
- Cada clic de generar = 1 intento ("texto + ilustración" es una sola llamada).
  El intento se reserva ANTES de llamar a la IA y se devuelve si falla.
- Bolsillo mensual: se repone cada mes con `plan.ai_monthly_credits` y no se
  acumula. Bolsillo extra: regalos/compras, no vence. Se gasta primero el mensual.
- Todo cambio de saldo queda en sys_ai_credit_ledger.

Las filas de saldo y de diseño se bloquean (SELECT ... FOR UPDATE) para que
clics simultáneos no gasten de más. Los errores de crédito son 409 con
detail.code ('no_ai_credits' | 'credit_required'): 402 abriría en el frontend
el modal genérico de límite de plan.
"""
import math
from datetime import timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.utils import tz


def _config(db: Session):
    cfg = db.query(models.SaaSConfig).first()
    price = float(cfg.ai_credit_price_usd) if cfg and cfg.ai_credit_price_usd is not None else 1.0
    attempts = (cfg.ai_attempts_per_credit if cfg else None) or 3
    days = (cfg.ai_session_days if cfg else None) or 7
    return price, attempts, days


def _period() -> str:
    return tz.get_now().strftime("%Y-%m")


def plan_monthly_credits(tenant: Optional[models.Tenant]) -> int:
    plan = _plan(tenant)
    return int(getattr(plan, "ai_monthly_credits", 0) or 0)


def _plan(tenant: Optional[models.Tenant]):
    return (getattr(tenant, "effective_plan", None) or getattr(tenant, "subscription_plan", None)) if tenant else None


DEFAULT_USD_CLP_RATE = 950  # solo si el SuperAdmin aún no guarda uno


def to_clp(usd: float, rate: Optional[int]) -> Optional[int]:
    """USD → CLP con el tipo de cambio fijo, redondeado hacia arriba a la decena."""
    if not rate:
        return None
    return int(math.ceil(round(usd * rate, 2) / 10) * 10)


def credit_prices(db: Session, tenant: Optional[models.Tenant]) -> dict:
    """Precio del crédito extra para el plan del tenant (sin precio propio, el de
    referencia global) y el precio base (el más alto de los planes activos) que se
    muestra tachado cuando el plan tiene descuento. CLP con el tipo de cambio fijo."""
    reference, _attempts, _days = _config(db)
    cfg = db.query(models.SaaSConfig).first()
    rate = (cfg.usd_clp_rate if cfg else None) or DEFAULT_USD_CLP_RATE
    plan = _plan(tenant)
    own = getattr(plan, "ai_extra_credit_price_usd", None)
    unit = float(own) if own is not None else reference
    top = (db.query(models.SubscriptionPlan.ai_extra_credit_price_usd)
           .filter(models.SubscriptionPlan.is_active.is_(True),
                   models.SubscriptionPlan.ai_extra_credit_price_usd.isnot(None)).all())
    base = max([float(p[0]) for p in top] + [unit])
    return {
        "plan": plan.name if plan else None,
        "unit_usd": unit,
        "base_usd": base,
        "unit_clp": to_clp(unit, rate),
        "base_clp": to_clp(base, rate),
        "usd_clp_rate": rate,
    }


def _ledger(db: Session, tenant_id: int, bucket: str, delta: int, reason: str, *,
            note: Optional[str] = None, session_id: Optional[int] = None, user_id: Optional[int] = None) -> None:
    db.add(models.AiCreditLedger(
        tenant_id=tenant_id, bucket=bucket, delta=delta, reason=reason,
        note=note, session_id=session_id, created_by=user_id,
    ))


def get_balance(db: Session, tenant: models.Tenant, *, lock: bool = False) -> models.AiCreditBalance:
    """Saldo del tenant, creado si no existe y con el bolsillo mensual al día.
    Con `lock=True` la fila queda bloqueada hasta el commit."""
    db.execute(
        text("INSERT INTO sys_ai_credit_balances (tenant_id, period) VALUES (:t, '') ON CONFLICT (tenant_id) DO NOTHING"),
        {"t": tenant.id},
    )
    q = db.query(models.AiCreditBalance).filter(models.AiCreditBalance.tenant_id == tenant.id)
    bal = (q.with_for_update() if lock else q).one()

    period = _period()
    if bal.period != period:
        # Nuevo mes: vence lo que quedó del mes anterior y se asigna lo del plan.
        if lock is False:
            bal = q.with_for_update().one()
            if bal.period == period:
                return bal
        if bal.monthly_remaining > 0:
            _ledger(db, tenant.id, "monthly", -bal.monthly_remaining, "monthly_expire",
                    note=f"Vencen créditos de {bal.period or 'periodo anterior'}")
        granted = plan_monthly_credits(tenant)
        if granted > 0:
            _ledger(db, tenant.id, "monthly", granted, "monthly_grant", note=f"Créditos del plan · {period}")
        bal.period = period
        bal.monthly_granted = granted
        bal.monthly_remaining = granted
        db.flush()
    return bal


def summary(db: Session, tenant: models.Tenant) -> dict:
    bal = get_balance(db, tenant)
    db.commit()
    _price, attempts, days = _config(db)
    return {
        "period": bal.period,
        "monthly_granted": bal.monthly_granted,
        "monthly_remaining": bal.monthly_remaining,
        "extra_remaining": bal.extra_remaining,
        "available": bal.monthly_remaining + bal.extra_remaining,
        "credit_price_usd": credit_prices(db, tenant)["unit_usd"],
        "attempts_per_credit": attempts,
        "session_days": days,
    }


def session_info(s: models.AiDesignSession) -> dict:
    now = tz.get_now()
    return {
        "id": s.id,
        "template_id": s.template_id,
        "pet_id": s.pet_id,
        "attempts_used": s.attempts_used,
        "max_attempts": s.max_attempts,
        "attempts_left": max(0, s.max_attempts - s.attempts_used),
        "expires_at": s.expires_at,
        "active": s.attempts_used < s.max_attempts and s.expires_at > now,
    }


def open_session(db: Session, tenant: models.Tenant, *, template_id: int, pet_id: Optional[int],
                 user_id: Optional[int]) -> models.AiDesignSession:
    """Usa 1 crédito (primero el mensual) y abre un diseño con N intentos."""
    bal = get_balance(db, tenant, lock=True)
    if bal.monthly_remaining > 0:
        bucket = "monthly"
        bal.monthly_remaining -= 1
    elif bal.extra_remaining > 0:
        bucket = "extra"
        bal.extra_remaining -= 1
    else:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "no_ai_credits",
                    "message": "No te quedan créditos de IA. Pide más al administrador de Vinzer."},
        )
    _price, attempts, days = _config(db)
    s = models.AiDesignSession(
        tenant_id=tenant.id, template_id=template_id, pet_id=pet_id, bucket=bucket,
        attempts_used=0, max_attempts=attempts, expires_at=tz.get_now() + timedelta(days=days),
        created_by=user_id,
    )
    db.add(s)
    db.flush()
    _ledger(db, tenant.id, bucket, -1, "consume", note=f"Diseño #{s.id}", session_id=s.id, user_id=user_id)
    db.commit()
    db.refresh(s)
    return s


def reserve_attempt(db: Session, tenant_id: int, session_id: Optional[int], *,
                    template_id: int, pet_id: Optional[int], free: bool = False) -> models.AiDesignSession:
    """Reserva 1 intento del diseño (con `free=True` solo valida el diseño, sin
    contar intento: reintento sin costo de un texto que falló). Errores 409 con
    code 'credit_required' para que el frontend ofrezca abrir un crédito nuevo."""
    def required(message: str):
        db.rollback()
        return HTTPException(status_code=status.HTTP_409_CONFLICT,
                             detail={"code": "credit_required", "message": message})

    if not session_id:
        raise required("Para generar con IA necesitas usar un crédito en este diseño.")
    s = (db.query(models.AiDesignSession)
         .filter(models.AiDesignSession.id == session_id, models.AiDesignSession.tenant_id == tenant_id)
         .with_for_update().first())
    if s is None:
        raise required("Diseño no encontrado: usa un crédito para empezar.")
    if s.template_id != template_id or s.pet_id != pet_id:
        raise required("Este crédito es de otro diseño (otra plantilla o mascota). Usa un crédito para este.")
    if s.expires_at <= tz.get_now():
        raise required("El crédito de este diseño venció. Usa un crédito nuevo para seguir.")
    if free:
        db.commit()
        return s
    if s.attempts_used >= s.max_attempts:
        raise required(f"Ya usaste los {s.max_attempts} intentos de este crédito. Usa otro para seguir.")
    s.attempts_used += 1
    db.commit()
    return s


FREE_TEXT_RETRY_MINUTES = 30


def can_retry_text_free(db: Session, session_id: int) -> bool:
    """Reintento sin costo del texto: solo si el último texto del diseño falló hace
    poco (p. ej. la plataforma estaba saturada en un «texto + ilustración» en que
    la ilustración sí salió y el intento ya se contó)."""
    last = (db.query(models.AiGeneration)
            .filter(models.AiGeneration.session_id == session_id, models.AiGeneration.kind == "text")
            .order_by(models.AiGeneration.created_at.desc(), models.AiGeneration.id.desc()).first())
    return bool(last and not last.success
                and last.created_at >= tz.get_now() - timedelta(minutes=FREE_TEXT_RETRY_MINUTES))


def release_attempt(db: Session, session_id: int) -> None:
    """Devuelve un intento cuando la generación falló."""
    s = db.query(models.AiDesignSession).filter(models.AiDesignSession.id == session_id).with_for_update().first()
    if s is not None and s.attempts_used > 0:
        s.attempts_used -= 1
    db.commit()


def grant_extra(db: Session, tenant: models.Tenant, amount: int, *, reason: str,
                note: Optional[str], user_id: Optional[int]) -> models.AiCreditBalance:
    """Regalo/compra (+) o ajuste (±) del bolsillo extra. El saldo nunca queda negativo."""
    bal = get_balance(db, tenant, lock=True)
    if bal.extra_remaining + amount < 0:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"El saldo extra es {bal.extra_remaining}: no se pueden quitar {abs(amount)}.")
    bal.extra_remaining += amount
    _ledger(db, tenant.id, "extra", amount, reason, note=note, user_id=user_id)
    db.commit()
    db.refresh(bal)
    return bal


# ---------------------------------------------------------------------------
# Compra de créditos (transferencia u otro medio, revisión manual del SuperAdmin)
# ---------------------------------------------------------------------------

BANK_FIELDS = ("holder_name", "rut", "bank", "account_type", "account_number", "email")
MAX_PURCHASE = 500
PURCHASE_PACKS = (1, 5, 10)


def payment_settings(db: Session) -> dict:
    cfg = db.query(models.SaaSConfig).first()
    bank = (cfg.payment_bank_info if cfg and isinstance(cfg.payment_bank_info, dict) else {}) or {}
    price, attempts, days = _config(db)
    return {
        "bank": {k: (bank.get(k) or "") for k in BANK_FIELDS},
        "other_instructions": (cfg.payment_other_instructions if cfg else None) or "",
        "credit_price_usd": price,
        "usd_clp_rate": cfg.usd_clp_rate if cfg else None,
        "attempts_per_credit": attempts,
        "session_days": days,
    }


def purchase_info(p: models.AiCreditPurchase) -> dict:
    return {
        "id": p.id, "tenant_id": p.tenant_id, "quantity": p.quantity,
        "unit_price_usd": float(p.unit_price_usd), "total_usd": float(p.total_usd), "total_clp": p.total_clp,
        "usd_clp_rate": p.usd_clp_rate,
        "method": p.method, "reference": p.reference, "note": p.note, "status": p.status,
        "review_note": p.review_note, "reviewed_at": p.reviewed_at, "created_at": p.created_at,
    }


def create_purchase(db: Session, tenant: models.Tenant, *, quantity: int, method: str,
                    reference: Optional[str], note: Optional[str], user_id: Optional[int]) -> models.AiCreditPurchase:
    if not 1 <= quantity <= MAX_PURCHASE:
        raise HTTPException(status_code=400, detail=f"La cantidad debe estar entre 1 y {MAX_PURCHASE} créditos.")
    settings_ = payment_settings(db)
    if method == "transfer" and not settings_["bank"]["account_number"]:
        raise HTTPException(status_code=400, detail="El pago por transferencia aún no está disponible.")
    if method == "other" and not settings_["other_instructions"]:
        raise HTTPException(status_code=400, detail="Este medio de pago aún no está disponible.")
    # Precio según el plan del crematorio; el monto en CLP queda fijo en la solicitud.
    prices = credit_prices(db, tenant)
    price, unit_clp = prices["unit_usd"], prices["unit_clp"]
    p = models.AiCreditPurchase(
        tenant_id=tenant.id, quantity=quantity, unit_price_usd=price, total_usd=round(price * quantity, 2),
        total_clp=(unit_clp * quantity) if unit_clp else None, usd_clp_rate=prices["usd_clp_rate"], method=method,
        reference=(reference or "").strip()[:120] or None, note=(note or "").strip()[:500] or None,
        status="pending", created_by=user_id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _notify_tenant(db: Session, tenant_id: int, title: str, message: str, priority: str = "normal") -> None:
    db.add(models.Notification(
        recipient_type=models.RecipientType.tenant, tenant_id=tenant_id, audience="owner",
        type="payment", title=title, message=message,
        priority=getattr(models.NotificationPriority, priority),
        action_url="/dashboard/configuracion?tab=creditos",
    ))


def review_purchase(db: Session, purchase_id: int, *, approve: bool, note: Optional[str],
                    user_id: Optional[int]) -> models.AiCreditPurchase:
    """Aprueba (suma al saldo extra como 'purchase') o rechaza una solicitud pendiente."""
    p = (db.query(models.AiCreditPurchase).filter(models.AiCreditPurchase.id == purchase_id)
         .with_for_update().first())
    if p is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if p.status != "pending":
        db.rollback()
        raise HTTPException(status_code=409, detail=f"La solicitud ya está {p.status}.")
    if not approve and not (note or "").strip():
        db.rollback()
        raise HTTPException(status_code=400, detail="Indica el motivo del rechazo.")
    p.status = "approved" if approve else "rejected"
    p.review_note = (note or "").strip() or None
    p.reviewed_by = user_id
    p.reviewed_at = tz.get_now()
    tenant = db.query(models.Tenant).filter(models.Tenant.id == p.tenant_id).first()
    if approve:
        bal = get_balance(db, tenant, lock=True)
        bal.extra_remaining += p.quantity
        _ledger(db, p.tenant_id, "extra", p.quantity, "purchase",
                note=f"Compra #{p.id} ({'transferencia' if p.method == 'transfer' else 'otro medio'})", user_id=user_id)
        _notify_tenant(db, p.tenant_id, "Compra de créditos aprobada",
                       f"Se sumaron {p.quantity} créditos de IA a tu saldo.")
    else:
        _notify_tenant(db, p.tenant_id, "Compra de créditos rechazada",
                       f"Tu solicitud de {p.quantity} créditos fue rechazada: {p.review_note}", priority="high")
    db.commit()
    db.refresh(p)
    return p


def cancel_purchase(db: Session, tenant_id: int, purchase_id: int) -> models.AiCreditPurchase:
    p = (db.query(models.AiCreditPurchase)
         .filter(models.AiCreditPurchase.id == purchase_id, models.AiCreditPurchase.tenant_id == tenant_id)
         .with_for_update().first())
    if p is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if p.status != "pending":
        db.rollback()
        raise HTTPException(status_code=409, detail="Solo se pueden cancelar solicitudes pendientes.")
    p.status = "cancelled"
    db.commit()
    db.refresh(p)
    return p

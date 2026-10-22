"""
Créditos IA — lado del tenant: saldo, datos de pago de Vinzer y solicitudes de
compra (transferencia u otro medio). Las aprueba el SuperAdmin en Créditos IA.
Solo el administrador del crematorio puede comprar.
"""
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_tenant_id
from app.auth import get_current_user
from app.database import get_db
from app.services import ai_credits
from app.api.deps_features import check_feature

router = APIRouter()

# Configuración → "Compra de créditos" es una característica del plan (sin flag = permitido).
CREDITS_FEATURE = check_feature("configuracion:creditos_ia", default=True)


class PurchaseRequest(BaseModel):
    quantity: int = Field(..., ge=1, le=ai_credits.MAX_PURCHASE)
    method: Literal["transfer", "other"]
    reference: Optional[str] = Field(None, max_length=120)
    note: Optional[str] = Field(None, max_length=500)


def _require_owner(user: models.User) -> None:
    role = getattr(user.role, "value", user.role)
    if role not in ("admin", "creator"):
        raise HTTPException(status_code=403, detail="Solo el administrador del crematorio puede comprar créditos.")


def _tenant(db: Session, tenant_id: int) -> models.Tenant:
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Crematorio no encontrado")
    return tenant


@router.get("/store")
def credits_store(db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    """Saldo + datos de pago de Vinzer + solicitudes recientes del crematorio."""
    pay = ai_credits.payment_settings(db)
    tenant = _tenant(db, tenant_id)
    purchases = (db.query(models.AiCreditPurchase)
                 .filter(models.AiCreditPurchase.tenant_id == tenant_id)
                 .order_by(models.AiCreditPurchase.created_at.desc()).limit(20).all())
    return {
        "credits": ai_credits.summary(db, tenant),
        "payment": {
            "bank": pay["bank"] if pay["bank"]["account_number"] else None,
            "other_instructions": pay["other_instructions"] or None,
        },
        # Precio del crédito extra según el plan (+ precio base para mostrarlo tachado).
        "prices": ai_credits.credit_prices(db, tenant),
        "packs": ai_credits.PURCHASE_PACKS,
        "max_purchase": ai_credits.MAX_PURCHASE,
        "purchases": [ai_credits.purchase_info(p) for p in purchases],
    }


@router.post("/purchases")
def create_purchase(payload: PurchaseRequest, db: Session = Depends(get_db),
                    tenant_id: int = Depends(get_tenant_id), current_user: models.User = Depends(get_current_user),
                    _f: bool = Depends(CREDITS_FEATURE)):
    _require_owner(current_user)
    p = ai_credits.create_purchase(db, _tenant(db, tenant_id), quantity=payload.quantity, method=payload.method,
                                   reference=payload.reference, note=payload.note, user_id=current_user.id)
    return ai_credits.purchase_info(p)


@router.post("/purchases/{purchase_id}/cancel")
def cancel_purchase(purchase_id: int, db: Session = Depends(get_db),
                    tenant_id: int = Depends(get_tenant_id), current_user: models.User = Depends(get_current_user),
                    _f: bool = Depends(CREDITS_FEATURE)):
    _require_owner(current_user)
    return ai_credits.purchase_info(ai_credits.cancel_purchase(db, tenant_id, purchase_id))

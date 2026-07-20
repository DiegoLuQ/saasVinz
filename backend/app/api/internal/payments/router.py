from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import settings
from .service import payment_service
from . import schemas
from app.api.internal.admin.models import Tenant
from app.api.internal.memorials.models import Memorial
from app.api.internal.partners.models import Veterinary
from app import auth, models
from datetime import datetime
from typing import Dict, Any, Optional
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


def _is_creator(role) -> bool:
    return role in ("creator", getattr(models.UserRole, "creator", "creator"))

@router.post("/create-checkout", response_model=schemas.CheckoutResponse)
async def create_checkout(
    request: schemas.CheckoutCreateRequest,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(auth.get_token_from_request)
):
    """
    Inicia un flujo de pago en Polar.sh con metadata contextual.

    Autorización:
    - target_resource == "tenant": requiere usuario autenticado cuyo tenant
      coincida con target_id (creator puede cualquiera).
    - "memorial"/"veterinary": flujo público (gestión de memorial por familiares).
    """
    # Control de acceso para checkouts de tenant (evita generar checkouts
    # a nombre de un tenant ajeno desde una sesión no autorizada).
    if request.target_resource == "tenant":
        payload = auth.decode_access_token(token) if token else None
        if not payload:
            raise HTTPException(status_code=401, detail="Autenticación requerida.")
        if not _is_creator(payload.get("role")):
            if str(payload.get("tenant_id")) != str(request.target_id):
                raise HTTPException(status_code=403, detail="No autorizado para este recurso.")

    metadata = {
        "target_resource": request.target_resource,
        "target_id": request.target_id,
        "action": request.action
    }
    
    # Buscar si ya tenemos un polar_customer_id para este recurso
    customer_id = None
    model_map = {
        "tenant": Tenant,
        "memorial": Memorial,
        "veterinary": Veterinary
    }
    Model = model_map.get(request.target_resource)
    if Model:
        query_field = "id" if request.target_resource != "memorial" else "id_recuerdo"
        obj = db.query(Model).filter(getattr(Model, query_field) == request.target_id).first()
        if obj and hasattr(obj, "polar_customer_id"):
            customer_id = obj.polar_customer_id

    try:
        checkout = await payment_service.create_checkout(
            product_id=request.product_id,
            success_url=request.success_url,
            metadata=metadata,
            customer_email=request.customer_email,
            customer_id=customer_id
        )
        return schemas.CheckoutResponse(id=checkout["id"], url=checkout["url"])
    except Exception as e:
        logger.error(f"Error creating Polar checkout: {str(e)}")
        raise HTTPException(status_code=500, detail="No se pudo iniciar el proceso de pago. Intenta nuevamente.")

@router.post("/portal", response_model=schemas.PortalSessionResponse)
async def create_portal_session(
    request: schemas.PortalSessionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Genera una URL para el portal de cliente de Polar.sh.

    Autorización: solo el dueño del customer_id (su propio tenant) o un creator.
    Previene IDOR: enumerar customer_id ajenos exponía el portal de facturación
    (historial de pagos, métodos) de otros clientes.
    """
    if not _is_creator(current_user.role):
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if not tenant or not tenant.polar_customer_id or tenant.polar_customer_id != request.customer_id:
            raise HTTPException(status_code=403, detail="No autorizado para acceder a este portal de facturación.")

    try:
        return_url = request.return_url or f"{settings.BASE_URL}/dashboard"
        url = await payment_service.create_portal_session(request.customer_id, return_url)
        return schemas.PortalSessionResponse(url=url)
    except Exception as e:
        logger.error(f"Error creating Polar portal session: {str(e)}")
        raise HTTPException(status_code=500, detail="No se pudo abrir el portal de facturación. Intenta nuevamente.")

@router.post("/webhook")
async def handle_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Recibe y procesa eventos de Polar.sh utilizando validación del SDK.
    """
    payload = await request.body()
    headers = dict(request.headers)
    
    try:
        event = payment_service.verify_webhook(payload, headers)
    except Exception as e:
        logger.warning(f"Webhook validation failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid signature")

    event_type = getattr(event, "TYPE", None) or getattr(event, "type", "unknown")
    event_data = event.data
    
    logger.info(f"Processing Polar webhook: {event_type}")

    if event_type in ["subscription.created", "subscription.updated"]:
        await process_subscription_event(event_data, db)
    elif event_type == "subscription.revoked":
        await process_subscription_revoked(event_data, db)
        
    return {"status": "ok"}

async def process_subscription_event(data: Any, db: Session):
    # El SDK devuelve un objeto, no necesariamente un dict
    metadata = getattr(data, "metadata", {})
    resource_type = metadata.get("target_resource")
    resource_id = metadata.get("target_id")
    
    if not resource_type or not resource_id:
        logger.error("Webhook missing metadata for resource identification")
        return

    # Extraer info de la suscripción de Polar
    status = getattr(data, "status", "none")
    customer_id = getattr(data, "customer_id", None)
    subscription_id = getattr(data, "id", None)
    current_period_end = getattr(data, "current_period_end", None)
    cancel_at_period_end = getattr(data, "cancel_at_period_end", False)

    # Monto (en centavos) e intervalo de recurrencia. El objeto de Polar expone
    # `amount` y `recurring_interval`; con fallback al precio anidado por si el
    # SDK cambia el shape. Si falta el monto, queda 0 y se usa el precio del plan.
    amount_cents = getattr(data, "amount", None)
    if amount_cents is None:
        price_obj = getattr(data, "price", None)
        amount_cents = getattr(price_obj, "price_amount", 0) if price_obj is not None else 0
    amount_cents = amount_cents or 0
    recurring_interval = getattr(data, "recurring_interval", None) or getattr(data, "recurringInterval", None)

    model_map = {
        "tenant": Tenant,
        "memorial": Memorial,
        "veterinary": Veterinary
    }
    
    Model = model_map.get(resource_type)
    if not Model:
        logger.error(f"Unknown resource type in metadata: {resource_type}")
        return

    query_field = "id" if resource_type != "memorial" else "id_recuerdo"
    
    obj = db.query(Model).filter(getattr(Model, query_field) == resource_id).first()
    if not obj:
        logger.error(f"Resource {resource_type} with ID {resource_id} not found")
        return

    # Actualizar campos de persistencia
    obj.polar_customer_id = customer_id
    obj.polar_subscription_id = subscription_id
    obj.subscription_status = status
    obj.current_period_end = current_period_end
    obj.polar_cancel_at_period_end = cancel_at_period_end

    # Sincronizar plan interno basado en el polar_product_id si es un tenant
    if resource_type == "tenant":
        product_id = getattr(data, "product_id", None)
        if product_id:
            from app.api.internal.admin.models import SubscriptionPlan
            internal_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.polar_product_id == product_id).first()
            if internal_plan:
                # Registrar transacción si la suscripción está activa
                if status == "active":
                    from app.api.internal.creator.subscriptions.models import BillingTransaction, PaymentMethod, PaymentStatus
                    from app.utils import tz
                    
                    tx_ref = f"POLAR_{subscription_id}"
                    # Evitar duplicar transacciones para el mismo ID de suscripción
                    existing_tx = db.query(BillingTransaction).filter(BillingTransaction.payment_reference == tx_ref).first()
                    
                    # Determinar monto
                    amount = amount_cents / 100 if amount_cents > 0 else (
                        internal_plan.annual_price if recurring_interval == "year" else internal_plan.price
                    )
                    
                    # Actualizar el Precio Mensual Personalizado (MRR) en el tenant (TenantBillingInfo)
                    from app.api.internal.admin.models import TenantBillingInfo
                    if not obj.billing_info:
                        obj.billing_info = TenantBillingInfo(tenant_id=obj.id)
                    
                    # Si es anual, guardamos el equivalente mensual (MRR)
                    obj.billing_info.monthly_price = amount / 12 if recurring_interval == "year" else amount
                    
                    if not existing_tx:
                        new_tx = BillingTransaction(
                            tenant_id=obj.id,
                            amount=amount,
                            payment_method=PaymentMethod.POLAR,
                            payment_status=PaymentStatus.COMPLETED,
                            payment_date=tz.get_now(),
                            payment_reference=tx_ref,
                            notes=f"Pago automático vía Polar.sh - Sub {subscription_id}",
                            target_plan_id=internal_plan.id,
                            target_billing_cycle="annual" if recurring_interval == "year" else "monthly"
                        )
                        db.add(new_tx)
                        db.commit() # Commit to get the ID for the receipt
                        db.refresh(new_tx)
                        
                        logger.info(f"Transaction recorded for Tenant {obj.id}: {amount} via Polar")
                        
                        # Generate automatic receipt
                        from app.api.internal.creator.subscriptions.service import ReceiptService
                        ReceiptService.create_receipt_from_transaction(db, new_tx.id)

                obj.subscription_plan_id = internal_plan.id
                logger.info(f"Tenant {resource_id} plan synced to {internal_plan.name} and MRR updated to {obj.billing_info.monthly_price} via Polar")
    
    # Lógica específica de negocio (Upgrades)
    action = metadata.get("action")
    if action == "upgrade_to_ultra" and resource_type == "memorial":
        obj.plan = "ULTRA"
        logger.info(f"Memorial {resource_id} upgraded to ULTRA")

    db.commit()

async def process_subscription_revoked(data: Any, db: Session):
    subscription_id = getattr(data, "id", None)
    if not subscription_id:
        return
        
    # Buscar por subscription_id en todas las tablas principales
    for Model in [Tenant, Memorial, Veterinary]:
        obj = db.query(Model).filter(Model.polar_subscription_id == subscription_id).first()
        if obj:
            obj.subscription_status = "canceled"
            db.commit()
            logger.info(f"Subscription {subscription_id} revoked for {Model.__name__}")
            break

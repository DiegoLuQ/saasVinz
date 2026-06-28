from polar_sdk import Polar
from polar_sdk.models import CheckoutCreate, CustomerSessionCustomerIDCreate, SDKError
from polar_sdk._webhooks import validate_event, WebhookVerificationError
from typing import Optional, Dict, Any, List
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.client = Polar(
            access_token=settings.POLAR_ACCESS_TOKEN,
            server=settings.POLAR_SERVER
        )
        self.webhook_secret = settings.POLAR_WEBHOOK_SECRET

    async def create_checkout(
        self, 
        product_id: str, 
        success_url: str,
        metadata: Dict[str, str],
        customer_email: Optional[str] = None,
        customer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Crea una sesión de checkout en Polar.sh utilizando el SDK oficial.
        """
        try:
            checkout_request = {
                "products": [product_id],
                "success_url": success_url,
                "metadata": metadata
            }
            
            if customer_id:
                checkout_request["customer_id"] = customer_id
            elif customer_email:
                checkout_request["customer_email"] = customer_email

            checkout = self.client.checkouts.create(request=CheckoutCreate(**checkout_request))
            return {"id": checkout.id, "url": checkout.url}
            
        except SDKError as e:
            logger.error(f"Polar SDK Error creating checkout: {e.message}")
            raise Exception(f"Error de Polar: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error creating checkout: {str(e)}")
            raise e

    async def create_portal_session(self, customer_id: str, return_url: str) -> str:
        """
        Genera una URL para el Customer Portal de Polar utilizando el SDK oficial.
        """
        try:
            request_data = CustomerSessionCustomerIDCreate(
                customer_id=customer_id,
                return_url=return_url
            )
            session = self.client.customer_sessions.create(request=request_data)
            return session.customer_portal_url
        except SDKError as e:
            logger.error(f"Polar SDK Error creating portal session: {e.message}")
            raise Exception(f"Error de Polar: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error creating portal session: {str(e)}")
            raise e

    def verify_webhook(self, body: bytes, headers: Dict[str, str]) -> Any:
        """
        Verifica y valida un evento de webhook de Polar.sh
        """
        try:
            return validate_event(body, headers, self.webhook_secret)
        except WebhookVerificationError:
            logger.warning("Invalid webhook signature received")
            raise Exception("Invalid signature")
        except Exception as e:
            logger.error(f"Error validating webhook: {str(e)}")
            raise e

    async def cancel_subscription(self, subscription_id: str) -> Any:
        """
        Cancela una suscripción en Polar.sh al final del periodo actual.
        """
        try:
            from polar_sdk.models import SubscriptionCancel
            result = self.client.subscriptions.update(
                id=subscription_id, 
                subscription_update=SubscriptionCancel(cancel_at_period_end=True)
            )
            return result
        except SDKError as e:
            logger.error(f"Polar SDK Error cancelling subscription: {e.message}")
            raise Exception(f"Error de Polar: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error cancelling subscription: {str(e)}")
            raise e

payment_service = PaymentService()

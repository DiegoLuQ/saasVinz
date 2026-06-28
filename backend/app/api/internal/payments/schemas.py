from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any

class CheckoutCreateRequest(BaseModel):
    product_id: str
    success_url: str
    target_resource: str # memorial | tenant | veterinary
    target_id: str
    action: str # upgrade_to_ultra | subscription_start
    customer_email: Optional[EmailStr] = None

class CheckoutResponse(BaseModel):
    id: str
    url: str

class WebhookPayload(BaseModel):
    type: str
    data: Dict[str, Any]

class PortalSessionRequest(BaseModel):
    customer_id: str
    return_url: Optional[str] = None

class PortalSessionResponse(BaseModel):
    url: str

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.api.internal.memorials.models import MemorialStatus, MemorialPlan

class MemorialPlanResponse(BaseModel):
    id: int
    name: str
    name_db: str
    
    class Config:
        from_attributes = True

class AdminMemorialResponse(BaseModel):
    id: int
    id_recuerdo: str # UUID
    pet_name: str
    pet_image_url: Optional[str] = None
    customer_name: str
    tenant_name: str
    tenant_slug: str
    tenant_id: int
    plan: Optional[str] = None
    status: MemorialStatus
    valid_until: Optional[datetime] = None
    dedicatoria: Optional[str] = None
    main_image_url: Optional[str] = None
    lista_imagenes: Optional[List[str]] = None
    diseno: Optional[dict] = None
    access_key: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class AdminMemorialUpdate(BaseModel):
    plan: Optional[str] = None
    valid_until: Optional[datetime] = None
    status: Optional[MemorialStatus] = None
    pet_name: Optional[str] = None
    pet_image_url: Optional[str] = None
    main_image_url: Optional[str] = None
    dedicatoria: Optional[str] = None
    diseno: Optional[dict] = None
    access_key: Optional[str] = None

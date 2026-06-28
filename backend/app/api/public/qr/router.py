from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.api.deps import get_public_tenant_id
from typing import List

router = APIRouter()

@router.get("/services", response_model=List[schemas.ServiceInDB])
def get_public_services(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_public_tenant_id)
):
    return db.query(models.Service).filter(
        models.Service.tenant_id == tenant_id,
        models.Service.is_active == True
    ).all()

@router.post("/orders")
def create_public_order(
    order_data: dict,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_public_tenant_id)
):
    # Endpoint disabled as CustomerOrder table was removed
    raise HTTPException(status_code=501, detail="Order creation not implemented")

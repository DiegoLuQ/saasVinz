from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.api.internal.memorials.models import Memorial, MemorialPlan
from app.api.internal.crm.models import Pet, Customer
from app.api.internal.admin.models import Tenant
from app import models, auth
from . import schemas
from typing import List, Optional

router = APIRouter()

@router.get("/plans", response_model=List[schemas.MemorialPlanResponse])
def list_memorial_plans(
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """List all available memorial plans for superadmins."""
    return db.query(MemorialPlan).filter(MemorialPlan.is_active == True).all()

@router.get("", response_model=List[schemas.AdminMemorialResponse])
def list_all_memorials(
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50
):
    query = db.query(Memorial).options(
        joinedload(Memorial.pet).joinedload(Pet.customer),
        joinedload(Memorial.tenant)
    )

    if search:
        # Simple search by pet name or customer name
        query = query.join(Memorial.pet).join(Pet.customer).filter(
            (Pet.name.ilike(f"%{search}%")) | 
            (Customer.name.ilike(f"%{search}%"))
        )

    memorials = query.order_by(Memorial.fecha.desc()).offset(skip).limit(limit).all()

    return [
        schemas.AdminMemorialResponse(
            id=m.id,
            id_recuerdo=str(m.id_recuerdo),
            pet_name=m.pet.name if m.pet else "Desconocido",
            pet_image_url=m.pet.image_url if m.pet else None,
            customer_name=m.pet.customer.name if m.pet and m.pet.customer else "Desconocido",
            tenant_name=m.tenant.name if m.tenant else "Desconocido",
            tenant_slug=m.tenant.slug if m.tenant else "default",
            tenant_id=m.tenant.id if m.tenant else 0,
            plan=m.plan,
            status=m.status,
            valid_until=m.valid_until,
            dedicatoria=m.msg_despedida,
            main_image_url=m.main_image_url,
            lista_imagenes=m.lista_imagenes,
            diseno=m.diseno,
            access_key=m.access_key,
            created_at=m.fecha
        )
        for m in memorials
    ]

@router.patch("/{memorial_id}", response_model=schemas.AdminMemorialResponse)
def update_memorial_admin(
    memorial_id: int,
    update_data: schemas.AdminMemorialUpdate,
    db: Session = Depends(get_db)
):
    memorial = db.query(Memorial).options(
        joinedload(Memorial.pet).joinedload(Pet.customer),
        joinedload(Memorial.tenant)
    ).filter(Memorial.id == memorial_id).first()

    if not memorial:
        raise HTTPException(status_code=404, detail="Memorial not found")

    if update_data.plan is not None:
        memorial.plan = update_data.plan
    
    if update_data.valid_until is not None:
        memorial.valid_until = update_data.valid_until
        
    if update_data.status is not None:
        memorial.status = update_data.status

    if update_data.dedicatoria is not None:
        memorial.msg_despedida = update_data.dedicatoria

    if memorial.pet:
        if update_data.pet_name is not None:
            memorial.pet.name = update_data.pet_name
        if update_data.pet_image_url is not None:
            memorial.pet.image_url = update_data.pet_image_url

    if update_data.main_image_url is not None:
        memorial.main_image_url = update_data.main_image_url

    if update_data.diseno is not None:
        memorial.diseno = update_data.diseno

    if update_data.access_key is not None:
        memorial.access_key = update_data.access_key

    db.commit()
    db.refresh(memorial)

    return schemas.AdminMemorialResponse(
        id=memorial.id,
        id_recuerdo=str(memorial.id_recuerdo),
        pet_name=memorial.pet.name if memorial.pet else "Desconocido",
        pet_image_url=memorial.pet.image_url if memorial.pet else None,
        customer_name=memorial.pet.customer.name if memorial.pet and memorial.pet.customer else "Desconocido",
        tenant_name=memorial.tenant.name if memorial.tenant else "Desconocido",
        tenant_slug=memorial.tenant.slug if memorial.tenant else "default",
        tenant_id=memorial.tenant.id if memorial.tenant else 0,
        plan=memorial.plan,
        status=memorial.status,
        valid_until=memorial.valid_until,
        dedicatoria=memorial.msg_despedida,
        main_image_url=memorial.main_image_url,
        lista_imagenes=memorial.lista_imagenes,
        diseno=memorial.diseno,
        access_key=memorial.access_key,
        created_at=memorial.fecha
    )

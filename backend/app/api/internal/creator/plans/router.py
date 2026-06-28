from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app import auth
from typing import List

router = APIRouter()

@router.get("", response_model=List[schemas.SubscriptionPlanInDB])
def get_subscription_plans(
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
    include_inactive: bool = False
):
    """Get all subscription plans for the creator panel."""
    query = db.query(models.SubscriptionPlan)
    
    if not include_inactive:
        query = query.filter(models.SubscriptionPlan.is_active == True)
    
    plans = query.order_by(models.SubscriptionPlan.display_order).all()
    return plans


@router.post("", response_model=schemas.SubscriptionPlanInDB)
def create_subscription_plan(
    plan: schemas.SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Create a new subscription plan."""
    db_plan = models.SubscriptionPlan(**plan.dict())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan


@router.get("/{plan_id}", response_model=schemas.SubscriptionPlanInDB)
def get_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Get a specific subscription plan by ID."""
    plan = db.query(models.SubscriptionPlan).filter(
        models.SubscriptionPlan.id == plan_id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return plan


@router.put("/{plan_id}", response_model=schemas.SubscriptionPlanInDB)
def update_subscription_plan(
    plan_id: int,
    plan_update: schemas.SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Update an existing subscription plan."""
    plan = db.query(models.SubscriptionPlan).filter(
        models.SubscriptionPlan.id == plan_id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
   # Update fields if provided
    update_data = plan_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)
    
    db.commit()
    db.refresh(plan)
    
    return plan


@router.delete("/{plan_id}")
def delete_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """
    Soft delete a subscription plan by setting is_active to False.
    Actual deletion is not allowed if tenants are using this plan.
    """
    plan = db.query(models.SubscriptionPlan).filter(
        models.SubscriptionPlan.id == plan_id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check if any tenants are using this plan
    tenant_count = db.query(models.Tenant).filter(
        models.Tenant.subscription_plan_id == plan_id
    ).count()
    
    if tenant_count > 0:
        # Soft delete - just mark as inactive
        plan.is_active = False
        db.commit()
        return {
            "message": f"Plan '{plan.name}' marked as inactive ({tenant_count} tenants using it)",
            "soft_delete": True
        }
    else:
        # No tenants using it - could hard delete, but we'll still soft delete for safety
        plan.is_active = False
        db.commit()
        return {
            "message": f"Plan '{plan.name}' marked as inactive",
            "soft_delete": True
        }


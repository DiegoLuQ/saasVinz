from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, auth, schemas
from pydantic import BaseModel, EmailStr
import uuid

router = APIRouter()

class FreeOnboardingRequest(BaseModel):
    business_name: str
    slug: str
    admin_email: EmailStr
    admin_name: str
    phone: str | None = None

@router.post("/free")
def create_free_account(
    data: FreeOnboardingRequest,
    db: Session = Depends(get_db)
):
    """
    Crea una cuenta FREE de forma automatizada.
    Usado por el flujo de WhatsApp.
    """
    # 1. Verificar si el slug ya existe
    existing_tenant = db.query(models.Tenant).filter(models.Tenant.slug == data.slug).first()
    if existing_tenant:
        raise HTTPException(status_code=400, detail="El identificador (slug) ya está en uso. Prueba con otro.")

    # 2. Verificar si el email ya existe
    existing_user = db.query(models.User).filter(models.User.email == data.admin_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

    # 3. Buscar el Plan FREE
    free_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == "FREE").first()
    if not free_plan:
        raise HTTPException(status_code=500, detail="Error de configuración: Plan FREE no encontrado en el sistema.")

    try:
        # 4. Crear Tenant
        new_tenant = models.Tenant(
            name=data.business_name,
            slug=data.slug,
            email=data.admin_email,
            phone=data.phone,
            subscription_plan_id=free_plan.id,
            plan="FREE", # Legacy field
            status=models.TenantStatus.active,
            public_token=str(uuid.uuid4())[:8]
        )
        db.add(new_tenant)
        db.flush() # Para obtener el ID

        # 5. Crear Usuario Admin
        new_user = models.User(
            name=data.admin_name,
            email=data.admin_email,
            hashed_password=auth.get_password_hash("123456"), # Password temporal por defecto
            role=models.UserRole.admin,
            tenant_id=new_tenant.id,
            is_active=True
        )
        db.add(new_user)
        
        db.commit()
        db.refresh(new_tenant)
        db.refresh(new_user)

        return {
            "status": "success",
            "message": "Cuenta FREE creada exitosamente",
            "access_url": f"/login?slug={new_tenant.slug}",
            "credentials": {
                "email": new_user.email,
                "password": "123456 (Cámbiala al ingresar)"
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear la cuenta: {str(e)}")

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.internal.partners.models import Veterinary
from pydantic import BaseModel, EmailStr
from app.auth import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta

router = APIRouter()

class VeterinaryLogin(BaseModel):
    email: EmailStr
    password: str

@router.post("/auth/login", tags=["Veterinary - Auth"])
def login_for_access_token(
    login_data: VeterinaryLogin,
    db: Session = Depends(get_db)
):
    """
    Login endpoint for Global Veterinary Portal.
    """
    vet = db.query(Veterinary).filter(
        Veterinary.email == login_data.email,
        Veterinary.is_active == True
    ).first()
    
    if not vet:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(login_data.password, vet.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(vet.id), "role": "veterinary_global", "slug": vet.slug},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "veterinary": {
            "id": vet.id,
            "name": vet.name,
            "slug": vet.slug,
            "email": vet.email
        }
    }

# --- Dependencies ---
from app.auth import oauth2_scheme, decode_access_token
from app import schemas, models
from app.api.internal.partners.models import PartnerLinkV2, PartnerCommission
from app.api.internal.common.models import Notification

def get_current_veterinary(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "veterinary_global":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión de veterinaria inválida",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    vet_id = int(payload.get("sub"))
    vet = db.query(Veterinary).filter(Veterinary.id == vet_id).first()
    if not vet:
        raise HTTPException(status_code=404, detail="Veterinaria no encontrada")
    return vet

# --- Consolidated Bootstrap ---
@router.get("/auth/bootstrap", response_model=schemas.VeterinaryBootstrapResponse, tags=["Veterinary - Auth"])
def get_bootstrap_veterinary(
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    """
    Consolidated bootstrap data for Veterinary Portal.
    Returns profile, linked tenants, and commissions in a single request.
    """
    # 1. Get Links (Tenants)
    links = db.query(PartnerLinkV2).filter(
        PartnerLinkV2.veterinary_id == current_vet.id,
        PartnerLinkV2.status == "active"
    ).all()
    
    # 2. Get Commissions (last 50)
    link_ids = [L.id for L in links]
    commissions = []
    total_pending = 0.0
    
    if link_ids:
        commissions = db.query(PartnerCommission).filter(
            PartnerCommission.partner_link_id.in_(link_ids)
        ).order_by(PartnerCommission.created_at.desc()).limit(50).all()
        
        # Calculate pending sum
        pending_res = db.query(models.func.sum(PartnerCommission.amount)).filter(
            PartnerCommission.partner_link_id.in_(link_ids),
            PartnerCommission.status == "pendiente"
        ).scalar()
        total_pending = float(pending_res) if pending_res else 0.0
        
    # 3. Notifications (Global for vet)
    notifications = db.query(Notification).filter(
        Notification.creator_only == True, # Assuming global notifications for partners are marked this way or similar
        Notification.is_read == False
    ).limit(10).all()

    return schemas.VeterinaryBootstrapResponse(
        user=schemas.BootstrapUserData(
            id=current_vet.id,
            email=current_vet.email,
            name=current_vet.name,
            role=models.UserRole.admin, # Placeholder as vets don't have standard roles
            is_active=current_vet.is_active,
            tenant_id=0,
            created_at=current_vet.created_at if hasattr(current_vet, 'created_at') else tz.get_now()
        ),
        veterinary=schemas.CreatorBootstrapVeterinary.model_validate(current_vet),
        links=[schemas.PartnerLinkResponse.model_validate(L) for L in links],
        commissions=[schemas.PartnerCommissionInDB.model_validate(c) for c in commissions],
        notifications=[schemas.NotificationInDB.model_validate(n) for n in notifications],
        metadata=schemas.BootstrapMetadata(
            unread_notifications=len(notifications),
            total_commission_pending=total_pending,
            active_links_count=len(links)
        )
    )

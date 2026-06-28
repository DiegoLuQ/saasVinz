from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.api.internal.partners.models import Veterinary, PartnerLinkV2 as PartnerLink, PartnerLinkStatus, PartnerCommission
from app.api.internal.partners.schemas import PartnerLinkResponse, CommissionListResponse
# from app.auth import get_current_user_id # REMOVED (Not exists)
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.auth import SECRET_KEY, ALGORITHM

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/veterinary/auth/login")

# --- Dependency to get Current Vet ---
def get_current_veterinary(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Veterinary:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role != "veterinary_global":
            raise HTTPException(status_code=401, detail="Invalid credentials or role")
    except JWTError:
         raise HTTPException(status_code=401, detail="Could not validate credentials")
         
    vet = db.query(Veterinary).filter(Veterinary.id == int(user_id)).first()
    if not vet:
        raise HTTPException(status_code=401, detail="Veterinary not found")
    return vet

# --- Endpoints ---

@router.get("/api/veterinary/dashboard/links", response_model=List[PartnerLinkResponse], tags=["Veterinary - Dashboard"])
def get_my_links(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    """
    Get all tenant links for this veterinary (Invited, Active, Rejected)
    """
    query = db.query(PartnerLink).options(
        joinedload(PartnerLink.tenant) # We might need Tenant info schema
    ).filter(
        PartnerLink.veterinary_id == current_vet.id
    )
    
    if status:
        query = query.filter(PartnerLink.status == status)
        
    return query.all()

@router.post("/api/veterinary/dashboard/links/{link_id}/accept", tags=["Veterinary - Dashboard"])
def accept_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    link = db.query(PartnerLink).filter(
        PartnerLink.id == link_id,
        PartnerLink.veterinary_id == current_vet.id
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")
        
    if link.status != PartnerLinkStatus.pending:
        raise HTTPException(status_code=400, detail="El vínculo no está pendiente")
        
    link.status = PartnerLinkStatus.active
    db.commit()
    return {"status": "accepted", "link_id": link.id}

@router.post("/api/veterinary/dashboard/links/{link_id}/reject", tags=["Veterinary - Dashboard"])
def reject_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    link = db.query(PartnerLink).filter(
        PartnerLink.id == link_id,
        PartnerLink.veterinary_id == current_vet.id
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")
        
    if link.status != PartnerLinkStatus.pending:
        raise HTTPException(status_code=400, detail="El vínculo no está pendiente")
        
    link.status = PartnerLinkStatus.rejected
    db.commit()
    return {"status": "rejected", "link_id": link.id}


# Reuse the commission logic but filtered for Vet
@router.get("/api/veterinary/dashboard/commissions", response_model=CommissionListResponse, tags=["Veterinary - Dashboard"])
def list_my_commissions(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    query = db.query(PartnerCommission).join(PartnerLink).filter(
        PartnerLink.veterinary_id == current_vet.id
    )

    if status and status not in ['all', 'todas']:
        query = query.filter(PartnerCommission.status == status)
    
    # Stats
    stats_query = db.query(PartnerCommission.status, PartnerCommission.amount).join(PartnerLink).filter(
         PartnerLink.veterinary_id == current_vet.id
    )

    stats_results = stats_query.all()
    
    total_paid = sum([amount or 0 for st, amount in stats_results if str(st.value).lower() == 'pagado'])
    total_pending = sum([amount or 0 for st, amount in stats_results if str(st.value).lower() == 'pendiente'])

    # Data
    commissions = query.options(
        joinedload(PartnerCommission.partner_link).joinedload(PartnerLink.tenant), # Load Tenant Name
        joinedload(PartnerCommission.cremation).joinedload(PartnerLink.veterinary), # Ensure loaded
        joinedload(PartnerCommission.cremation).joinedload(PartnerCommission.cremation.pet)
    ).order_by(PartnerCommission.created_at.desc()).offset(skip).limit(limit).all()
    
    rows = []
    for comm in commissions:
        # Resolve names
        pet_name = comm.cremation.pet.name if comm.cremation and comm.cremation.pet else "Mascota"
        
        # For Vet, partner_name should be the Tenant Name (the one paying)
        tenant_name = comm.partner_link.tenant.name if comm.partner_link and comm.partner_link.tenant else "Empresa"
        
        rows.append({
            "id": comm.id,
            "cremation_id": comm.cremation_id,
            "partner_id": comm.partner_link_id, 
            "partner_name": tenant_name, # REUSE field for Tenant Name in Vet View
            "amount": comm.amount,
            "status": comm.status,
            "created_at": comm.created_at,
            "pet_name": pet_name,
            "service_name": "Servicio",
            # Banking info not needed for self
            "partner_rut": None,
            "partner_email": None,
            "bank_name": None,
            "account_type": None,
            "account_number": None
        })

    return {
        "stats": {"total_paid": total_paid, "total_pending": total_pending},
        "rows": rows,
        "total": query.count()
    }

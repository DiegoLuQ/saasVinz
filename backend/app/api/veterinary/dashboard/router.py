from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.api.internal.partners.models import Veterinary, PartnerLinkV2 as PartnerLink, PartnerLinkStatus, PartnerCommission
from app.api.internal.partners.schemas import PartnerLinkResponse, CommissionListResponse
from pydantic import BaseModel, Field
from app import models
from app.api.veterinary.auth.router import get_current_veterinary  # sesión única del portal

router = APIRouter()

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
        joinedload(PartnerCommission.cremation).joinedload(models.Cremation.pet),
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


# --- Perfil de la veterinaria ---

class VeterinaryProfileUpdate(BaseModel):
    # El email es el usuario de acceso: no se cambia desde el portal.
    name: str = Field(..., min_length=2, max_length=120)
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=200)


@router.put("/api/veterinary/profile", tags=["Veterinary - Dashboard"])
def update_my_profile(
    data: VeterinaryProfileUpdate,
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    """Actualiza los datos de contacto de la clínica (nombre, teléfono, dirección)."""
    current_vet.name = data.name.strip()
    current_vet.phone = (data.phone or "").strip() or None
    current_vet.address = (data.address or "").strip() or None
    db.commit()
    db.refresh(current_vet)
    return {
        "id": current_vet.id,
        "name": current_vet.name,
        "email": current_vet.email,
        "phone": current_vet.phone,
        "address": current_vet.address,
    }

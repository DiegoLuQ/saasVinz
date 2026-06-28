from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload, aliased
from sqlalchemy import func, or_, and_
from typing import List, Optional
from app.database import get_db
from app.api.deps import get_tenant_id
from . import models, schemas
from app.api.internal.partners.models import Veterinary, PartnerLinkV2 as PartnerLink, PartnerCommission, PartnerLinkStatus, PartnerCommissionStatus
from app import auth
from app import models as main_models
from datetime import timedelta, datetime
from fastapi.security import OAuth2PasswordBearer

# --- Setup ---
router = APIRouter()

# ==========================================
# 🏨 TENANT ROUTER (Manage Linked Veterinaries)
# ==========================================

@router.get("/api/internal/partners/search", response_model=List[schemas.VeterinaryBase], tags=["Tenant - Partners"])
def search_global_veterinaries(
    q: str,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Search for global veterinaries to link.
    """
    if len(q) < 3:
        return []
        
    return db.query(Veterinary).filter(
        or_(
            Veterinary.name.ilike(f"%{q}%"),
            Veterinary.rut.ilike(f"%{q}%")
        ),
        Veterinary.is_active == True
    ).limit(10).all()

@router.get("/api/internal/partners/available", response_model=List[schemas.VeterinaryBase], tags=["Tenant - Partners"])
def get_available_partners(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    List non-linked veterinaries in the same Region/Country as the Tenant.
    """
    tenant = db.query(main_models.Tenant).filter(main_models.Tenant.id == tenant_id).first()
    if not tenant:
        return []

    # Get IDs of already linked vets
    linked_ids_query = db.query(PartnerLink.veterinary_id).filter(PartnerLink.tenant_id == tenant_id)
    
    # Query Vets: Same Country, Same Region (if exists), Not Linked
    query = db.query(Veterinary).filter(
        Veterinary.is_active == True,
        Veterinary.id.notin_(linked_ids_query)
    )

    if tenant.country:
        query = query.filter(Veterinary.country.ilike(tenant.country))
    
    # If tenant has region, try to match it. Flexible matching (ilike)
    if tenant.region:
        query = query.filter(Veterinary.region.ilike(f"%{tenant.region}%"))

    return query.limit(50).all()

@router.post("/api/internal/partners/link", response_model=schemas.PartnerLinkResponse, tags=["Tenant - Partners"])
def request_partner_link(
    link_data: schemas.PartnerLinkCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Tenant requests to link with a global Veterinary.
    """
    # Check if already linked
    existing = db.query(PartnerLink).filter(
        PartnerLink.tenant_id == tenant_id,
        PartnerLink.veterinary_id == link_data.veterinary_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un vínculo (activo o pendiente) con esta veterinaria.")

    # Get Vet to ensure it exists
    vet = db.query(Veterinary).filter(Veterinary.id == link_data.veterinary_id).first()
    if not vet:
        raise HTTPException(status_code=404, detail="Veterinaria no encontrada")

    # Create Link (Pending)
    # Generate unique public slug for this tenant-vet pair
    # Default to vet slug, but if taken in this tenant (?), wait, slug_publico is unique per tenant.
    # We try vet.slug first.
    slug_candidate = vet.slug
    
    # Check simple slug collision in this tenant (highly unlikely for vet.slug but just in case)
    collision = db.query(PartnerLink).filter(
        PartnerLink.tenant_id == tenant_id,
        PartnerLink.slug_publico == slug_candidate
    ).first()
    
    if collision:
        slug_candidate = f"{vet.slug}-{func.random_string(4)}" # Pseudo logic, or just fail

    new_link = PartnerLink(
        tenant_id=tenant_id,
        veterinary_id=link_data.veterinary_id,
        status=PartnerLinkStatus.pending, # Requires Vet Acceptance
        slug_publico=slug_candidate,
        tipo_comision=link_data.tipo_comision,
        monto_comision=link_data.monto_comision,
        porcentaje_comision=link_data.porcentaje_comision,

        bank_data_override=None
    )
    
    # TODO: Process link_data.referral_message (e.g., Send Email / Notification)
    if link_data.referral_message:
        # Placeholder for notification logic
        pass
    
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    return new_link

@router.get("/api/internal/partners", response_model=List[schemas.PartnerLinkResponse], tags=["Tenant - Partners"])
def list_my_partners(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    List all partners linked to this tenant (active and pending).
    """
    return db.query(PartnerLink).options(
        joinedload(PartnerLink.veterinary)
    ).filter(
        PartnerLink.tenant_id == tenant_id
    ).all()

@router.patch("/api/internal/partners/{link_id}", response_model=schemas.PartnerLinkResponse, tags=["Tenant - Partners"])
def update_partner_link(
    link_id: int,
    update_data: schemas.PartnerLinkUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    link = db.query(PartnerLink).filter(
        PartnerLink.id == link_id,
        PartnerLink.tenant_id == tenant_id
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")
        
    # Apply updates (Commission mainly)
    if update_data.tipo_comision:
        link.tipo_comision = update_data.tipo_comision
    if update_data.monto_comision is not None:
        link.monto_comision = update_data.monto_comision
    if update_data.porcentaje_comision is not None:
        link.porcentaje_comision = update_data.porcentaje_comision
        
    db.commit()
    db.refresh(link)
    return link

@router.delete("/api/internal/partners/{link_id}", status_code=204, tags=["Tenant - Partners"])
def unlink_partner(
    link_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    link = db.query(PartnerLink).filter(
        PartnerLink.id == link_id,
        PartnerLink.tenant_id == tenant_id
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")
        
    db.delete(link)
    db.commit()
    return None

# ==========================================
# 📊 COMMISSIONS DASHBOARD (Internal)
# ==========================================
# ... (Simulated migration of existing logic to use PartnerLink)

@router.get("/api/internal/partners/commissions", response_model=schemas.CommissionListResponse, tags=["Tenant - Commissions"])
def list_commissions(
    skip: int = 0,
    limit: int = 15,
    status: Optional[str] = None,
    partner_id: Optional[int] = None, # This is now LINK ID
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    query = db.query(PartnerCommission).join(PartnerLink).join(Veterinary).filter(
        PartnerLink.tenant_id == tenant_id
    )

    if status and status not in ['all', 'todas']:
        query = query.filter(PartnerCommission.status == status)
    
    if partner_id:
        query = query.filter(PartnerCommission.partner_link_id == partner_id)
        
    if search:
        query = query.filter(Veterinary.name.ilike(f"%{search}%"))

    # Stats
    stats_query = db.query(
        func.sum(PartnerCommission.amount).label("total_amount"),
        PartnerCommission.status
    ).join(PartnerLink).filter(
         PartnerLink.tenant_id == tenant_id
    )
    # ... filters apply similarly
    stats_results = stats_query.group_by(PartnerCommission.status).all()
    
    total_paid = sum([amount or 0 for amount, st in stats_results if str(st.value).lower() == 'pagado'])
    total_pending = sum([amount or 0 for amount, st in stats_results if str(st.value).lower() == 'pendiente'])

    # Data
    commissions = query.options(
        joinedload(PartnerCommission.partner_link).joinedload(PartnerLink.veterinary),
        joinedload(PartnerCommission.cremation).joinedload(main_models.CremationOC.pet),
        # ... other joins
    ).order_by(PartnerCommission.created_at.desc()).offset(skip).limit(limit).all()
    
    rows = []
    for comm in commissions:
        # Resolve names
        pet_name = comm.cremation.pet.name if comm.cremation and comm.cremation.pet else "Mascota"
        service = "Servicio" # Simplify logic properly
        
        rows.append({
            "id": comm.id,
            "cremation_id": comm.cremation_id,
            "partner_id": comm.partner_link_id, # Link ID
            "partner_name": comm.partner_link.veterinary.name, # Vet Name
            "amount": comm.amount,
            "status": comm.status,
            "created_at": comm.created_at,
            "pet_name": pet_name,
            "service_name": service,
            # Banking
            "partner_rut": comm.partner_link.veterinary.rut,
            "partner_email": comm.partner_link.veterinary.email,
            "bank_name": None, # Extract from JSON properly if needed
            "account_type": None,
            "account_number": None
        })

    return {
        "stats": {"total_paid": total_paid, "total_pending": total_pending},
        "rows": rows,
        "total": query.count()
    }

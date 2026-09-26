from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from datetime import datetime
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


# --- Mis derivaciones ---

# Estados canónicos de CremationOC (+ alias legacy) agrupados para la veterinaria.
_REFERRAL_STATUS = {
    "pendiente": ("recibido", "Recibido"), "pending": ("recibido", "Recibido"), "received": ("recibido", "Recibido"),
    "coordinado": ("coordinado", "Coordinado"),
    "en_proceso": ("en_proceso", "En proceso"), "processing": ("en_proceso", "En proceso"), "ready": ("en_proceso", "En proceso"),
    "entregado": ("entregado", "Entregado"), "delivered": ("entregado", "Entregado"),
    "completado": ("entregado", "Entregado"), "completed": ("entregado", "Entregado"),
    "cancelado": ("cancelado", "Cancelado"), "canceled": ("cancelado", "Cancelado"), "cancelled": ("cancelado", "Cancelado"),
}


def _referral_status(raw: Optional[str]) -> tuple:
    return _REFERRAL_STATUS.get((raw or "").strip().lower(), ("recibido", "Recibido"))


class ReferralItem(BaseModel):
    id: int
    oc_number: Optional[int] = None
    created_at: Optional[datetime] = None
    # Solo datos de la mascota: la veterinaria no necesita los del tutor.
    pet_name: Optional[str] = None
    pet_species: Optional[str] = None
    link_id: int
    tenant_name: str
    status: str          # recibido | coordinado | en_proceso | entregado | cancelado
    status_label: str
    etapa: Optional[str] = None   # etapa actual del flujo del crematorio
    commission_amount: Optional[float] = None
    commission_status: Optional[str] = None


class ReferralLinkSummary(BaseModel):
    link_id: int
    tenant_name: str
    derivaciones: int
    entregadas: int
    en_curso: int


class ReferralListResponse(BaseModel):
    items: List[ReferralItem]
    total: int
    summary: List[ReferralLinkSummary]


@router.get("/api/veterinary/dashboard/referrals", response_model=ReferralListResponse, tags=["Veterinary - Dashboard"])
def list_my_referrals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    link_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    """
    Servicios (órdenes de cremación) derivados por la veterinaria, más recientes
    primero, con un resumen por crematorio. Filtro opcional por vínculo.
    """
    links = db.query(PartnerLink).options(joinedload(PartnerLink.tenant)).filter(
        PartnerLink.veterinary_id == current_vet.id
    ).all()
    tenant_by_link = {L.id: (L.tenant.name if L.tenant else "Crematorio") for L in links}
    if not tenant_by_link:
        return ReferralListResponse(items=[], total=0, summary=[])
    if link_id is not None and link_id not in tenant_by_link:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")

    Cremation = models.Cremation
    base = db.query(Cremation).filter(Cremation.partner_link_id.in_(list(tenant_by_link)))

    # Resumen por crematorio (sobre todos los vínculos, sin el filtro de página).
    counts: dict = {}
    for lid, raw_status, n in (
        db.query(Cremation.partner_link_id, Cremation.status, func.count(Cremation.id))
        .filter(Cremation.partner_link_id.in_(list(tenant_by_link)))
        .group_by(Cremation.partner_link_id, Cremation.status)
        .all()
    ):
        key = _referral_status(raw_status)[0]
        c = counts.setdefault(lid, {"total": 0, "entregado": 0, "en_curso": 0})
        c["total"] += n
        if key == "entregado":
            c["entregado"] += n
        elif key != "cancelado":
            c["en_curso"] += n
    summary = [
        ReferralLinkSummary(
            link_id=lid, tenant_name=tenant_by_link[lid],
            derivaciones=counts.get(lid, {}).get("total", 0),
            entregadas=counts.get(lid, {}).get("entregado", 0),
            en_curso=counts.get(lid, {}).get("en_curso", 0),
        )
        for lid in tenant_by_link
    ]

    if link_id is not None:
        base = base.filter(Cremation.partner_link_id == link_id)
    total = base.count()
    rows = base.options(
        joinedload(Cremation.pet),
        joinedload(Cremation.technical).joinedload(models.CremationTechnical.step),
        joinedload(Cremation.commission),
    ).order_by(Cremation.created_at.desc(), Cremation.id.desc()).offset(skip).limit(limit).all()

    items = []
    for oc in rows:
        key, label = _referral_status(oc.status)
        step = oc.technical.step if oc.technical else None
        # La comisión puede pertenecer a OTRO vínculo: si la orden se reasignó a
        # otra veterinaria después de pagar, la comisión pagada queda con quien la
        # cobró (operations/services.py). Solo se muestra si es de este vínculo.
        comm = oc.commission if (oc.commission and oc.commission.partner_link_id == oc.partner_link_id) else None
        items.append(ReferralItem(
            id=oc.id,
            oc_number=oc.oc_number,
            created_at=oc.created_at,
            pet_name=oc.pet.name if oc.pet else None,
            pet_species=oc.pet.species if oc.pet else None,
            link_id=oc.partner_link_id,
            tenant_name=tenant_by_link.get(oc.partner_link_id, "Crematorio"),
            status=key,
            status_label=label,
            etapa=step.name if step else None,
            commission_amount=comm.amount if comm else None,
            commission_status=str(getattr(comm.status, "value", comm.status)) if comm else None,
        ))
    return ReferralListResponse(items=items, total=total, summary=summary)

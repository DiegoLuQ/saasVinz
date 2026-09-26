from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.api.internal.partners.models import Veterinary, PartnerLinkV2 as PartnerLink, PartnerLinkStatus, PartnerCommission
from app.api.internal.partners.schemas import PartnerLinkResponse
from pydantic import BaseModel, Field
from app import models
from fastapi import Response
from app.api.veterinary.auth.router import get_current_veterinary, issue_vet_session_token, set_vet_session_cookie  # sesión única del portal

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


# --- Comisiones de la veterinaria ---

class VetCommissionRow(BaseModel):
    id: int
    created_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    amount: float = 0.0
    amount_porcentaje: Optional[float] = None
    status: str  # pendiente | pagado | cancelado
    link_id: int
    tenant_name: str
    pet_name: Optional[str] = None
    oc_number: Optional[int] = None


class VetCommissionTotals(BaseModel):
    pendiente: float = 0.0
    pagado: float = 0.0
    count_pendiente: int = 0
    count_pagado: int = 0


class VetCommissionLinkSummary(VetCommissionTotals):
    link_id: int
    tenant_name: str


class VetCommissionListResponse(BaseModel):
    totals: VetCommissionTotals
    summary: List[VetCommissionLinkSummary]
    rows: List[VetCommissionRow]
    total: int


def _status_value(st) -> str:
    return str(getattr(st, "value", st) or "").lower()


@router.get("/api/veterinary/dashboard/commissions", response_model=VetCommissionListResponse, tags=["Veterinary - Dashboard"])
def list_my_commissions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    link_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    """
    Comisiones de la veterinaria (más recientes primero) con totales generales y
    por crematorio. Filtros: estado (pendiente | pagado | cancelado) y vínculo.
    """
    links = db.query(PartnerLink).options(joinedload(PartnerLink.tenant)).filter(
        PartnerLink.veterinary_id == current_vet.id
    ).all()
    tenant_by_link = {L.id: (L.tenant.name if L.tenant else "Crematorio") for L in links}
    if not tenant_by_link:
        return VetCommissionListResponse(totals=VetCommissionTotals(), summary=[], rows=[], total=0)
    if link_id is not None and link_id not in tenant_by_link:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")
    if status and status not in ("pendiente", "pagado", "cancelado", "all", "todas"):
        raise HTTPException(status_code=422, detail="Estado inválido")

    link_ids = list(tenant_by_link)

    # Totales generales y por crematorio (sin filtros de página).
    totals = VetCommissionTotals()
    per_link = {lid: VetCommissionLinkSummary(link_id=lid, tenant_name=tenant_by_link[lid]) for lid in link_ids}
    for lid, st, n, amount in (
        db.query(PartnerCommission.partner_link_id, PartnerCommission.status,
                 func.count(PartnerCommission.id), func.sum(PartnerCommission.amount))
        .filter(PartnerCommission.partner_link_id.in_(link_ids))
        .group_by(PartnerCommission.partner_link_id, PartnerCommission.status)
        .all()
    ):
        key = _status_value(st)
        if key not in ("pendiente", "pagado"):
            continue  # las canceladas no suman
        for target in (totals, per_link[lid]):
            setattr(target, key, getattr(target, key) + float(amount or 0))
            setattr(target, f"count_{key}", getattr(target, f"count_{key}") + int(n))

    query = db.query(PartnerCommission).filter(PartnerCommission.partner_link_id.in_(link_ids))
    if link_id is not None:
        query = query.filter(PartnerCommission.partner_link_id == link_id)
    if status and status not in ("all", "todas"):
        query = query.filter(PartnerCommission.status == status)

    total = query.count()
    commissions = query.options(
        joinedload(PartnerCommission.cremation).joinedload(models.Cremation.pet),
    ).order_by(PartnerCommission.created_at.desc(), PartnerCommission.id.desc()).offset(skip).limit(limit).all()

    rows = [
        VetCommissionRow(
            id=c.id,
            created_at=c.created_at,
            paid_at=c.paid_at,
            amount=c.amount or 0.0,
            amount_porcentaje=c.amount_porcentaje,
            status=_status_value(c.status),
            link_id=c.partner_link_id,
            tenant_name=tenant_by_link.get(c.partner_link_id, "Crematorio"),
            pet_name=c.cremation.pet.name if c.cremation and c.cremation.pet else None,
            oc_number=c.cremation.oc_number if c.cremation else None,
        )
        for c in commissions
    ]
    return VetCommissionListResponse(totals=totals, summary=list(per_link.values()), rows=rows, total=total)


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


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/api/veterinary/profile/password", tags=["Veterinary - Dashboard"])
def change_my_password(
    data: ChangePasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    """Cambia la contraseña del portal verificando la actual."""
    from app.auth import verify_password, get_password_hash
    if not verify_password(data.current_password, current_vet.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta.")
    if data.new_password == data.current_password:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser distinta de la actual.")
    current_vet.password_hash = get_password_hash(data.new_password)
    # Cierra las demás sesiones abiertas y mantiene viva la actual con un token nuevo.
    current_vet.token_version = (current_vet.token_version or 0) + 1
    db.commit()
    set_vet_session_cookie(response, issue_vet_session_token(current_vet))
    return {"detail": "Contraseña actualizada. Cerramos tus otras sesiones abiertas."}

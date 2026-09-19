from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload, aliased
from sqlalchemy import func, or_, and_
from typing import List, Optional
from app.database import get_db
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from . import models, schemas
from app.api.internal.partners.models import Veterinary, PartnerLinkV2 as PartnerLink, PartnerCommission, PartnerLinkStatus, PartnerCommissionStatus
from app import auth
from app import models as main_models
from datetime import timedelta, datetime
from app.utils import tz
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
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("veterinarios", "create"))
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

from app.api.internal.admin.models import Tenant

@router.post("/api/internal/partners/quick-create", response_model=schemas.PartnerLinkResponse, tags=["Tenant - Partners"])
def quick_create_partner(
    payload: schemas.QuickVeterinaryPartnerCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Permite al crematorio (tenant) registrar rápidamente una veterinaria aliada
    y crear su convenio directo (activo) con su % de comisión.
    """
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="El nombre de la veterinaria es obligatorio.")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    default_region = payload.region.strip() if payload.region else (tenant.region if tenant else None)
    default_country = tenant.country if (tenant and tenant.country) else "Chile"

    # Buscar si ya existe por RUT (si se provee) o por nombre exacto
    vet = None
    if payload.rut and payload.rut.strip():
        vet = db.query(Veterinary).filter(Veterinary.rut == payload.rut.strip()).first()
    if not vet:
        vet = db.query(Veterinary).filter(Veterinary.name.ilike(name_clean)).first()

    # Si no existe, crear la entidad Veterinary
    if not vet:
        import re, random, string
        base_slug = re.sub(r'[^a-z0-9]+', '-', name_clean.lower()).strip('-') or "vet"
        rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        unique_slug = f"{base_slug}-{rand_suffix}"

        dummy_pass = auth.get_password_hash("PartnerPass123*")
        vet = Veterinary(
            name=name_clean,
            rut=payload.rut.strip() if payload.rut else None,
            slug=unique_slug,
            email=payload.email.strip() if payload.email else f"{unique_slug}@partner.local",
            password_hash=dummy_pass,
            phone=payload.phone.strip() if payload.phone else None,
            address=payload.address.strip() if payload.address else None,
            city=payload.city.strip() if payload.city else None,
            region=default_region,
            country=default_country,
            is_active=True
        )
        db.add(vet)
        db.commit()
        db.refresh(vet)
    else:
        # Completar datos faltantes en la veterinaria si no los tenía
        if not vet.region and default_region:
            vet.region = default_region
        if payload.address and not vet.address:
            vet.address = payload.address.strip()
        if payload.city and not vet.city:
            vet.city = payload.city.strip()
        if payload.phone and not vet.phone:
            vet.phone = payload.phone.strip()
        db.commit()
        db.refresh(vet)

    # Verificar si ya existe un convenio entre este tenant y la veterinaria
    existing_link = db.query(PartnerLink).filter(
        PartnerLink.tenant_id == tenant_id,
        PartnerLink.veterinary_id == vet.id
    ).first()

    if existing_link:
        # Actualizar comisiones si ya existía
        existing_link.tipo_comision = payload.tipo_comision
        existing_link.porcentaje_comision = payload.porcentaje_comision
        existing_link.monto_comision = payload.monto_comision
        existing_link.status = PartnerLinkStatus.active
        db.commit()
        db.refresh(existing_link)
        return existing_link

    # Generar slug público del vínculo para este tenant
    link_slug = f"{vet.slug}-{tenant_id}"
    new_link = PartnerLink(
        tenant_id=tenant_id,
        veterinary_id=vet.id,
        status=PartnerLinkStatus.active,
        slug_publico=link_slug,
        tipo_comision=payload.tipo_comision,
        monto_comision=payload.monto_comision,
        porcentaje_comision=payload.porcentaje_comision
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    return new_link

@router.get("/api/internal/partners/active-options", response_model=List[schemas.ActivePartnerOption], tags=["Tenant - Partners"])
def get_active_partner_options(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Lista liviana de veterinarias con convenio para el selector de la orden de cremación.
    """
    links = db.query(PartnerLink).options(
        joinedload(PartnerLink.veterinary)
    ).filter(
        PartnerLink.tenant_id == tenant_id,
        PartnerLink.status == PartnerLinkStatus.active
    ).all()

    options = []
    for l in links:
        if l.veterinary and l.veterinary.is_active:
            options.append(schemas.ActivePartnerOption(
                id=l.id,
                veterinary_id=l.veterinary_id,
                name=l.veterinary.name,
                rut=l.veterinary.rut,
                tipo_comision=l.tipo_comision or "porcentaje",
                porcentaje_comision=l.porcentaje_comision or 0.0,
                monto_comision=l.monto_comision or 0.0
            ))
    return options

@router.get("/api/internal/partners", response_model=List[schemas.PartnerLinkResponse], tags=["Tenant - Partners"])
def list_my_partners(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("veterinarios", "view"))
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
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("veterinarios", "edit"))
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
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("veterinarios", "delete"))
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

def _serialize_commission(comm: PartnerCommission) -> dict:
    pet_name = comm.cremation.pet.name if comm.cremation and comm.cremation.pet else "Mascota"
    service_name = (comm.cremation.cremation_type if comm.cremation and comm.cremation.cremation_type else None) or "Servicio Cremación"
    order_total = (comm.cremation.financial.total_price if comm.cremation and comm.cremation.financial else 0.0) or 0.0
    
    link = comm.partner_link
    vet = link.veterinary if link else None
    b_data = (link.bank_data_override if link and link.bank_data_override else None) or (vet.bank_data if vet and vet.bank_data else None) or {}
    if not isinstance(b_data, dict):
        b_data = {}

    status_str = getattr(comm.status, "value", str(comm.status))

    return {
        "id": comm.id,
        "cremation_id": comm.cremation_id,
        "partner_id": comm.partner_link_id,
        "partner_name": vet.name if vet else "Veterinaria",
        "amount": comm.amount or 0.0,
        "amount_porcentaje": comm.amount_porcentaje or 0.0,
        "order_total": order_total,
        "status": status_str,
        "paid_at": comm.paid_at,
        "notes": comm.notes,
        "created_at": comm.created_at,
        "pet_name": pet_name,
        "service_name": service_name,
        "partner_rut": vet.rut if vet else None,
        "partner_email": vet.email if vet else None,
        "bank_name": b_data.get("banco") or b_data.get("bank_name"),
        "account_type": b_data.get("tipo_cuenta") or b_data.get("account_type"),
        "account_number": b_data.get("numero_cuenta") or b_data.get("account_number"),
        "rut_titular": b_data.get("rut_titular") or b_data.get("rut") or (vet.rut if vet else None),
        "nombre_titular": b_data.get("titular") or b_data.get("nombre_titular") or (vet.name if vet else None),
    }

@router.get("/api/internal/partners/commissions", response_model=schemas.CommissionListResponse, tags=["Tenant - Commissions"])
def list_commissions(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    partner_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("veterinarios", "view"))
):
    query = db.query(PartnerCommission).join(PartnerLink).join(Veterinary).filter(
        PartnerLink.tenant_id == tenant_id
    )

    if status and status not in ['all', 'todas', 'todos']:
        query = query.filter(PartnerCommission.status == status)
    
    if partner_id:
        query = query.filter(PartnerCommission.partner_link_id == partner_id)
        
    if search:
        search_fmt = f"%{search}%"
        query = query.outerjoin(main_models.CremationOC, PartnerCommission.cremation_id == main_models.CremationOC.id)\
                     .outerjoin(main_models.Pet, main_models.CremationOC.pet_id == main_models.Pet.id)\
                     .filter(
                         or_(
                             Veterinary.name.ilike(search_fmt),
                             Veterinary.rut.ilike(search_fmt),
                             main_models.Pet.name.ilike(search_fmt)
                         )
                     )

    # Stats
    stats_results = db.query(
        func.sum(PartnerCommission.amount).label("total_amount"),
        func.count(PartnerCommission.id).label("count_items"),
        PartnerCommission.status
    ).join(PartnerLink).filter(
        PartnerLink.tenant_id == tenant_id
    ).group_by(PartnerCommission.status).all()
    
    total_paid = 0.0
    total_pending = 0.0
    count_paid = 0
    count_pending = 0
    
    for amount, cnt, st in stats_results:
        st_val = str(getattr(st, 'value', st)).lower()
        if st_val == 'pagado':
            total_paid += (amount or 0.0)
            count_paid += (cnt or 0)
        elif st_val == 'pendiente':
            total_pending += (amount or 0.0)
            count_pending += (cnt or 0)

    total_count = query.count()

    commissions = query.options(
        joinedload(PartnerCommission.partner_link).joinedload(PartnerLink.veterinary),
        joinedload(PartnerCommission.cremation).joinedload(main_models.CremationOC.pet),
        joinedload(PartnerCommission.cremation).joinedload(main_models.CremationOC.financial),
    ).order_by(PartnerCommission.created_at.desc()).offset(skip).limit(limit).all()
    
    rows = [_serialize_commission(c) for c in commissions]

    return {
        "stats": {
            "total_paid": total_paid,
            "total_pending": total_pending,
            "count_paid": count_paid,
            "count_pending": count_pending
        },
        "rows": rows,
        "total": total_count
    }

@router.patch("/api/internal/partners/commissions/{commission_id}/pay", response_model=schemas.CommissionSchema, tags=["Tenant - Commissions"])
def pay_commission(
    commission_id: int,
    payload: Optional[schemas.PayCommissionPayload] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("veterinarios", "edit"))
):
    comm = db.query(PartnerCommission).options(
        joinedload(PartnerCommission.partner_link).joinedload(PartnerLink.veterinary),
        joinedload(PartnerCommission.cremation).joinedload(main_models.CremationOC.pet),
        joinedload(PartnerCommission.cremation).joinedload(main_models.CremationOC.financial),
    ).join(PartnerLink).filter(
        PartnerCommission.id == commission_id,
        PartnerLink.tenant_id == tenant_id
    ).first()
    
    if not comm:
        raise HTTPException(status_code=404, detail="Comisión no encontrada")
        
    comm.status = PartnerCommissionStatus.pagado
    comm.paid_at = tz.get_now()
    if payload and payload.notes:
        comm.notes = payload.notes
        
    db.commit()
    db.refresh(comm)
    return _serialize_commission(comm)

@router.patch("/api/internal/partners/commissions/{commission_id}/unpay", response_model=schemas.CommissionSchema, tags=["Tenant - Commissions"])
def unpay_commission(
    commission_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("veterinarios", "edit"))
):
    comm = db.query(PartnerCommission).options(
        joinedload(PartnerCommission.partner_link).joinedload(PartnerLink.veterinary),
        joinedload(PartnerCommission.cremation).joinedload(main_models.CremationOC.pet),
        joinedload(PartnerCommission.cremation).joinedload(main_models.CremationOC.financial),
    ).join(PartnerLink).filter(
        PartnerCommission.id == commission_id,
        PartnerLink.tenant_id == tenant_id
    ).first()
    
    if not comm:
        raise HTTPException(status_code=404, detail="Comisión no encontrada")
        
    comm.status = PartnerCommissionStatus.pendiente
    comm.paid_at = None
        
    db.commit()
    db.refresh(comm)
    return _serialize_commission(comm)

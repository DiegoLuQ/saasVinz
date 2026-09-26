from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from sqlalchemy import or_
from app import models
from app.api.internal.partners.models import Veterinary, PartnerLinkV2
from app.core.tenant_context import apply_bypass_rls
from pydantic import BaseModel, EmailStr
from app.auth import get_password_hash, get_current_creator
from typing import Optional
from datetime import datetime

# --- Schemas (inline for simplicity, or could be in schemas.py) ---
class VeterinaryCreate(BaseModel):
    name: str
    rut: str
    slug: str
    email: EmailStr
    password: str # Initial password
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = "Chile"
    phone: Optional[str] = None

class VeterinaryUpdate(BaseModel):
    name: str
    rut: str
    slug: str
    email: EmailStr
    password: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = True

class VeterinaryResponse(BaseModel):
    id: int
    name: str
    rut: str
    slug: str
    email: str
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = "Chile"
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class VeterinaryCrematorio(BaseModel):
    """Crematorio (tenant) asociado a una veterinaria vía ptn_partner_links."""
    tenant_id: int
    tenant_name: str
    status: str  # pending | active | rejected

class VeterinaryListItem(VeterinaryResponse):
    # Relación N:M: una veterinaria puede tener varios crematorios y viceversa.
    crematorios: List[VeterinaryCrematorio] = []

class VeterinaryListResponse(BaseModel):
    items: List[VeterinaryListItem]
    total: int

# Todo el router es exclusivo del SuperAdmin (creator). Antes no tenía ninguna
# dependencia de auth: cualquiera podía listar, crear, editar (incluida la
# contraseña) o eliminar veterinarias.
router = APIRouter(dependencies=[Depends(get_current_creator)])

# --- Endpoints ---

@router.post("/api/internal/creator/veterinaries", response_model=VeterinaryResponse, tags=["Creator - Veterinaries"])
def create_veterinary(
    vet_data: VeterinaryCreate,
    db: Session = Depends(get_db)
):
    """
    SaaS Creator creates a new Global Veterinary Entity.
    """
    # Check duplicates
    if db.query(Veterinary).filter(Veterinary.rut == vet_data.rut).first():
        raise HTTPException(status_code=400, detail="Ya existe una veterinaria con este RUT")
    
    if db.query(Veterinary).filter(Veterinary.email == vet_data.email).first():
        raise HTTPException(status_code=400, detail="Ya existe una veterinaria con este Email")

    if db.query(Veterinary).filter(Veterinary.slug == vet_data.slug).first():
        raise HTTPException(status_code=400, detail="Ya existe una veterinaria con este Slug")

    # Hash Password
    pwd_hash = get_password_hash(vet_data.password)

    new_vet = Veterinary(
        name=vet_data.name,
        rut=vet_data.rut,
        slug=vet_data.slug,
        email=vet_data.email,
        password_hash=pwd_hash,
        address=vet_data.address,
        city=vet_data.city,
        region=vet_data.region,
        country=vet_data.country or "Chile",
        phone=vet_data.phone,
        is_active=True
    )
    
    db.add(new_vet)
    db.commit()
    db.refresh(new_vet)
    return new_vet

@router.get("/api/internal/creator/veterinaries", response_model=VeterinaryListResponse, tags=["Creator - Veterinaries"])
def list_veterinaries(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Listado paginado de veterinarias (más recientes primero) con los
    crematorios asociados a cada una. Búsqueda por nombre o RUT.
    """
    # ptn_partner_links es una tabla de tenant (RLS): el SuperAdmin la lee completa.
    apply_bypass_rls(db)

    query = db.query(Veterinary)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(Veterinary.name.ilike(term), Veterinary.rut.ilike(term)))

    total = query.count()
    vets = query.order_by(Veterinary.created_at.desc(), Veterinary.id.desc()).offset(skip).limit(limit).all()

    # Una sola consulta para los vínculos de la página (evita N+1).
    by_vet: dict[int, List[VeterinaryCrematorio]] = {v.id: [] for v in vets}
    if vets:
        rows = (
            db.query(PartnerLinkV2.veterinary_id, PartnerLinkV2.tenant_id, PartnerLinkV2.status, models.Tenant.name)
            .join(models.Tenant, models.Tenant.id == PartnerLinkV2.tenant_id)
            .filter(PartnerLinkV2.veterinary_id.in_(list(by_vet)))
            .order_by(models.Tenant.name)
            .all()
        )
        for vet_id, tenant_id, status, tenant_name in rows:
            by_vet[vet_id].append(VeterinaryCrematorio(
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                status=getattr(status, "value", status) or "pending",
            ))

    items = [
        VeterinaryListItem(**VeterinaryResponse.model_validate(v).model_dump(), crematorios=by_vet[v.id])
        for v in vets
    ]
    return VeterinaryListResponse(items=items, total=total)

@router.get("/api/internal/creator/veterinaries/{vet_id}", response_model=VeterinaryResponse, tags=["Creator - Veterinaries"])
def get_veterinary(
    vet_id: int,
    db: Session = Depends(get_db)
):
    """
    SaaS Creator gets a single Global Veterinary Entity.
    """
    vet = db.query(Veterinary).filter(Veterinary.id == vet_id).first()
    if not vet:
        raise HTTPException(status_code=404, detail="Veterinaria no encontrada")
    return vet

@router.put("/api/internal/creator/veterinaries/{vet_id}", response_model=VeterinaryResponse, tags=["Creator - Veterinaries"])
def update_veterinary(
    vet_id: int,
    vet_data: VeterinaryUpdate,
    db: Session = Depends(get_db)
):
    """
    SaaS Creator updates an existing Global Veterinary Entity.
    """
    vet = db.query(Veterinary).filter(Veterinary.id == vet_id).first()
    if not vet:
        raise HTTPException(status_code=404, detail="Veterinaria no encontrada")

    # Check for duplicates (excluding current vet)
    if db.query(Veterinary).filter(Veterinary.rut == vet_data.rut, Veterinary.id != vet_id).first():
        raise HTTPException(status_code=400, detail="Ya existe otra veterinaria con este RUT")
    
    if db.query(Veterinary).filter(Veterinary.email == vet_data.email, Veterinary.id != vet_id).first():
        raise HTTPException(status_code=400, detail="Ya existe otra veterinaria con este Email")

    if db.query(Veterinary).filter(Veterinary.slug == vet_data.slug, Veterinary.id != vet_id).first():
        raise HTTPException(status_code=400, detail="Ya existe otra veterinaria con este Slug")

    # Update fields
    vet.name = vet_data.name
    vet.rut = vet_data.rut
    vet.slug = vet_data.slug
    vet.email = vet_data.email
    vet.address = vet_data.address
    vet.city = vet_data.city
    vet.region = vet_data.region
    if vet_data.country is not None:
        vet.country = vet_data.country
    vet.phone = vet_data.phone
    
    if vet_data.is_active is not None:
        vet.is_active = vet_data.is_active
    
    # Only update password if provided and different (simplified logic for now, usually we check emptiness)
    # Ideally should separate password update, but for now we follow the simple structure.
    # Note: frontend might send empty password if not changing it.
    if vet_data.password and len(vet_data.password) >= 6:
         vet.password_hash = get_password_hash(vet_data.password)

    db.commit()
    db.refresh(vet)
    return vet

@router.delete("/api/internal/creator/veterinaries/{vet_id}", tags=["Creator - Veterinaries"])
def delete_veterinary(
    vet_id: int,
    db: Session = Depends(get_db)
):
    """
    SaaS Creator deletes a Global Veterinary Entity.
    """
    vet = db.query(Veterinary).filter(Veterinary.id == vet_id).first()
    if not vet:
        raise HTTPException(status_code=404, detail="Veterinaria no encontrada")

    db.delete(vet)
    db.commit()
    return {"message": "Veterinaria eliminada correctamente"}

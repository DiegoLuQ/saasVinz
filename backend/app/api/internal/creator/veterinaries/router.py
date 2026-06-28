from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.internal.partners.models import Veterinary
from pydantic import BaseModel, EmailStr
from app.auth import get_password_hash
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

router = APIRouter()

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

@router.get("/api/internal/creator/veterinaries", response_model=List[VeterinaryResponse], tags=["Creator - Veterinaries"])
def list_veterinaries(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Veterinary)
    
    if search:
        query = query.filter(Veterinary.name.ilike(f"%{search}%"))
        
    return query.offset(skip).limit(limit).all()

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

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.api.internal.partners.models import PartnerLinkV2 as PartnerLink, PartnerLinkStatus, Veterinary

router = APIRouter()

@router.get("/partners/{tenant_slug}/{partner_slug}")
async def get_partner_by_slug(
    tenant_slug: str,
    partner_slug: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to resolve a partner slug to partner information.
    Used by the public form to identify which partner is sending the submission.
    """
    # Find tenant by slug
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Find active partner by slug
    # Updated for PartnerLinkV2
    partner_link = db.query(PartnerLink).filter(
        PartnerLink.tenant_id == tenant.id,
        PartnerLink.slug_publico == partner_slug,
        PartnerLink.status == PartnerLinkStatus.active
    ).first()
    
    if not partner_link:
        raise HTTPException(status_code=404, detail="Partner no encontrado o inactivo")
    
    # Needs to return Vet info
    # We load veterinary if not lazy loaded (though default lazy is fine here we access it)
    return {
        "id_partner": partner_link.id, # Used by frontend as ID
        "nombre_clinica": partner_link.veterinary.name,
        "slug_publico": partner_link.slug_publico
    }

@router.get("/partners/{tenant_slug}")
async def list_tenant_partners(
    tenant_slug: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to list all active partners for a tenant.
    Used by the public form to show a dropdown of referring veterinaries.
    """
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    partners = db.query(PartnerLink).filter(
        PartnerLink.tenant_id == tenant.id,
        PartnerLink.status == PartnerLinkStatus.active
    ).all()
    
    return [
        {
            "id": p.id,
            "name": p.veterinary.name,
            "slug": p.slug_publico
        } for p in partners
    ]

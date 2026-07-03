from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from app import schemas
from app.core.rate_limiter import limiter
from datetime import datetime
from typing import List, Optional

router = APIRouter()

# Mensaje único para cualquier fallo de resolución: no revelar si el código
# existe, si el formato es válido, ni a qué tenant pertenece.
_RESOLVE_NOT_FOUND = "No encontramos un seguimiento con ese código"


@router.get("/resolve/{code}")
@limiter.limit("10/minute")
def resolve_tracking_code(request: Request, code: str, db: Session = Depends(get_db)):
    """
    Resuelve un código de seguimiento a (slug, pet_name) para la web pública de
    tracking, donde la familia solo ingresa el código.

    Acepta verification_code (10 chars), tracking_token (UUID) o el código de una
    solicitud de formulario pendiente. La búsqueda es entre todos los crematorios
    (bypass RLS) porque estos identificadores son únicos globalmente.
    """
    from app.core.tenant_context import apply_bypass_rls

    code = (code or "").strip()
    if not code:
        raise HTTPException(status_code=404, detail=_RESOLVE_NOT_FOUND)

    # Búsqueda cross-tenant: los códigos son únicos a nivel global.
    apply_bypass_rls(db)

    cremation = db.query(models.Cremation).outerjoin(
        models.CremationDetails, models.Cremation.id == models.CremationDetails.cremation_id
    ).filter(
        or_(
            models.Cremation.verification_code == code,
            models.CremationDetails.tracking_token == code,
        )
    ).first()

    if cremation:
        tenant = db.query(models.Tenant).filter(models.Tenant.id == cremation.tenant_id).first()
        pet = db.query(models.Pet).filter(models.Pet.id == cremation.pet_id).first()
        if tenant and pet:
            return {"tenant_slug": tenant.slug, "pet_name": pet.name, "code": code}

    # Solicitud de formulario pendiente (aún sin orden creada)
    submission = db.query(models.FormSubmission).filter(
        models.FormSubmission.code == code
    ).first()
    if submission:
        tenant = db.query(models.Tenant).filter(models.Tenant.id == submission.tenant_id).first()
        pet_data = submission.pet_data or {}
        pet_name = (pet_data.get("name") or "mascota").strip()
        if tenant:
            return {"tenant_slug": tenant.slug, "pet_name": pet_name, "code": code}

    raise HTTPException(status_code=404, detail=_RESOLVE_NOT_FOUND)


@router.get("/{slug}/{pet_name}/{token}", response_model=schemas.PublicTrackingResponse)
@limiter.limit("30/minute")
def get_tracking_info(
    request: Request,
    slug: str,
    pet_name: str,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Obtiene información de seguimiento utilizando Token Seguro + Slug + Nombre Mascota.
    """
    # 1. Validar Tenant por Slug
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Crematorio no encontrado")

    # Configurar tenant_id en la sesión para que RLS permita leer las tablas del inquilino
    from app.core.tenant_context import apply_tenant_rls
    apply_tenant_rls(db, tenant.id)

    # 2. Buscar Cremación por Token (vía tabla oc_details) o por verification_code.
    #    Los enlaces de seguimiento generados por el frontend usan el
    #    verification_code (10 chars), mientras que el tracking_token es un UUID.
    #    Aceptamos ambos para que cualquier enlace válido funcione.
    cremation = db.query(models.Cremation).outerjoin(
        models.CremationDetails, models.Cremation.id == models.CremationDetails.cremation_id
    ).options(
        joinedload(models.Cremation.technical),
        joinedload(models.Cremation.evidence),
        joinedload(models.Cremation.details)
    ).filter(
        models.Cremation.tenant_id == tenant.id,
        or_(
            models.CremationDetails.tracking_token == token,
            models.Cremation.verification_code == token
        )
    ).first()

    if not cremation:
        # Buscar si es una solicitud de formulario pendiente (FormSubmission)
        submission = db.query(models.FormSubmission).filter(
            models.FormSubmission.code == token,
            models.FormSubmission.tenant_id == tenant.id
        ).first()

        if not submission:
            raise HTTPException(status_code=404, detail="Información de seguimiento no encontrada")

        # Validar Nombre de Mascota (Seguridad)
        pet_data = submission.pet_data or {}
        pet_name_db = pet_data.get("name", "").strip()
        normalized_url_name = pet_name.lower().strip().replace("-", " ")
        normalized_db_name = pet_name_db.lower().strip()

        if normalized_url_name not in normalized_db_name and normalized_db_name not in normalized_url_name:
             raise HTTPException(status_code=404, detail="No se encontró información para esta mascota")

        # Construir línea de tiempo simulada usando los pasos de flujo del tenant
        steps = db.query(models.WorkflowStep).filter(
            models.WorkflowStep.tenant_id == tenant.id,
            models.WorkflowStep.is_active == True
        ).order_by(models.WorkflowStep.order_index).all()

        timeline_events = []
        for idx, step in enumerate(steps):
            event_status = "current" if idx == 0 else "pending"
            completed_at = submission.created_at if idx == 0 else None

            timeline_events.append(schemas.TrackingTimelineEvent(
                step_name=step.name,
                status=event_status,
                completed_at=completed_at,
                evidence=None
            ))

        pet_image_url = None
        if submission.images and isinstance(submission.images, list) and len(submission.images) > 0:
            pet_image_url = submission.images[0]

        raw_breed = pet_data.get("breed")
        pet_breed = None if not raw_breed or str(raw_breed).strip().upper() == "N/A" else raw_breed

        owner_data = submission.owner_data or {}
        owner_name = owner_data.get("fullName") or owner_data.get("name") or None

        return schemas.PublicTrackingResponse(
            pet_name=pet_name_db,
            pet_species=pet_data.get("type") or pet_data.get("species") or "Canino",
            pet_breed=pet_breed,
            pet_image_url=pet_image_url,
            pet_weight=float(pet_data.get("weight")) if pet_data.get("weight") else None,
            customer_name=owner_name,
            service_status="pending",
            timeline=timeline_events,
            tenant_name=tenant.name,
            tenant_logo=tenant.logo_url
        )

    # 3. Validar Nombre de Mascota (Seguridad Adicional + UX)
    # Buscamos la mascota asociada
    pet = db.query(models.Pet).filter(models.Pet.id == cremation.pet_id).first()
    
    if not pet:
         raise HTTPException(status_code=404, detail="Datos de mascota no encontrados")

    # Normalizar nombres para comparación (ignorar mayúsculas/espacios extra)
    normalized_url_name = pet_name.lower().strip().replace("-", " ")
    normalized_db_name = pet.name.lower().strip()

    # Permitir coincidencia aproximada o exacta? 
    # Por ahora exacta (con normalización simple) para evitar fishing
    if normalized_url_name not in normalized_db_name and normalized_db_name not in normalized_url_name:
         # Si no coinciden, damos 404 para no revelar que el token es válido
         raise HTTPException(status_code=404, detail="No se encontró información para esta mascota")


    # Construir Timeline (Lógica existente reutilizada)
    steps = db.query(models.WorkflowStep).filter(
        models.WorkflowStep.tenant_id == tenant.id,
        models.WorkflowStep.is_active == True
    ).order_by(models.WorkflowStep.order_index).all()
    
    evidence_map = {ev.step_id: ev for ev in cremation.evidence} 
    
    timeline_events = []
    
    current_step_id = cremation.technical.step_id if cremation.technical else None
    current_step_index = -1
    
    for idx, s in enumerate(steps):
        if s.id == current_step_id:
            current_step_index = idx
            break
            
    is_order_finished = cremation.status == "delivered" or (cremation.status == "entregado" or cremation.status == "delivered") # Handle both enum values if mixed
    
    for idx, step in enumerate(steps):
        event_status = "pending"
        
        if is_order_finished:
            event_status = "completed"
        elif current_step_id:
            if idx < current_step_index:
                event_status = "completed"
            elif idx == current_step_index:
                event_status = "current"
            else:
                event_status = "pending"
        else:
            if step.id in evidence_map:
                 event_status = "completed"
            elif idx == 0:
                 event_status = "current"
            
        ev_data = None
        if step.id in evidence_map:
            db_ev = evidence_map[step.id]
            ev_data = schemas.OrderEvidenceInDB.model_validate(db_ev) 
            
        # Extract metadata timestamp
        tech = cremation.technical
        meta_timestamp = None
        if tech and tech.timeline:
             step_meta = tech.timeline.get(str(step.id))
             if step_meta and "completed_at" in step_meta:
                 meta_timestamp = datetime.fromisoformat(step_meta["completed_at"])
        # No timeline_metadata in main table anymore
        pass

        timeline_events.append(schemas.TrackingTimelineEvent(
            step_name=step.name,
            status=event_status,
            completed_at=meta_timestamp, 
            evidence=ev_data
        ))
    
    owner_name = pet.customer.name if pet.customer else None

    return schemas.PublicTrackingResponse(
        pet_name=pet.name,
        pet_species=pet.species,
        pet_breed=pet.breed,
        pet_image_url=pet.image_url,
        pet_weight=cremation.weight,
        customer_name=owner_name,
        service_status=cremation.status,
        timeline=timeline_events,
        tenant_name=tenant.name,
        tenant_logo=tenant.logo_url
    )

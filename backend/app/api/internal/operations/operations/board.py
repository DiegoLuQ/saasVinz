"""Helpers del Panel de Trabajo del operador (tablero de operaciones).

Centraliza los grupos de estado, la query base con sus joins y la conversión a
DailyOrderSchema, que antes estaban duplicados entre /ops/daily-orders y
get_enriched_order.
"""
from datetime import datetime
from typing import Optional

import pytz
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app import models
from app import schemas

# Grupos de estado (incluyen alias legacy en inglés)
NOT_STARTED_STATUSES = ["pending", "approved", "received", "pendiente", "recibido", "coordinado"]
IN_PROGRESS_STATUSES = ["processing", "en_proceso", "ready", "listo"]
ACTIVE_STATUSES = NOT_STARTED_STATUSES + IN_PROGRESS_STATUSES
FINAL_STATUSES = ["completed", "delivered", "completado", "entregado"]
CANCELED_STATUSES = ["cancelado", "canceled", "cancelled", "rejected", "rechazado", "rechazado_por_cliente"]

OPS_ROLES = [
    models.UserRole.admin,
    models.UserRole.driver,
    models.UserRole.operator,
    models.UserRole.operador_cremacion,
    models.UserRole.creator,
]


def tenant_tz(db: Session, tenant_id: int):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    try:
        return pytz.timezone(tenant.timezone if tenant and tenant.timezone else "America/Santiago")
    except pytz.UnknownTimeZoneError:
        return pytz.timezone("America/Santiago")


def scheduled_expr():
    """Fecha operativa de la orden: la programada o, si no hay, la de creación."""
    return func.coalesce(models.CremationScheduling.scheduled_at, models.Cremation.created_at)


def base_query(db: Session, tenant_id: int):
    return db.query(
        models.Cremation,
        models.Pet,
        models.Customer,
        models.Tenant,
        models.PartnerLink,
        models.Veterinary,
    ).options(
        selectinload(models.Cremation.evidence),
        joinedload(models.Cremation.technical),
        joinedload(models.Cremation.logistics),
        joinedload(models.Cremation.details),
        joinedload(models.Cremation.scheduling),
    ).join(
        models.Pet, models.Cremation.pet_id == models.Pet.id
    ).join(
        models.Customer, models.Pet.customer_id == models.Customer.id
    ).join(
        models.Tenant, models.Cremation.tenant_id == models.Tenant.id
    ).outerjoin(
        models.PartnerLink, models.Cremation.partner_link_id == models.PartnerLink.id
    ).outerjoin(
        models.Veterinary, models.PartnerLink.veterinary_id == models.Veterinary.id
    ).outerjoin(
        models.CremationScheduling, models.CremationScheduling.cremation_id == models.Cremation.id
    ).outerjoin(
        models.CremationTechnical, models.CremationTechnical.cremation_id == models.Cremation.id
    ).filter(
        models.Cremation.tenant_id == tenant_id
    )


def _parse_iso(value) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return pytz.utc.localize(dt) if dt.tzinfo is None else dt


def has_step_evidence(cremation: models.Cremation, step_id: Optional[int]) -> bool:
    return bool(step_id) and any(e.step_id == step_id for e in (cremation.evidence or []))


def to_daily_order(row, tzinfo) -> schemas.DailyOrderSchema:
    crem, pet, cust, tenant, partner_link, veterinary = row
    tech = crem.technical
    timeline = (tech.timeline if tech else None) or {}

    converted_metadata = {}
    completed_times = []
    for step_id, step_data in timeline.items():
        completed = _parse_iso(step_data.get("completed_at")) if isinstance(step_data, dict) else None
        if completed:
            completed_times.append(completed)
            converted_metadata[step_id] = {
                **step_data,
                "completed_at_formatted": completed.astimezone(tzinfo).strftime("%d-%m-%Y, %H:%M"),
            }
        else:
            converted_metadata[step_id] = step_data

    # La fase actual empezó cuando terminó la anterior; si es la primera, al iniciar la orden
    step_started_at = None
    if tech and tech.step_id:
        step_started_at = max(completed_times) if completed_times else tech.start_at

    display_address = (crem.logistics.address if crem.logistics else None) or cust.address

    return schemas.DailyOrderSchema(
        id=crem.id,
        oc_number=crem.oc_number,
        verification_code=crem.verification_code,
        pet_id=pet.id,
        pet_name=pet.name,
        pet_breed=pet.breed,
        pet_species=pet.species,
        customer_id=cust.id,
        customer_name=cust.name,
        customer_address=display_address,
        customer_phone=cust.phone,
        customer_email=cust.email,
        tenant_public_token=tenant.public_token,
        tenant_slug=tenant.slug,
        tracking_token=crem.details.tracking_token if crem.details else None,
        timeline_metadata=converted_metadata,
        current_step_id=tech.step_id if tech else None,
        status=crem.status,
        weight=crem.weight,
        evidence=crem.evidence,
        technical=tech,
        created_at=crem.created_at,
        scheduled_at=crem.scheduling.scheduled_at if crem.scheduling else None,
        step_started_at=step_started_at,
        current_step_has_evidence=has_step_evidence(crem, tech.step_id if tech else None),
        partner_id=veterinary.id if veterinary else None,
        partner_name=veterinary.name if veterinary else None,
        partner_address=veterinary.address if veterinary else None,
        partner_phone=veterinary.phone if veterinary else None,
        pickup_address=crem.logistics.pickup_address if crem.logistics else None,
        pickup_city=crem.logistics.pickup_city if crem.logistics else None,
        pickup_region=crem.logistics.pickup_region if crem.logistics else None,
        delivery_address=crem.logistics.address if crem.logistics else None,
        delivery_city=crem.logistics.city if crem.logistics else None,
        delivery_region=crem.logistics.region if crem.logistics else None,
        cremation_type=crem.cremation_type,
        notes=crem.details.notes if crem.details else None,
        pet_image_url=pet.image_url if pet else None,
    )

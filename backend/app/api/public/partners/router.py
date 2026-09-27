from fastapi import APIRouter, Depends, HTTPException, Header, Form, File, UploadFile, Request, status
from app.core.rate_limiter import limiter
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import json
from pathlib import Path

from app.database import get_db
from app import models
from app.api.internal.partners.models import (
    PartnerLinkV2 as PartnerLink,
    PartnerLinkStatus,
    Veterinary,
    PartnerCommission,
    PartnerCommissionStatus
)
from app.api.internal.partners import schemas as partner_schemas
from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
from app.utils.generators import generate_unique_code
from app.utils.upload_validation import read_and_validate_image, enforce_max_files
from app.core.config import settings

router = APIRouter()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_partner_link_by_token(token: str, db: Session) -> PartnerLink:
    # Bypass puntual para localizar el partner link por su token único global
    apply_bypass_rls(db)
    link = db.query(PartnerLink).options(
        joinedload(PartnerLink.veterinary),
        joinedload(PartnerLink.tenant)
    ).filter(
        PartnerLink.access_token == token,
        PartnerLink.status == PartnerLinkStatus.active
    ).first()
    
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portal de veterinaria no encontrado o convenio inactivo."
        )
    return link

# Bloqueo por intentos fallidos de PIN, por enlace (el PIN es de 4 dígitos: sin
# límite se adivina en minutos). Cubre verify, catálogo, dashboard y submit, y
# frena también intentos repartidos entre varias IPs. En memoria: el backend
# corre en una sola instancia.
_PIN_MAX_FAILS = 10
_PIN_WINDOW_SECONDS = 15 * 60
_pin_failures: dict[int, list[float]] = {}


def _verify_partner_pin(link: PartnerLink, pin: str):
    import hmac
    import time

    now = time.time()
    fails = [t for t in _pin_failures.get(link.id, []) if now - t < _PIN_WINDOW_SECONDS]
    if len(fails) >= _PIN_MAX_FAILS:
        _pin_failures[link.id] = fails
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos con PIN incorrecto. Intenta nuevamente en 15 minutos."
        )
    expected = (link.access_pin or "").strip()
    if not expected or not hmac.compare_digest(expected, (pin or "").strip()):
        fails.append(now)
        _pin_failures[link.id] = fails
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN de acceso incorrecto."
        )
    _pin_failures.pop(link.id, None)

# ---------------------------------------------------------------------------
# 1. VERIFICACIÓN DE ACCESO CON PIN
# ---------------------------------------------------------------------------

@router.post(
    "/partner-portal/verify",
    response_model=partner_schemas.PartnerPortalInfo,
    tags=["Público - Portal Partner"]
)
@limiter.limit("5/minute")
async def verify_partner_portal_access(
    request: Request,
    payload: partner_schemas.PartnerPortalVerifyRequest,
    db: Session = Depends(get_db)
):
    link = _get_partner_link_by_token(payload.token, db)
    _verify_partner_pin(link, payload.pin)

    vet = link.veterinary
    tenant = link.tenant

    return partner_schemas.PartnerPortalInfo(
        partner_id=link.id,
        partner_name=vet.name if vet else "Veterinaria",
        partner_rut=vet.rut if vet else None,
        partner_email=vet.email if vet else None,
        partner_phone=vet.phone if vet else None,
        partner_address=vet.address if vet else None,
        partner_city=vet.city if vet else None,
        partner_region=vet.region if vet else None,
        tenant_name=tenant.name if tenant else "Crematorio",
        tenant_slug=tenant.slug if tenant else "",
        tenant_logo_url=tenant.logo_url if tenant else None,
        tenant_phone=tenant.phone if tenant else None,
        tipo_comision=link.tipo_comision or "porcentaje",
        porcentaje_comision=float(link.porcentaje_comision or 0.0),
        monto_comision=float(link.monto_comision or 0.0)
    )

# ---------------------------------------------------------------------------
# 2. CATÁLOGO DE PLANES Y SERVICIOS PARA LA CLÍNICA
# ---------------------------------------------------------------------------

@router.get(
    "/partner-portal/{token}/catalog",
    tags=["Público - Portal Partner"]
)
async def get_partner_portal_catalog(
    token: str,
    x_partner_pin: Optional[str] = Header(None, alias="X-Partner-Pin"),
    pin: Optional[str] = None,
    db: Session = Depends(get_db)
):
    link = _get_partner_link_by_token(token, db)
    provided_pin = x_partner_pin or pin
    if not provided_pin:
        raise HTTPException(status_code=401, detail="Se requiere PIN de acceso.")
    _verify_partner_pin(link, provided_pin)

    # Configurar RLS del tenant para consultar sus planes y servicios
    apply_tenant_rls(db, link.tenant_id)

    plans = db.query(models.Plan).options(
        joinedload(models.Plan.services),
        joinedload(models.Plan.products)
    ).filter(
        models.Plan.tenant_id == link.tenant_id,
        models.Plan.is_active == True
    ).all()

    catalog_plans = []
    for p in plans:
        catalog_plans.append({
            "id": p.id,
            "name": p.name,
            "description": p.description or "",
            "price": float(p.price or 0.0),
            "image_url": p.image_url,
            "services": [{"id": s.id, "name": s.name} for s in p.services],
            "products": [{"id": pr.id, "name": pr.name} for pr in p.products]
        })

    return {
        "tenant_name": link.tenant.name,
        "tenant_slug": link.tenant.slug,
        "plans": catalog_plans,
        "tipo_comision": link.tipo_comision or "porcentaje",
        "porcentaje_comision": float(link.porcentaje_comision or 0.0),
        "monto_comision": float(link.monto_comision or 0.0)
    }

# ---------------------------------------------------------------------------
# 3. DASHBOARD Y CONTROL DE COMISIONES
# ---------------------------------------------------------------------------

@router.get(
    "/partner-portal/{token}/dashboard",
    response_model=partner_schemas.PartnerPortalDashboardResponse,
    tags=["Público - Portal Partner"]
)
async def get_partner_portal_dashboard(
    token: str,
    x_partner_pin: Optional[str] = Header(None, alias="X-Partner-Pin"),
    pin: Optional[str] = None,
    db: Session = Depends(get_db)
):
    link = _get_partner_link_by_token(token, db)
    provided_pin = x_partner_pin or pin
    if not provided_pin:
        raise HTTPException(status_code=401, detail="Se requiere PIN de acceso.")
    _verify_partner_pin(link, provided_pin)

    apply_tenant_rls(db, link.tenant_id)

    # Buscar todas las comisiones asociadas a este partner link
    commissions = db.query(PartnerCommission).options(
        joinedload(PartnerCommission.cremation).joinedload(models.CremationOC.pet).joinedload(models.Pet.customer),
        joinedload(PartnerCommission.cremation).joinedload(models.CremationOC.financial),
    ).filter(
        PartnerCommission.partner_link_id == link.id
    ).order_by(PartnerCommission.created_at.desc()).all()

    total_earned = 0.0
    total_pending = 0.0
    total_paid = 0.0
    count_pending = 0
    count_paid = 0
    cases_list = []

    for c in commissions:
        amount = float(c.amount or 0.0)
        status_val = getattr(c.status, "value", str(c.status)).lower()

        total_earned += amount
        if status_val == "pagado":
            total_paid += amount
            count_paid += 1
        elif status_val == "pendiente":
            total_pending += amount
            count_pending += 1

        crem = c.cremation
        pet = crem.pet if crem else None
        cust = pet.customer if pet else None
        fin = crem.financial if crem else None

        cases_list.append(partner_schemas.PartnerPortalCaseItem(
            id=c.id,
            cremation_id=c.cremation_id,
            date=c.created_at,
            pet_name=pet.name if pet else "Mascota",
            pet_type=pet.species if pet else None,
            owner_name=cust.name if cust else "Tutor",
            owner_phone=cust.phone if cust else None,
            service_name=crem.cremation_type if (crem and crem.cremation_type) else "Cremación",
            order_total=float(fin.total_price if fin and fin.total_price else 0.0),
            commission_amount=amount,
            commission_status=status_val,
            cremation_status=crem.status if crem else "Registrado",
            tracking_code=crem.verification_code if crem else None,
            paid_at=c.paid_at
        ))

    vet = link.veterinary
    tenant = link.tenant

    partner_info = partner_schemas.PartnerPortalInfo(
        partner_id=link.id,
        partner_name=vet.name if vet else "Veterinaria",
        partner_rut=vet.rut if vet else None,
        partner_email=vet.email if vet else None,
        partner_phone=vet.phone if vet else None,
        partner_address=vet.address if vet else None,
        partner_city=vet.city if vet else None,
        partner_region=vet.region if vet else None,
        tenant_name=tenant.name if tenant else "Crematorio",
        tenant_slug=tenant.slug if tenant else "",
        tenant_logo_url=tenant.logo_url if tenant else None,
        tenant_phone=tenant.phone if tenant else None,
        tipo_comision=link.tipo_comision or "porcentaje",
        porcentaje_comision=float(link.porcentaje_comision or 0.0),
        monto_comision=float(link.monto_comision or 0.0)
    )

    stats = partner_schemas.PartnerPortalDashboardStats(
        total_earned=round(total_earned, 2),
        total_pending=round(total_pending, 2),
        total_paid=round(total_paid, 2),
        count_cases=len(cases_list),
        count_pending=count_pending,
        count_paid=count_paid
    )

    return partner_schemas.PartnerPortalDashboardResponse(
        partner_info=partner_info,
        stats=stats,
        cases=cases_list
    )

# ---------------------------------------------------------------------------
# 4. ADMISIÓN DIRECTA DESDE LA CLÍNICA (CREACIÓN DE CASO CON TRACKING)
# ---------------------------------------------------------------------------

@router.post(
    "/partner-portal/{token}/submit",
    tags=["Público - Portal Partner"]
)
async def submit_partner_admission(
    token: str,
    owner_data: str = Form(...),
    pet_data: str = Form(...),
    selected_services: str = Form(default="[]"),
    pin: str = Form(...),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    link = _get_partner_link_by_token(token, db)
    _verify_partner_pin(link, pin)

    enforce_max_files(files)
    validated_files = []
    for f in files:
        content, ext = await read_and_validate_image(f)
        validated_files.append((content, ext))

    apply_tenant_rls(db, link.tenant_id)
    tenant = link.tenant

    try:
        owner_dict = json.loads(owner_data)
        pet_dict = json.loads(pet_data)
        services_list_ids = json.loads(selected_services)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Datos de formulario con formato inválido.")

    # Inyectar el partner_id en el payload del dueño para la trazabilidad
    owner_dict["partner_id"] = link.id
    owner_dict["referral_partner_name"] = link.veterinary.name if link.veterinary else "Clínica Asociada"

    # Enriquecer servicios / plan seleccionado para congelar precio
    enriched_services = []
    total_order_price = 0.0

    for item_id in services_list_ids:
        try:
            if item_id.startswith("plan_"):
                pid = int(item_id.split("_")[1])
                plan = db.query(models.Plan).options(
                    joinedload(models.Plan.services),
                    joinedload(models.Plan.products)
                ).filter(models.Plan.id == pid, models.Plan.tenant_id == link.tenant_id).first()

                if plan:
                    p_price = float(plan.price or 0.0)
                    total_order_price += p_price
                    enriched_services.append({
                        "type": "plan",
                        "id": plan.id,
                        "name": plan.name,
                        "price": p_price,
                        "cost": float(plan.cost or 0.0),
                        "image_url": plan.image_url,
                        "items": [
                            {"type": "service", "origin_id": s.id, "name": s.name, "price": 0.0, "quantity": 1}
                            for s in plan.services
                        ] + [
                            {"type": "product", "origin_id": p.id, "name": p.name, "price": 0.0, "quantity": 1}
                            for p in plan.products
                        ]
                    })
            elif item_id.startswith("svc_"):
                sid = int(item_id.split("_")[1])
                svc = db.query(models.Service).filter(models.Service.id == sid, models.Service.tenant_id == link.tenant_id).first()
                if svc:
                    s_price = float(svc.price or 0.0)
                    total_order_price += s_price
                    enriched_services.append({
                        "type": "service",
                        "id": svc.id,
                        "name": svc.name,
                        "price": s_price,
                        "cost": float(svc.cost or 0.0),
                        "quantity": 1
                    })
        except Exception as e:
            print(f"Error enriching service in partner portal: {e}")

    # Calcular comisión estimada
    estimated_commission = 0.0
    if link.tipo_comision == "fijo":
        estimated_commission = float(link.monto_comision or 0.0)
    else:
        porcentaje = float(link.porcentaje_comision or 0.0)
        estimated_commission = total_order_price * (porcentaje / 100.0)

    # Crear la submission con código único de tracking
    submission_code = generate_unique_code()
    submission = models.FormSubmission(
        tenant_id=link.tenant_id,
        slug=tenant.slug,
        owner_data=owner_dict,
        pet_data=pet_dict,
        selected_services=enriched_services,
        status="pending",
        code=submission_code,
        images=[]
    )
    db.add(submission)
    db.commit()

    apply_bypass_rls(db)
    db.refresh(submission)
    apply_tenant_rls(db, link.tenant_id)

    # Subir y vincular imágenes
    saved_images = []
    slug_tenant = tenant.slug or f"tenant_{tenant.id}"
    upload_path = Path("app/static/storage") / slug_tenant / "submissions" / str(submission.id)
    upload_path.mkdir(parents=True, exist_ok=True)

    for content, ext in validated_files:
        file_name = f"{generate_unique_code()}.{ext}"
        full_dest = upload_path / file_name
        full_dest.write_bytes(content)
        db_rel_path = f"/storage/{slug_tenant}/submissions/{submission.id}/{file_name}"
        saved_images.append(db_rel_path)

    if saved_images:
        submission.images = saved_images
        db.commit()

    # Disparar notificación interna al crematorio avisando que la veterinaria envió una admisión
    try:
        service_name = enriched_services[0].get("name") if enriched_services else "N/A"
        vet_name_display = link.veterinary.name if link.veterinary else "Veterinaria"
        pet_name_display = pet_dict.get("name", "Mascota")
        owner_name_display = owner_dict.get("fullName", "Tutor")

        new_notif = models.Notification(
            tenant_id=link.tenant_id,
            title=f"Nueva Solicitud: {pet_name_display} ({owner_name_display})",
            message=f"{vet_name_display} derivó una nueva solicitud para {pet_name_display} (Tutor: {owner_name_display}).",
            type="new_submission",
            audience="ordenes",
            data={
                "submission_id": submission.id,
                "owner_name": owner_name_display,
                "pet_name": pet_name_display,
                "service_name": service_name,
                "partner_name": vet_name_display,
                "origin": "veterinaria"
            }
        )
        db.add(new_notif)
        db.commit()
    except Exception as notif_err:
        print(f"Error creando notificación de partner submission: {notif_err}")

    return {
        "success": True,
        "tracking_code": submission_code,
        "tracking_url": f"/track/{submission_code}",
        "estimated_commission": round(estimated_commission, 2),
        "partner_name": link.veterinary.name if link.veterinary else "Veterinaria",
        "tenant_name": tenant.name
    }

# ---------------------------------------------------------------------------
# 5. RESOLVER PARTNERS EXISTENTES (RETROCOMPATIBILIDAD)
# ---------------------------------------------------------------------------

@router.get("/partners/link/{slug_publico}")
def get_partner_link_public(slug_publico: str, db: Session = Depends(get_db)):
    """
    Resuelve el enlace de derivación de una veterinaria (/registro/{slug_publico})
    sin conocer el crematorio: devuelve la veterinaria y el crematorio del vínculo.

    Declarada ANTES de /partners/{tenant_slug}/{partner_slug} para que "link" no
    se interprete como slug de tenant. La página /registro llamaba a
    /partners/{slug}, que es el listado por crematorio, y siempre fallaba.
    """
    # Bypass puntual: slug_publico identifica el vínculo entre todos los tenants.
    apply_bypass_rls(db)
    link = db.query(PartnerLink).options(
        joinedload(PartnerLink.veterinary),
        joinedload(PartnerLink.tenant)
    ).filter(
        PartnerLink.slug_publico == slug_publico,
        PartnerLink.status == PartnerLinkStatus.active
    ).first()

    if not link or not link.tenant or not link.veterinary or not link.veterinary.is_active:
        raise HTTPException(status_code=404, detail="Enlace inválido o convenio inactivo")
    if link.tenant.status in [models.TenantStatus.inactive, models.TenantStatus.suspended]:
        raise HTTPException(status_code=404, detail="Enlace inválido o convenio inactivo")

    return {
        "id_partner": link.id,
        "nombre_clinica": link.veterinary.name,
        "slug_publico": link.slug_publico,
        "tipo_comision": link.tipo_comision,
        "porcentaje_comision": link.porcentaje_comision,
        "monto_comision": link.monto_comision,
        "tenant": {
            "id": link.tenant.id,
            "name": link.tenant.name,
            "slug": link.tenant.slug,
            "logo_url": link.tenant.logo_url,
            "phone": link.tenant.phone,
            "email": link.tenant.email,
        },
    }

@router.get("/partners/{tenant_slug}/{partner_slug}")
async def get_partner_by_slug(
    tenant_slug: str,
    partner_slug: str,
    db: Session = Depends(get_db)
):
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    # ptn_partner_links tiene RLS por tenant: sin fijarlo la consulta no ve filas
    # y el formulario con ?partner= nunca resolvía la veterinaria.
    apply_tenant_rls(db, tenant.id)

    partner_link = db.query(PartnerLink).filter(
        PartnerLink.tenant_id == tenant.id,
        PartnerLink.slug_publico == partner_slug,
        PartnerLink.status == PartnerLinkStatus.active
    ).first()

    if not partner_link:
        raise HTTPException(status_code=404, detail="Partner no encontrado o inactivo")

    return {
        "id_partner": partner_link.id,
        "nombre_clinica": partner_link.veterinary.name,
        "slug_publico": partner_link.slug_publico
    }

@router.get("/partners/{tenant_slug}")
async def list_tenant_partners(
    tenant_slug: str,
    db: Session = Depends(get_db)
):
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    # ptn_partner_links tiene RLS por tenant: sin fijarlo la consulta no ve filas
    # y el formulario con ?partner= nunca resolvía la veterinaria.
    apply_tenant_rls(db, tenant.id)

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

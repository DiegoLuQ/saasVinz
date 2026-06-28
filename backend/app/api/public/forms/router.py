from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.api.internal.partners.models import PartnerLinkV2 as PartnerLink
import json
import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from app.utils import tz
import re
import uuid
from app.api.internal.common.media_service import MediaService
from app.core.rate_limiter import limiter
from app.services.recaptcha import verify_recaptcha
from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
from app.utils.upload_validation import read_and_validate_image, enforce_max_files

router = APIRouter()
BASE_UPLOAD_DIR = "app/static/storage"

@router.get("/verify-token")
def verify_token(token: str, tenant_slug: str, db: Session = Depends(get_db)):
    """Verifica si un token es válido y no ha expirado."""
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
    # Configurar tenant_id en la sesión para que RLS permita leer las tablas del inquilino
    apply_tenant_rls(db, tenant.id)

    temp_token = db.query(models.TemporaryFormToken).filter(
        models.TemporaryFormToken.token == token,
        models.TemporaryFormToken.tenant_id == tenant.id,
        models.TemporaryFormToken.is_active == True
    ).first()
    
    if not temp_token:
        # Check permanent (deprecated)
        if tenant.public_token == token:
            return {"valid": True, "expires_at": None, "expired": False}
        return {"valid": False, "expired": True, "message": "Token inválido"}
        
    now = datetime.utcnow()
    is_expired = temp_token.expires_at <= now
    
    return {
        "valid": not is_expired,
        "expired": is_expired,
        "expires_at": temp_token.expires_at,
        "message": "Token expirado" if is_expired else "Token válido"
    }

@router.post("/extend-token")
@limiter.limit("5/minute")
def extend_token(request: Request, token: str, tenant_slug: str, db: Session = Depends(get_db)):
    """Extiende la vida de un token por 1 hora (solo si sigue vigente)."""
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    # Configurar tenant_id en la sesión para que RLS permita leer las tablas del inquilino
    apply_tenant_rls(db, tenant.id)

    temp_token = db.query(models.TemporaryFormToken).filter(
        models.TemporaryFormToken.token == token,
        models.TemporaryFormToken.tenant_id == tenant.id,
        models.TemporaryFormToken.is_active == True
    ).first()

    if not temp_token:
        raise HTTPException(status_code=404, detail="Token no encontrado o inactivo")

    # Respetar la expiración: no revivir tokens ya vencidos (debe solicitarse uno nuevo).
    if temp_token.expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El enlace ya expiró. Solicite un nuevo enlace a la empresa."
        )

    # Extender 1 hora desde ahora.
    new_expiration = tz.get_now() + timedelta(hours=1)
    temp_token.expires_at = new_expiration
    db.commit()
    
    return {
        "message": "Enlace extendido por 1 hora adicional",
        "expires_at": new_expiration
    }

@router.post("/submit-form")
@limiter.limit("5/minute")
async def submit_public_form(
    request: Request,  # Requerido por SlowAPI para el rate-limit por IP
    tenant_id: int = Form(...),
    owner_data: str = Form(...),
    pet_data: str = Form(...),
    selected_services: str = Form(default="[]"),
    token: str = Form(...),
    partner_id: int = Form(None),  # NEW: Optional partner ID
    recaptcha_token: str = Form(default=""),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    # 0. Anti-bot: verificar reCAPTCHA v3 (falla-cerrado salvo que no haya clave configurada)
    is_human = await verify_recaptcha(recaptcha_token)
    if not is_human:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verificación anti-bot fallida. Recargue la página e intente nuevamente."
        )

    # 0.1 Validar archivos ANTES de crear nada en BD: límite de cantidad +
    # tamaño + tipo real (magic bytes). Evita submissions huérfanas y abuso.
    enforce_max_files(files)
    validated_files = []
    for f in files:
        content, ext = await read_and_validate_image(f)
        validated_files.append((content, ext))

    # 1. Verify Tenant
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Configurar tenant_id en la sesión para que RLS permita leer y guardar en las tablas del inquilino
    apply_tenant_rls(db, tenant.id)

    # 1.0 Check Tenant Status
    if tenant.status in [models.TenantStatus.inactive, models.TenantStatus.suspended]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Acceso denegado. Esta empresa está {tenant.status.value}."
        )

    # 1.1 Verify Token (Temporary o Permanent) OR Valid Partner
    token_valid = False
    
    # Check Partner First (Stronger or Alternate Auth)
    if partner_id:
        partner_link = db.query(PartnerLink).filter(
            PartnerLink.id == partner_id,
            PartnerLink.tenant_id == tenant_id,
            PartnerLink.status == 'active'
        ).first()
        
        if partner_link:
            token_valid = True
        else:
            raise HTTPException(status_code=404, detail="Partner no encontrado o inactivo")

    # If no partner, check standard tokens
    if not token_valid:
        # Primero intentar con token temporal
        temp_token = db.query(models.TemporaryFormToken).filter(
            models.TemporaryFormToken.token == token,
            models.TemporaryFormToken.tenant_id == tenant_id,
            models.TemporaryFormToken.is_active == True
        ).first()
        
        if temp_token:
            # Verificar que no esté expirado
            now = datetime.utcnow()
            if temp_token.expires_at > now:
                token_valid = True
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="El enlace ha expirado. Solicite un nuevo enlace a la empresa."
                )
        else:
            # Fallback: Verificar token permanente (deprecated)
            if tenant.public_token == token:
                token_valid = True
    
    if not token_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acceso no autorizado: Token inválido"
        )

    # 1.2 Validate Partner if provided
    if partner_id:
        partner_link = db.query(PartnerLink).filter(
            PartnerLink.id == partner_id,
            PartnerLink.tenant_id == tenant_id,
            PartnerLink.status == 'active'
        ).first()
        
        if not partner_link:
            raise HTTPException(status_code=404, detail="Partner no encontrado o inactivo")

    # 2. Parse Data
    try:
        owner_dict = json.loads(owner_data)
        pet_dict = json.loads(pet_data)
        services_list_ids = json.loads(selected_services)

        # Security Validations for owner_data
        full_name = str(owner_dict.get("fullName") or "")
        email = str(owner_dict.get("email") or "")
        address = str(owner_dict.get("address") or "")
        rut = str(owner_dict.get("rut") or "")

        if len(full_name) > 50:
            raise HTTPException(status_code=400, detail="Nombre completo no puede exceder 50 caracteres")
        
        if len(email) > 50:
            raise HTTPException(status_code=400, detail="Email no puede exceder 50 caracteres")
        if email and not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            raise HTTPException(status_code=400, detail="Formato de email inválido")

        if len(address) > 70:
            raise HTTPException(status_code=400, detail="Dirección no puede exceder 70 caracteres")
        
        if len(rut) > 13:
            raise HTTPException(status_code=400, detail="RUT no puede exceder 13 caracteres")

        # Security Validations for pet_dict
        pet_name = str(pet_dict.get("name") or "")
        pet_breed = str(pet_dict.get("breed") or "")
        pet_age = str(pet_dict.get("age") or "")
        pet_type = str(pet_dict.get("type") or "")

        if len(pet_name) > 50:
            raise HTTPException(status_code=400, detail="Nombre de mascota no puede exceder 50 caracteres")
        if len(pet_breed) > 20:
            raise HTTPException(status_code=400, detail="Raza no puede exceder 20 caracteres")
        if len(pet_age) > 3:
            raise HTTPException(status_code=400, detail="Edad no puede exceder 3 caracteres")
        
        valid_types = ["Canino", "Felino", "Ave", "Mamífero pequeño", "Reptil / Anfibio", "Exótico", "Otro"]
        if pet_type and pet_type not in valid_types:
             raise HTTPException(status_code=400, detail="Tipo de mascota inválido")

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Datos inválidos (JSON)")

    # 3. Enrich Services Data (Snapshot Prices)
    enriched_services = []
    
    # Pre-fetch lookup to avoid N+1 queries ideally, but for now simple loop is fine for small forms
    from sqlalchemy.orm import joinedload
    
    for item_id in services_list_ids:
        try:
            if item_id.startswith("plan_"):
                pid = int(item_id.split("_")[1])
                # Eager load nested items for snapshot
                plan = db.query(models.Plan).options(
                    joinedload(models.Plan.services),
                    joinedload(models.Plan.products)
                ).filter(models.Plan.id == pid, models.Plan.tenant_id == tenant_id).first()
                
                if plan:
                    # Constructor Plan JSON
                    plan_snapshot = {
                        "type": "plan",
                        "id": plan.id,
                        "name": plan.name,
                        "price": plan.price or 0.0,
                        "cost": plan.cost or 0.0,
                        # Congelamos la imagen en el momento de la selección: si el
                        # crematorio luego la cambia/borra, el registro histórico
                        # conserva la que vio la familia al elegir el plan.
                        "image_url": plan.image_url,
                        "items": []
                    }
                    
                    # Nested items (Price 0 as requested)
                    for s in plan.services:
                        plan_snapshot["items"].append({
                            "type": "service",
                            "origin_id": s.id,
                            "name": s.name,
                            "price": 0.0,
                            "cost": 0.0, # Included in plan cost
                            "quantity": 1
                        })
                    for p in plan.products:
                        plan_snapshot["items"].append({
                            "type": "product",
                            "origin_id": p.id,
                            "name": p.name,
                            "price": 0.0,
                            "cost": 0.0, # Included in plan cost
                            "quantity": 1
                        })
                    
                    enriched_services.append(plan_snapshot)
                    
            elif item_id.startswith("svc_"):
                sid = int(item_id.split("_")[1])
                svc = db.query(models.Service).filter(models.Service.id == sid, models.Service.tenant_id == tenant_id).first()
                if svc:
                    enriched_services.append({
                        "type": "service",
                        "id": svc.id,
                        "name": svc.name,
                        "price": svc.price or 0.0,
                        "cost": svc.cost or 0.0,
                        "quantity": 1
                    })
                    
            elif item_id.startswith("prod_"):
                prid = int(item_id.split("_")[1])
                prod = db.query(models.Product).filter(models.Product.id == prid, models.Product.tenant_id == tenant_id).first()
                if prod:
                    enriched_services.append({
                        "type": "product",
                        "id": prod.id,
                        "name": prod.name,
                        "price": prod.sale_price or 0.0,
                        "cost": prod.cost_price or 0.0,
                        "quantity": 1
                    })
        except Exception as e:
            print(f"Error enriching item {item_id}: {e}")
            # Fallback: store just the ID if enrichment fails? 
            # Better to skip or store minimal info to avoid breaking the array structure

    # 4. Create Submission Record (Pending)
    # Store partner_id in owner_data as fallback since model might not have the column enabled
    if partner_id:
        owner_dict['partner_id'] = partner_id

    from app.utils.generators import generate_unique_code
    submission = models.FormSubmission(
        tenant_id=tenant_id,
        slug=tenant.slug,
        owner_data=owner_dict,
        pet_data=pet_dict,
        selected_services=enriched_services, # Persist full JSON
        # partner_id=partner_id, # Commented out as per model definition
        status="pending",
        code=generate_unique_code(),
        images=[] 
    )
    db.add(submission)
    db.commit()
    # Refresh con bypass puntual y restauración inmediata del contexto del tenant.
    apply_bypass_rls(db)
    db.refresh(submission)
    apply_tenant_rls(db, tenant_id)

    submission_id = submission.id
    submission_code = submission.code

    # 4. Handle Images
    saved_images = []
    
    # Ensure directory exists: storage/{tenant_slug}/submissions/{submission_id}/
    slug = tenant.slug or f"tenant_{tenant.id}"
    upload_path = Path(BASE_UPLOAD_DIR) / slug / "submissions" / str(submission_id)
    upload_path.mkdir(parents=True, exist_ok=True)

    from app.api.internal.common.media_service import MediaService

    for content, ext in validated_files:
        # Ya validados arriba (magic bytes + tamaño). La extensión proviene del
        # contenido real, nunca de file.filename (falsificable).
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"sub_{submission.id}_{uuid.uuid4().hex[:6]}.{ext}")

        with open(temp_path, "wb") as buffer:
            buffer.write(content)

        try:
            # Upload using MediaService
            media_item = MediaService.upload_media(
                db=db,
                local_path=temp_path,
                media_type="image",
                category="submissions",
                ratio="original",
                description=f"Evidencia de solicitud {submission.id}",
                alt_text=f"Mascota {pet_dict.get('name')}",
                processing_mode="optimized",
                custom_prefix=f"sub_{submission.id}",
                tenant_id=tenant_id
            )
            saved_images.append(media_item.url)
        except Exception as e:
            print(f"Error saving submission file: {e}")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # Update Submission with images
    submission.images = saved_images
    db.commit()

    # 5. Create Notification for the tenant
    try:
        # Get first service name for display
        service_name = enriched_services[0].get("name") if enriched_services else "N/A"
        
        new_notif = models.Notification(
            tenant_id=tenant_id,
            title=f"Nueva Solicitud: {pet_dict.get('name')} ({owner_dict.get('fullName')})",
            message=f"Se ha recibido una nueva solicitud de {owner_dict.get('fullName')} para la mascota {pet_dict.get('name')}.",
            type="new_submission",
            data={
                "submission_id": submission_id,
                "owner_name": owner_dict.get("fullName"),
                "pet_name": pet_dict.get("name"),
                "service_name": service_name
            }
        )
        db.add(new_notif)
        db.commit()
    except Exception as e:
        print(f"Error creating notification: {e}")

    return {
        "status": "success",
        "message": "Solicitud recibida correctamente. Pendiente de aprobación.",
        "submission_id": submission_id,
        "code": submission_code
    }

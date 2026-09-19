from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.auth import get_current_creator

from typing import List, Optional
import os
import uuid
from datetime import datetime
from app.utils.certificates import generate_certificate_json, generate_image_certificate_html
from app.api.internal.common.media_service import MediaService

router = APIRouter()

# CRUD de plantillas del admin: GLOBALES (tenant_id NULL, para todos) y
# EXCLUSIVAS (tenant_id fijado + is_locked, solo ese tenant; solo el admin edita).
# Las plantillas que crea cada tenant por su cuenta no se gestionan desde aquí.

def _admin_owned():
    return or_(models.CertificateTemplate.tenant_id.is_(None), models.CertificateTemplate.is_locked == True)  # noqa: E712


def _get_admin_template(db: Session, template_id: int) -> models.CertificateTemplate:
    tpl = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.id == template_id, _admin_owned()
    ).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


def _store_advantages(data: dict, current_config: Optional[dict] = None) -> dict:
    """advantages_list vive dentro de sections_config (no tiene columna propia)."""
    adv_list = data.pop('advantages_list', None)
    if adv_list is not None:
        config = dict(data.get('sections_config') or current_config or {})
        config['advantages_list'] = adv_list
        data['sections_config'] = config
    return data


def _clear_tenant_default(db: Session, tenant_id: Optional[int], template_id: int):
    if not tenant_id:
        return
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if tenant and tenant.default_certificate_template_id == template_id:
        tenant.default_certificate_template_id = None


def _apply_destination(db: Session, tpl: models.CertificateTemplate, dest: schemas.AdminTemplateDestination):
    """Global <-> exclusiva de un tenant. Al mover o quitar una exclusiva se limpia
    la predeterminada del tenant que la usaba."""
    if dest.scope == "global":
        _clear_tenant_default(db, tpl.tenant_id, tpl.id)
        tpl.tenant_id = None
        tpl.is_locked = False
    elif dest.scope == "exclusive":
        if not dest.target_tenant_id:
            raise HTTPException(status_code=400, detail="Elige el tenant para la plantilla exclusiva")
        if tpl.category == "recibo_suscripcion":
            raise HTTPException(status_code=400, detail="El recibo de suscripción solo puede ser global")
        tenant = db.query(models.Tenant).filter(models.Tenant.id == dest.target_tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant no encontrado")
        if tpl.tenant_id and tpl.tenant_id != tenant.id:
            _clear_tenant_default(db, tpl.tenant_id, tpl.id)
        tpl.tenant_id = tenant.id
        tpl.is_locked = True
        tpl.is_default = False  # 'is_default' es la global del sistema; no aplica a exclusivas

    if dest.set_as_tenant_default and tpl.tenant_id:
        db.flush()  # asegura tpl.id en altas
        tenant = db.query(models.Tenant).filter(models.Tenant.id == tpl.tenant_id).first()
        tenant.default_certificate_template_id = tpl.id


def _to_out(db: Session, templates) -> List[schemas.AdminCertificateTemplateOut]:
    tenant_ids = {t.tenant_id for t in templates if t.tenant_id}
    tenants = {
        t.id: t for t in db.query(models.Tenant).filter(models.Tenant.id.in_(tenant_ids)).all()
    } if tenant_ids else {}
    out = []
    for t in templates:
        tenant = tenants.get(t.tenant_id)
        out.append(schemas.AdminCertificateTemplateOut.model_validate(t).model_copy(update={
            "tenant_name": tenant.name if tenant else None,
            "is_tenant_default": bool(tenant and tenant.default_certificate_template_id == t.id),
        }))
    return out


@router.get("/templates", response_model=List[schemas.AdminCertificateTemplateOut])
def get_admin_templates(
    tenant_id: Optional[int] = None,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Plantillas globales + exclusivas. `tenant_id` filtra las exclusivas de ese tenant."""
    query = db.query(models.CertificateTemplate).filter(_admin_owned())
    if tenant_id:
        query = query.filter(models.CertificateTemplate.tenant_id == tenant_id)
    return _to_out(db, query.order_by(models.CertificateTemplate.id.desc()).all())


@router.post("/templates", response_model=schemas.AdminCertificateTemplateOut)
def create_admin_template(
    template: schemas.AdminCertificateTemplateCreate,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Crea una plantilla global (por defecto) o exclusiva para un tenant."""
    dest = schemas.AdminTemplateDestination(
        scope=template.scope or "global",
        target_tenant_id=template.target_tenant_id,
        set_as_tenant_default=template.set_as_tenant_default,
    )
    data = _store_advantages(template.model_dump(exclude=set(schemas.AdminTemplateDestination.model_fields)))

    db_template = models.CertificateTemplate(**data, tenant_id=None, is_locked=False)
    db.add(db_template)
    _apply_destination(db, db_template, dest)
    db.commit()
    db.refresh(db_template)
    return _to_out(db, [db_template])[0]


@router.get("/templates/{template_id}", response_model=schemas.AdminCertificateTemplateOut)
def get_admin_template(
    template_id: int,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    return _to_out(db, [_get_admin_template(db, template_id)])[0]


@router.put("/templates/{template_id}", response_model=schemas.AdminCertificateTemplateOut)
def update_admin_template(
    template_id: int,
    template: schemas.AdminCertificateTemplateUpdate,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Edita una plantilla global o exclusiva (y opcionalmente cambia su destino)."""
    db_template = _get_admin_template(db, template_id)

    dest_fields = set(schemas.AdminTemplateDestination.model_fields)
    update_data = _store_advantages(
        template.model_dump(exclude_unset=True, exclude=dest_fields),
        current_config=db_template.sections_config,
    )
    for key, value in update_data.items():
        setattr(db_template, key, value)

    _apply_destination(db, db_template, schemas.AdminTemplateDestination(
        scope=template.scope,
        target_tenant_id=template.target_tenant_id,
        set_as_tenant_default=template.set_as_tenant_default,
    ))
    db.commit()
    db.refresh(db_template)
    return _to_out(db, [db_template])[0]


@router.delete("/templates/{template_id}")
def delete_admin_template(
    template_id: int,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    db_template = _get_admin_template(db, template_id)
    _clear_tenant_default(db, db_template.tenant_id, db_template.id)
    db.delete(db_template)
    db.commit()
    return {"message": "Template deleted"}


@router.post("/templates/preview-test")
def preview_test_admin_template(
    template_data: dict,
    request: Request,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Generate a preview of the template draft before saving it."""
    now = datetime.now()
    category = template_data.get('category', 'para mascotas')
    theme = template_data.get('theme', 'Clásico')

    base_url = str(request.base_url).rstrip('/')

    if category == 'certificadoImg':
        # Preview en vivo del diseño basado en imagen con datos de prueba.
        sc = template_data.get('sections_config') or {}
        aspect_ratio = sc.get('aspect_ratio', '16:9')
        fields = sc.get('fields', [])
        elements = sc.get('elements', [])
        demo_photo = "https://placehold.co/400x400/png?text=Mascota"
        return generate_image_certificate_html(
            background_url=template_data.get('background_logo_url'),
            aspect_ratio=aspect_ratio,
            fields=fields,
            elements=elements,
            pet_name="Mascota de Prueba",
            birth_date=datetime(2015, 6, 12),
            death_date=datetime(2026, 6, 1),
            current_date=now,
            pet_images=[demo_photo, demo_photo, demo_photo],
            tenant_logo_url="https://placehold.co/300x120/png?text=LOGO+EMPRESA",
            tenant_name="Crematorio Ejemplo SpA",
            tenant_rut="76.543.210-K",
            tenant_manager="María González",
            tenant_manager_rut="12.345.678-9",
            tenant_phone="+56 9 1234 5678",
            tenant_address="Av. Siempre Viva 742, Santiago",
            certificate_type="Certificado",
            cert_number="SAAS-PREVIEW-IMG",
            tenant_id=0,
            base_url=base_url,
        )

    if category == 'recibo_suscripcion':
        # Mock data for Subscription Receipt preview
        data = {
            "certificate_type": "Recibo de Suscripción",
            "theme": theme,
            "tenant_id": 0,
            "logo_url": "https://saascrematorio.com/logo-default.png",
            "cert_number": "SAAS-REC-2026-001",
            "pet_name": "Empresa de Prueba SpA",
            "pet_desc": "Plan Profesional (PRO)",
            "owner_name": "Juan Pérez",
            "owner_contact": "admin@empresa-prueba.cl",
            "process_details": f"Pago procesado exitosamente el {now.strftime('%d/%m/%Y')} mediante Transferencia Bancaria.",
            "auth_declaration": template_data.get('declaration_text') or "Gracias por confiar en nuestra plataforma SaaS.",
            "signature_text": template_data.get('signature_text') or "Soporte SaaS Administrativo",
            "memorial_message": template_data.get('memorial_message') or "",
            "memorial_title": template_data.get('memorial_title') or "Transacción:",
            # Fields for sections_config
            "tenant_name": "Empresa de Prueba SpA",
            "plan_name": "Plan Profesional (PRO)",
            "amount": "$45.000",
            "payment_date": now.strftime('%d/%m/%Y'),
            "period": "01/02/2026 - 01/03/2026",
            "header_logo_url": template_data.get('header_logo_url'),
            "header_logo_x": template_data.get('header_logo_x', 'center'),
            "header_logo_y": template_data.get('header_logo_y', '0'),
            "background_logo_url": template_data.get('background_logo_url'),
            "background_logo_x": template_data.get('background_logo_x', '50%'),
            "background_logo_y": template_data.get('background_logo_y', '50%'),
            "background_logo_opacity": template_data.get('background_logo_opacity', 0.05),
            "background_logo_rotation": template_data.get('background_logo_rotation', -15.0),
            "paper_format": template_data.get('paper_format', 'Carta'),
            "title": template_data.get('title'),
            "subtitle": template_data.get('subtitle'),
            "farewell_text": template_data.get('farewell_text'),
            "sections_config": template_data.get('sections_config'),
            "sections_order": template_data.get('sections_order'),
            "advantages_list": (template_data.get('sections_config') or {}).get('advantages_list') or template_data.get('advantages_list'),
            "header_logo_shape": template_data.get('header_logo_shape', 'square'),
            "background_logo_shape": template_data.get('background_logo_shape', 'square')
        }
    else:
        # Mock data for Certificates
        data = {
            "certificate_type": "Certificado SaaS",
            "theme": theme,
            "tenant_id": 0,
            "logo_url": "https://saascrematorio.com/logo-default.png",
            "cert_number": "SAAS-PREVIEW-001",
            "pet_name": "Mascota de Prueba",
            "pet_desc": "Canino - Labrador",
            "owner_name": "Propietario de Prueba",
            "owner_contact": "correo@prueba.com +00 000 000 000",
            "process_details": f"Servicio realizado el día {now.strftime('%d/%m/%Y')}.",
            "auth_declaration": template_data.get('declaration_text') or "Texto de prueba para declaración.",
            "signature_text": template_data.get('signature_text') or "Firma SaaS Creator",
            "memorial_message": template_data.get('memorial_message') or "",
            "memorial_title": template_data.get('memorial_title') or "In Memoriam",
            "header_logo_url": template_data.get('header_logo_url'),
            "header_logo_x": template_data.get('header_logo_x', 'center'),
            "header_logo_y": template_data.get('header_logo_y', '0'),
            "background_logo_url": template_data.get('background_logo_url'),
            "background_logo_x": template_data.get('background_logo_x', '50%'),
            "background_logo_y": template_data.get('background_logo_y', '50%'),
            "background_logo_opacity": template_data.get('background_logo_opacity', 0.05),
            "background_logo_rotation": template_data.get('background_logo_rotation', -15.0),
            "paper_format": template_data.get('paper_format', 'Carta'),
            "title": template_data.get('title'),
            "subtitle": template_data.get('subtitle'),
            "farewell_text": template_data.get('farewell_text'),
            "sections_config": template_data.get('sections_config'),
            "sections_order": template_data.get('sections_order'),
            "header_logo_shape": template_data.get('header_logo_shape', 'square'),
            "background_logo_shape": template_data.get('background_logo_shape', 'square')
        }
        
    base_url = str(request.base_url).rstrip('/')
    result = generate_certificate_json(**data, base_url=base_url)
    return result

@router.get("/templates/{template_id}/preview")
def preview_admin_template(
    template_id: int,
    request: Request,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Generate a preview of the global template with test data."""
    template = _get_admin_template(db, template_id)

    now = datetime.now()
    if template.category == 'recibo_suscripcion':
        # Mock data for Subscription Receipt preview
        data = {
            "certificate_type": "Recibo de Suscripción",
            "theme": template.theme or "Clásico",
            "tenant_id": 0,
            "logo_url": "https://saascrematorio.com/logo-default.png",
            "cert_number": "SAAS-REC-2026-001",
            "pet_name": "Empresa de Prueba SpA", # Using pet_name field for Tenant Name in receipts
            "pet_desc": "Plan Profesional (PRO)", # Using pet_desc for Plan Info
            "owner_name": "Juan Pérez", # Using owner_name for Admin Name
            "owner_contact": "admin@empresa-prueba.cl",
            "process_details": f"Pago procesado exitosamente el {now.strftime('%d/%m/%Y')} mediante Transferencia Bancaria.",
            "auth_declaration": template.declaration_text or "Gracias por confiar en nuestra plataforma SaaS.",
            "signature_text": template.signature_text or "Soporte SaaS Administrativo",
            "memorial_message": template.memorial_message or "",
            "memorial_title": template.memorial_title or "Transacción:",
            # Fields for sections_config
            "tenant_name": "Empresa de Prueba SpA",
            "plan_name": "Plan Profesional (PRO)",
            "amount": "$45.000",
            "payment_date": now.strftime('%d/%m/%Y'),
            "period": f"01/02/2026 - 01/03/2026",
            "header_logo_url": template.header_logo_url,
            "header_logo_x": template.header_logo_x,
            "header_logo_y": template.header_logo_y,
            "background_logo_url": template.background_logo_url,
            "background_logo_x": template.background_logo_x,
            "background_logo_y": template.background_logo_y,
            "background_logo_opacity": template.background_logo_opacity,
            "background_logo_rotation": template.background_logo_rotation,
            "paper_format": template.paper_format or "Carta",
            "title": template.title,
            "subtitle": template.subtitle,
            "farewell_text": template.farewell_text,
            "sections_config": template.sections_config,
            "sections_order": template.sections_order,
            "advantages_list": (template.sections_config or {}).get('advantages_list'),
            "header_logo_shape": template.header_logo_shape or "square",
            "background_logo_shape": template.background_logo_shape or "square"
        }
    else:
        # Mock data for Certificates
        data = {
            "certificate_type": "Certificado SaaS",
            "theme": template.theme or "Clásico",
            "tenant_id": 0,
            "logo_url": "https://saascrematorio.com/logo-default.png",
            "cert_number": "SAAS-PREVIEW-001",
            "pet_name": "Mascota de Prueba",
            "pet_desc": "Canino - Labrador",
            "owner_name": "Propietario de Prueba",
            "owner_contact": "correo@prueba.com +00 000 000 000",
            "process_details": f"Servicio realizado el día {now.strftime('%d/%m/%Y')}.",
            "auth_declaration": template.declaration_text or "Texto de prueba para declaración.",
            "signature_text": template.signature_text or "Firma SaaS Creator",
            "memorial_message": template.memorial_message or "",
            "memorial_title": template.memorial_title or "In Memoriam",
            "header_logo_url": template.header_logo_url,
            "header_logo_x": template.header_logo_x,
            "header_logo_y": template.header_logo_y,
            "background_logo_url": template.background_logo_url,
            "background_logo_x": template.background_logo_x,
            "background_logo_y": template.background_logo_y,
            "background_logo_opacity": template.background_logo_opacity,
            "background_logo_rotation": template.background_logo_rotation,
            "paper_format": template.paper_format or "Carta",
            "title": template.title,
            "subtitle": template.subtitle,
            "farewell_text": template.farewell_text,
            "sections_config": template.sections_config,
            "sections_order": template.sections_order,
            "header_logo_shape": template.header_logo_shape or "square",
            "background_logo_shape": template.background_logo_shape or "square"
        }
    
    base_url = str(request.base_url).rstrip('/')
    result = generate_certificate_json(**data, base_url=base_url)
    return result

@router.post("/upload-template-asset")
async def upload_admin_template_asset(
    file: UploadFile = File(...),
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Upload an asset (logo or background) for a global certificate template using MediaService."""
    # Temporary save for processing
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(temp_dir, f"admin_{uuid.uuid4().hex}{ext}")
    
    with open(temp_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(file.file, buffer)

    try:
        # Use MediaService with "original" mode for global templates.
        # GLOBAL a propósito: plantillas del SuperAdmin compartidas por todos los
        # tenants -> NO se pasa tenant_id (se guardan fuera de tenant_{id}/).
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="admin/template_assets",
            ratio="original",
            description="Global certificate template asset",
            alt_text="Global template asset",
            processing_mode="original",
            custom_prefix="admin_global"
        )
        return {"url": media_item.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing asset: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/upload-certificate-image")
async def upload_certificate_image(
    file: UploadFile = File(...),
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Sube la imagen de fondo para un diseño 'certificadoImg'.

    Solo admin (get_current_creator). Se guarda GLOBAL (sin tenant_id) en R2
    bajo la categoría 'ImgCertificado', en calidad original para impresión.
    El recorte/proporción (16:9, 4:3, 3:4) lo aplica el frontend antes de subir.
    """
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(temp_dir, f"certimg_{uuid.uuid4().hex}{ext}")

    with open(temp_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(file.file, buffer)

    try:
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="ImgCertificado",
            ratio="original",
            description="Imagen de fondo para certificado (certificadoImg)",
            alt_text="Fondo de certificado",
            processing_mode="original",
            custom_prefix="cert_img_global"
        )
        return {"url": media_item.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing certificate image: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/upload-design-element")
async def upload_design_element(
    file: UploadFile = File(...),
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Sube un elemento decorativo (adorno, marco, sello) para diseños certificadoImg.

    Solo admin. Se guarda GLOBAL (sin tenant_id) en R2 bajo la categoría
    'elements-design', procesado/optimizado y convertido a webp. Queda disponible
    en la biblioteca reutilizable (GET /design-elements).
    """
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(temp_dir, f"element_{uuid.uuid4().hex}{ext}")

    with open(temp_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(file.file, buffer)

    try:
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="elements-design",
            ratio="original",
            description="Elemento decorativo para certificado (certificadoImg)",
            alt_text="Elemento de diseño",
            processing_mode="original",
            custom_prefix="design_element"
        )
        return {"url": media_item.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing design element: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/design-elements")
def list_design_elements(
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Biblioteca global de elementos decorativos (categoría elements-design)."""
    from app.api.internal.common.models import MediaLibrary
    items = db.query(MediaLibrary).filter(
        MediaLibrary.category == "elements-design"
    ).order_by(MediaLibrary.created_at.desc()).all()
    return [
        {
            "id": m.id,
            "url": m.url,
            "width": m.width,
            "height": m.height,
            "created_at": m.created_at,
        }
        for m in items
    ]

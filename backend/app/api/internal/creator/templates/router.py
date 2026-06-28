from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
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

# CRUD for Certificate Templates (Global/Creator level, tenant_id=0)
@router.get("/templates", response_model=List[schemas.CertificateTemplateInDB])
def get_admin_templates(
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """List all global templates managed by the SaaS Creator."""
    return db.query(models.CertificateTemplate).filter(models.CertificateTemplate.tenant_id == None).all()

@router.post("/templates", response_model=schemas.CertificateTemplateInDB)
def create_admin_template(
    template: schemas.CertificateTemplateCreate,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Create a new global template."""
    # Logic to store advantages_list in sections_config instead of own column
    data = template.model_dump()
    adv_list = data.pop('advantages_list', None)
    
    if adv_list is not None:
        if not data.get('sections_config'):
            data['sections_config'] = {}
        # Ensure sections_config is a dict copy to avoid mutation issues
        if isinstance(data['sections_config'], dict):
            config = data['sections_config'].copy()
            config['advantages_list'] = adv_list
            data['sections_config'] = config

    db_template = models.CertificateTemplate(**data, tenant_id=None)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/templates/{template_id}", response_model=schemas.CertificateTemplateInDB)
def get_admin_template(
    template_id: int,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Get details of a specific global template."""
    db_template = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.id == template_id,
        models.CertificateTemplate.tenant_id == None
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    return db_template

@router.put("/templates/{template_id}", response_model=schemas.CertificateTemplateInDB)
def update_admin_template(
    template_id: int,
    template: schemas.CertificateTemplateUpdate,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Update a specific global template."""
    db_template = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.id == template_id,
        models.CertificateTemplate.tenant_id == None
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = template.model_dump(exclude_unset=True)
    adv_list = update_data.pop('advantages_list', None)
    
    # Handle normal fields
    for key, value in update_data.items():
        setattr(db_template, key, value)
        
    # Handle advantages_list -> sections_config
    if adv_list is not None:
        current_config = dict(db_template.sections_config or {})
        current_config['advantages_list'] = adv_list
        # Re-assign to trigger SQLAlchemy detection of change
        db_template.sections_config = current_config
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/templates/{template_id}")
def delete_admin_template(
    template_id: int,
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Delete a specific global template."""
    db_template = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.id == template_id,
        models.CertificateTemplate.tenant_id == None
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
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
    template = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.id == template_id,
        models.CertificateTemplate.tenant_id == None
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
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

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from app import schemas
from app.api.deps import get_tenant_id
from app.api.deps_features import check_feature
from typing import List, Optional
import shutil
import os
import uuid

from datetime import datetime
from app.utils import tz
from app.utils.certificates import generate_certificate_json, generate_image_certificate_html
from app.api.internal.common.media_service import MediaService

router = APIRouter()

@router.get("/")
@router.get("")  # Handle both with and without trailing slash
def obtener_todos_los_documentos(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Obtiene todos los certificados emitidos con datos de mascota y cremación + estadísticas."""
    import traceback
    try:
        # 1. Obtener Certificados (Generados por sistema)
        # Optimizamos removiendo html_content que es pesado y joinedloads rotos/innecesarios
        certs_query = db.query(
            models.Certificate.id,
            models.Certificate.cremation_id,
            models.Certificate.number,
            models.Certificate.issue_date,
            models.Certificate.created_at,
            models.Pet.name.label("pet_name"),
            models.Cremation.cremation_type.label("service_type")
        ).join(
            models.Cremation, models.Certificate.cremation_id == models.Cremation.id
        ).join(
            models.Pet, models.Cremation.pet_id == models.Pet.id
        ).filter(
            models.Certificate.tenant_id == tenant_id
        ).order_by(models.Certificate.issue_date.desc()).all()

        # 2. Obtener Documentos Subidos (Recibos, Autorizaciones, etc)
        docs_query = db.query(models.Document).filter(models.Document.tenant_id == tenant_id).all()

        documents_list = []
        for cert_id, crem_id, num, issue_d, created_at, pet_name, service_type in certs_query:
            documents_list.append({
                "id": cert_id,
                "cremation_id": crem_id,
                "number": num,
                "type": "Certificado",
                "pet_name": pet_name,
                "service_type": service_type,
                "issue_date": issue_d,
                "is_generated": True,
                "created_at": created_at
            })

        for d in docs_query:
            documents_list.append({
                "id": d.id,
                "cremation_id": d.cremation_id,
                "number": f"UPL-{d.id}",
                "type": (d.type or "documento").capitalize(),
                "pet_name": "N/A", # Podríamos unir con Pet si fuera necesario
                "service_type": "Archivo Externo",
                "issue_date": d.created_at,
                "file_url": d.file_url,
                "is_generated": False,
                "created_at": d.created_at
            })

        # 3. Calcular Estadísticas
        stats = {
            "certificados": len([d for d in documents_list if d.get("type", "").lower() == "certificado"]),
            "recibos": len([d for d in docs_query if (d.type or "").lower() == "recibo"]),
            "autorizaciones": len([d for d in docs_query if (d.type or "").lower() in ["autorización", "autorizacion"]]),
            "otros": len([d for d in docs_query if (d.type or "").lower() not in ["recibo", "autorización", "autorizacion", "certificado"]])
        }

        return {
            "documents": documents_list,
            "stats": stats
        }
    except Exception as e:
        with open("debug_docs.log", "a") as f:
            f.write(f"[{tz.get_now()}] ERROR IN obtener_todos_los_documentos:\n")
            f.write(traceback.format_exc())
            f.write("\n" + "="*50 + "\n")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/certificates/{cert_id}")
def eliminar_certificado(cert_id: int, db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    cert = db.query(models.Certificate).filter(
        models.Certificate.id == cert_id,
        models.Certificate.tenant_id == tenant_id
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    db.delete(cert)
    db.commit()
    return {"message": "Certificado eliminado"}

@router.get("/certificates/{cert_id}/content")
def obtener_contenido_certificado(cert_id: int, db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    cert = db.query(models.Certificate.html_content).filter(
        models.Certificate.id == cert_id,
        models.Certificate.tenant_id == tenant_id
    ).first()
    
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
        
    return {"html_content": cert.html_content}

@router.delete("/files/{doc_id}")
def eliminar_documento_subido(doc_id: int, db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.tenant_id == tenant_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    db.delete(doc)
    db.commit()
    return {"message": "Documento eliminado"}

@router.post("/generate", response_model=schemas.CertificateGenerateResponse)
def generar_certificado(
    req: schemas.CertificateGenerateRequest,
    request: Request,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _feat: bool = Depends(check_feature("certificados:generar_pdf"))
):
    """Genera un certificado basado en datos de la DB, manuales y plantillas."""
    try:
        # 1. Resolver Plantilla
        template = None
        if req.template_id:
            template = db.query(models.CertificateTemplate).filter(
                models.CertificateTemplate.id == req.template_id,
                or_(
                    models.CertificateTemplate.tenant_id == tenant_id,
                    models.CertificateTemplate.tenant_id.is_(None)
                )
            ).first()
        else:
            # Buscar plantilla por defecto del tenant
            template = db.query(models.CertificateTemplate).filter(
                models.CertificateTemplate.tenant_id == tenant_id,
                models.CertificateTemplate.is_default == True
            ).first()
            # Si no tiene por defecto, buscar plantilla global por defecto
            if not template:
                template = db.query(models.CertificateTemplate).filter(
                    models.CertificateTemplate.tenant_id.is_(None),
                    models.CertificateTemplate.is_default == True
                ).first()

        # 2. Obtener datos básicos del Tenant
        tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
        logo_url = tenant.logo_url if tenant and tenant.logo_url else "https://saascrematorio.com/logo-default.png"

        # 2.5 Rama especial: certificado basado en imagen (categoría certificadoImg).
        # Render = imagen de fondo + campos posicionados; el tenant puede ajustar
        # formato de fecha / fotos vía image_overrides (sin mover posiciones).
        if template and template.category == "certificadoImg":
            now = tz.get_now()
            sc = template.sections_config or {}
            aspect_ratio = sc.get("aspect_ratio", "16:9")
            fields = sc.get("fields", [])
            elements = sc.get("elements", [])

            pet = None
            cremation = None
            if req.cremation_id:
                cremation = db.query(models.Cremation).filter(
                    models.Cremation.id == req.cremation_id,
                    models.Cremation.tenant_id == tenant_id
                ).first()
                if cremation:
                    pet = db.query(models.Pet).filter(models.Pet.id == cremation.pet_id).first()

            # Recopilar fotos de la mascota (principal + galería), sin duplicados
            pet_images = []
            if pet:
                if pet.image_url:
                    pet_images.append(pet.image_url)
                if isinstance(pet.images, list):
                    pet_images.extend([img for img in pet.images if img])
                seen = set()
                pet_images = [x for x in pet_images if not (x in seen or seen.add(x))]

            cert_number = req.cert_number
            if not cert_number:
                if cremation:
                    oc_num = cremation.oc_number or cremation.id
                    cert_number = f"CREM-{now.year}-{oc_num:04d}"
                else:
                    cert_number = f"CERT-{now.strftime('%Y%m%d%H%M%S')}"

            base_url = str(request.base_url).rstrip('/')
            result = generate_image_certificate_html(
                background_url=template.background_logo_url,
                aspect_ratio=aspect_ratio,
                fields=fields,
                pet_name=req.pet_name or (pet.name if pet else ""),
                birth_date=pet.birth_date if pet else None,
                death_date=pet.death_date if pet else None,
                current_date=now,
                pet_images=pet_images,
                tenant_logo_url=logo_url,
                tenant_rut=(tenant.rut if tenant else "") or "",
                tenant_manager=(tenant.legal_rep_name if tenant else "") or "",
                tenant_manager_rut=(tenant.legal_rep_rut if tenant else "") or "",
                tenant_phone=(tenant.phone if tenant else "") or "",
                tenant_address=(tenant.address if tenant else "") or "",
                elements=elements,
                overrides=req.image_overrides,
                certificate_type=req.certificate_type,
                cert_number=cert_number,
                tenant_id=tenant_id,
                base_url=base_url,
            )

            existing_cert = db.query(models.Certificate).filter(
                models.Certificate.number == cert_number,
                models.Certificate.tenant_id == tenant_id
            ).first()
            if existing_cert:
                existing_cert.html_content = result["html_content"]
                existing_cert.issue_date = now
            else:
                db.add(models.Certificate(
                    tenant_id=tenant_id,
                    cremation_id=req.cremation_id,
                    type=req.certificate_type,
                    number=cert_number,
                    html_content=result["html_content"],
                    issue_date=now,
                ))
            db.commit()
            return result

        # 3. Inicializar variables con prioridad: Request > Template > Code Defaults
        now = tz.get_now()
        data = {
            "certificate_type": req.certificate_type,
            "theme": req.theme or (template.theme if template else "Clásico"),
            "tenant_id": tenant_id,
            "logo_url": logo_url,
            "cert_number": req.cert_number or f"CERT-{now.strftime('%Y%m%d%H%M%S')}",
            "pet_name": req.pet_name or "N/A",
            "pet_desc": req.pet_desc or "N/A",
            "owner_name": req.owner_name or "N/A",
            "owner_contact": req.owner_contact or "N/A",
            "process_details": req.process_details or "Proceso realizado según protocolos de calidad.",
            "auth_declaration": req.auth_declaration or (template.declaration_text if template and template.declaration_text else "Se certifica la autenticidad y el respeto absoluto."),
            "signature_text": req.signature_text or (template.signature_text if template and template.signature_text else f"Administración {tenant.name if tenant else 'Crematorio'}"),
            "memorial_message": req.memorial_message or (template.memorial_message if template and template.memorial_message else ""),
            "memorial_title": req.memorial_title or (template.memorial_title if template and template.memorial_title else "In Memoriam"),
            "header_logo_url": req.header_logo_url or (template.header_logo_url if template and template.header_logo_url else None),
            "header_logo_x": req.header_logo_x or (template.header_logo_x if template and template.header_logo_x else "center"),
            "header_logo_y": req.header_logo_y or (template.header_logo_y if template and template.header_logo_y else "0"),
            "background_logo_url": req.background_logo_url or (template.background_logo_url if template and template.background_logo_url else None),
            "background_logo_x": req.background_logo_x or (template.background_logo_x if template and template.background_logo_x else "50%"),
            "background_logo_y": req.background_logo_y or (template.background_logo_y if template and template.background_logo_y else "50%"),
            "background_logo_opacity": req.background_logo_opacity if req.background_logo_opacity is not None else (template.background_logo_opacity if template and template.background_logo_opacity is not None else 0.05),
            "background_logo_rotation": req.background_logo_rotation if req.background_logo_rotation is not None else (template.background_logo_rotation if template and template.background_logo_rotation is not None else -15.0),
            "paper_format": req.paper_format or (template.paper_format if template else "Carta"),
            "title": template.title if template and template.title else None,
            "subtitle": template.subtitle if template and template.subtitle else None,
            "farewell_text": req.farewell_text or (template.farewell_text if template and template.farewell_text else None),
            "sections_config": req.sections_config or (template.sections_config if template and template.sections_config else None),
            "sections_order": req.sections_order or (template.sections_order if template and template.sections_order else None),
            "header_logo_shape": req.header_logo_shape or (template.header_logo_shape if template and template.header_logo_shape else "square"),
            "background_logo_shape": req.background_logo_shape or (template.background_logo_shape if template and template.background_logo_shape else "square")
        }
        
        # 4. Autocompletar si hay cremation_id
        if req.cremation_id:
            cremation = db.query(models.Cremation).filter(models.Cremation.id == req.cremation_id).first()
            if cremation:
                if not req.cert_number:
                    oc_num = cremation.oc_number or cremation.id
                    data["cert_number"] = f"CREM-{now.year}-{oc_num:04d}"
                
                pet = db.query(models.Pet).filter(models.Pet.id == cremation.pet_id).first()
                if pet:
                    data["pet_name"] = req.pet_name or pet.name
                    data["pet_desc"] = req.pet_desc or f"{pet.species}, {pet.breed or ''}".strip(", ")
                    customer = db.query(models.Customer).filter(models.Customer.id == pet.customer_id).first()
                    if customer:
                        data["owner_name"] = req.owner_name or customer.name
                        data["owner_contact"] = req.owner_contact or f"{customer.email or ''} {customer.phone or ''}".strip()
                
                comp_date = cremation.scheduling.completed_at.strftime('%d/%m/%Y') if cremation.scheduling and cremation.scheduling.completed_at else now.strftime('%d/%m/%Y')
                data["process_details"] = req.process_details or f"Servicio de {cremation.cremation_type} realizado el día {comp_date}."

        # 5. Generar el JSON
        base_url = str(request.base_url).rstrip('/')
        result = generate_certificate_json(**data, base_url=base_url)
        
        # 6. Guardar en DB para historial
        existing_cert = db.query(models.Certificate).filter(models.Certificate.number == data["cert_number"]).first()
        if existing_cert:
            existing_cert.html_content = result["html_content"]
            existing_cert.issue_date = now
        else:
            db_cert = models.Certificate(
                tenant_id=tenant_id,
                cremation_id=req.cremation_id,
                type=data["certificate_type"],
                number=data["cert_number"],
                html_content=result["html_content"],
                issue_date=now
            )
            db.add(db_cert)
        db.commit()
        
        return result
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error en generar_certificado: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.post("/receipt")
def generar_recibo(
    req: schemas.CertificateGenerateRequest, # Reutilizamos el esquema para el cremation_id
    request: Request,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Genera un recibo/boleta detallada para una cremación."""
    try:
        if not req.cremation_id:
            raise HTTPException(status_code=400, detail="cremation_id es requerido")
            
        # 1. Obtener datos de la cremación
        cremation = db.query(models.Cremation).options(
            joinedload(models.Cremation.scheduling),
            joinedload(models.Cremation.financial),
            joinedload(models.Cremation.details),
            joinedload(models.Cremation.logistics)
        ).filter(
            models.Cremation.id == req.cremation_id,
            models.Cremation.tenant_id == tenant_id
        ).first()
        if not cremation:
            raise HTTPException(status_code=404, detail="Cremación no encontrada")
            
        # 2. Obtener Mascota y Cliente
        pet = db.query(models.Pet).filter(models.Pet.id == cremation.pet_id).first()
        customer = db.query(models.Customer).filter(models.Customer.id == pet.customer_id).first() if pet else None
        
        # 3. Datos del Tenant
        tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
        
        # 4. Detalle de Servicios (Principal y Adicionales)
        service_name = "Servicio de Cremación"
        service_price = 0.0
        additional_list = []
        first_item_found = False

        # Procesar Servicios
        for s_oc in cremation.servicios:
            if not first_item_found:
                service_name = s_oc.service.name if s_oc.service else "Servicio"
                service_price = s_oc.precio_venta
                # Si hay más de 1 cantidad, el resto va a adicionales? 
                # Por simplicidad aquí, si cantidad > 1, lo dejamos en el principal pero el precio es unitario?
                # El template multiplicará? Normalmente el template recibe precio individual y cantidad.
                # Reviso generate_receipt_html... recibe service_price como total del principal.
                first_item_found = True
            else:
                additional_list.append({
                    "name": f"{s_oc.service.name if s_oc.service else 'Servicio'} x{s_oc.cantidad}", 
                    "price": s_oc.precio_venta * s_oc.cantidad
                })

        # Procesar Planes
        for p_oc in cremation.planes:
            if not first_item_found:
                service_name = f"Plan: {p_oc.plan.name if p_oc.plan else 'Plan'}"
                service_price = p_oc.precio_venta
                first_item_found = True
            else:
                additional_list.append({
                    "name": f"Plan: {p_oc.plan.name if p_oc.plan else 'Plan'} x{p_oc.cantidad}", 
                    "price": p_oc.precio_venta * p_oc.cantidad
                })

        # 5. Servicios Adicionales
        additional_services_ids = cremation.details.additional_services if cremation.details else []
        if additional_services_ids:
            for s_id in additional_services_ids:
                asvc = db.query(models.Service).filter(models.Service.id == s_id).first()
                if asvc:
                    additional_list.append({"name": asvc.name, "price": asvc.price})
                    
        # 6. Productos
        products_list = []
        for cp in cremation.productos:
            prod = cp.product # Usar la relación si existe, o buscar
            if not prod:
                prod = db.query(models.Product).filter(models.Product.id == cp.product_id).first()
            
            products_list.append({
                "name": prod.name if prod else "Producto",
                "quantity": cp.cantidad,
                "unit_price": cp.precio_venta
            })
            
        # 7. Generar HTML
        base_url = str(request.base_url).rstrip('/')
        from app.utils.certificates import generate_receipt_html
        
        receipt_number = f"REC-{cremation.id:04d}"
        now = datetime.now()

        html_content = generate_receipt_html(
            tenant_name=tenant.name,
            tenant_rut=tenant.rut or "N/A",
            tenant_logo=tenant.logo_url,
            client_name=customer.name if customer else "N/A",
            client_rut=customer.rut if customer else "N/A",
            client_phone=customer.phone if customer else "N/A",
            client_address=(cremation.logistics.address if cremation.logistics else None) or (customer.address if customer else "N/A"),
            pet_name=pet.name if pet else "N/A",
            pet_species=pet.species if pet else "N/A",
            pet_breed=pet.breed if pet else "N/A",
            pet_weight=cremation.weight,
            service_name=service_name,
            service_price=service_price,
            additional_services=additional_list,
            products=products_list,
            discount_percent=cremation.financial.discount if cremation.financial else 0.0,
            total_price=cremation.financial.total_price if cremation.financial else 0.0,
            scheduled_at=cremation.scheduling.scheduled_at if cremation.scheduling else None,
            issue_date=now,
            receipt_number=f"REC-{(cremation.oc_number or cremation.id):04d}",
            base_url=base_url
        )
        
        # 8. Persistencia opcional
        if req.persist:
            existing_cert = db.query(models.Certificate).filter(
                models.Certificate.number == receipt_number,
                models.Certificate.tenant_id == tenant_id
            ).first()
            
            if existing_cert:
                existing_cert.html_content = html_content
                existing_cert.issue_date = now
            else:
                db_receipt = models.Certificate(
                    tenant_id=tenant_id,
                    cremation_id=req.cremation_id,
                    type="Recibo",
                    number=receipt_number,
                    html_content=html_content,
                    issue_date=now
                )
                db.add(db_receipt)
            db.commit()

        return {"html_content": html_content, "number": receipt_number}
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/{template_id}/preview")
def preview_plantilla(
    template_id: int,
    request: Request,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Genera una vista previa de la plantilla con datos de prueba."""
    template = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.id == template_id,
        models.CertificateTemplate.tenant_id == tenant_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
        
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    logo_url = tenant.logo_url if tenant and tenant.logo_url else "https://saascrematorio.com/logo-default.png"
    
    now = datetime.now()
    data = {
        "certificate_type": "Certificado",
        "theme": template.theme or "Clásico",
        "tenant_id": tenant_id,
        "logo_url": logo_url,
        "cert_number": "PREVIEW-001",
        "pet_name": "Mascota de Prueba",
        "pet_desc": "Especie, Raza",
        "owner_name": "Propietario de Prueba",
        "owner_contact": "correo@prueba.com +00 000 000 000",
        "process_details": f"Servicio realizado el día {now.strftime('%d/%m/%Y')}.",
        "auth_declaration": template.declaration_text or "Se certifica la autenticidad y el respeto absoluto.",
        "signature_text": template.signature_text or f"Administración {tenant.name if tenant else 'Crematorio'}",
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

# Endpoints CRUD para Plantillas
@router.get("/templates", response_model=List[schemas.CertificateTemplateInDB])
def obtener_plantillas(db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    return db.query(models.CertificateTemplate).filter(models.CertificateTemplate.tenant_id == tenant_id).all()

@router.post("/templates", response_model=schemas.CertificateTemplateInDB)
def crear_plantilla(template: schemas.CertificateTemplateCreate, db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    if template.is_default:
        # Desactivar otras plantillas por defecto
        db.query(models.CertificateTemplate).filter(
            models.CertificateTemplate.tenant_id == tenant_id,
            models.CertificateTemplate.is_default == True
        ).update({"is_default": False})
    
    db_template = models.CertificateTemplate(**template.model_dump(), tenant_id=tenant_id)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.put("/templates/{template_id}", response_model=schemas.CertificateTemplateInDB)
def actualizar_plantilla(template_id: int, template: schemas.CertificateTemplateUpdate, db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    db_template = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.id == template_id,
        models.CertificateTemplate.tenant_id == tenant_id
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    if template.is_default:
        db.query(models.CertificateTemplate).filter(
            models.CertificateTemplate.tenant_id == tenant_id,
            models.CertificateTemplate.is_default == True
        ).update({"is_default": False})

    for key, value in template.model_dump(exclude_unset=True).items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/templates/{template_id}")
def eliminar_plantilla(template_id: int, db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    db_template = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.id == template_id,
        models.CertificateTemplate.tenant_id == tenant_id
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    db.delete(db_template)
    db.commit()
    return {"message": "Plantilla eliminada"}

@router.get("/templates/global", response_model=List[schemas.CertificateTemplateInDB])
def obtener_plantillas_globales(db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    """
    Obtiene todas las plantillas globales creadas por el admin.
    Estas plantillas están disponibles en modo solo lectura para todos los tenants.
    """
    return db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.tenant_id == None
    ).all()

@router.post("/templates/copy/{template_id}", response_model=schemas.CertificateTemplateInDB)
def copiar_plantilla_global(
    template_id: int, 
    db: Session = Depends(get_db), 
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Copia una plantilla global al repositorio del tenant.
    Crea una nueva entrada con tenant_id del tenant actual y preserva todos los atributos de diseño.
    """
    # 1. Buscar plantilla global
    global_template = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.id == template_id,
        models.CertificateTemplate.tenant_id == None  # Asegurar que es global
    ).first()
    
    if not global_template:
        raise HTTPException(status_code=404, detail="Plantilla global no encontrada")
    
    # 2. Verificar que el tenant no tenga ya una copia de esta plantilla
    existing_copy = db.query(models.CertificateTemplate).filter(
        models.CertificateTemplate.tenant_id == tenant_id,
        models.CertificateTemplate.source_template_id == template_id
    ).first()
    
    if existing_copy:
        raise HTTPException(
            status_code=400, 
            detail="Ya tienes una copia de esta plantilla en tu biblioteca"
        )
    
    # 3. Crear copia con todos los atributos
    template_data = {
        "name": f"{global_template.name} (Copia)",
        "category": global_template.category,
        "paper_format": global_template.paper_format,
        "theme": global_template.theme,
        "title": global_template.title,
        "subtitle": global_template.subtitle,
        "declaration_text": global_template.declaration_text,
        "signature_text": global_template.signature_text,
        "memorial_message": global_template.memorial_message,
        "memorial_title": global_template.memorial_title,
        "header_logo_url": global_template.header_logo_url,
        "header_logo_x": global_template.header_logo_x,
        "header_logo_y": global_template.header_logo_y,
        "background_logo_url": global_template.background_logo_url,
        "background_logo_x": global_template.background_logo_x,
        "background_logo_y": global_template.background_logo_y,
        "background_logo_opacity": global_template.background_logo_opacity,
        "background_logo_rotation": global_template.background_logo_rotation,
        "header_logo_shape": global_template.header_logo_shape,
        "background_logo_shape": global_template.background_logo_shape,
        "farewell_text": global_template.farewell_text,
        "sections_config": global_template.sections_config,
        "sections_order": global_template.sections_order,
        "is_default": False,  # Las copias no son plantillas por defecto
        "tenant_id": tenant_id,
        "source_template_id": template_id  # Rastrear origen
    }
    
    copied_template = models.CertificateTemplate(**template_data)
    db.add(copied_template)
    db.commit()
    db.refresh(copied_template)
    
    return copied_template

@router.post("/upload-template-asset")
async def upload_template_asset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Sube un recurso (logo o fondo) para una plantilla de certificado usando el MediaService unificado."""
    # Temporales para el MediaService
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{ext}")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")

        # Sanitizar nombre de empresa para el prefijo
        company_name = re.sub(r'[^\w\s-]', '', tenant.name).strip().replace(' ', '_')

        # Para certificados usamos "original" para máxima calidad de impresión
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="template_assets",
            ratio="original",
            description=f"Recurso para plantilla de {tenant.name}",
            alt_text=f"Asset certificado {tenant.name}",
            processing_mode="original",
            custom_prefix=company_name,
            tenant_id=tenant_id
        )
        
        return {"url": media_item.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el recurso: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/{cremation_id}", response_model=List[schemas.DocumentInDB])
def obtener_documentos_cremacion(
    cremation_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Obtiene los documentos (certificados/recibos) asociados a una cremación."""
    return db.query(models.Document).filter(
        models.Document.cremation_id == cremation_id,
        models.Document.tenant_id == tenant_id
    ).all()

@router.post("/", response_model=schemas.DocumentInDB)
def crear_documento(
    doc_in: schemas.DocumentCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Registra un nuevo documento para una cremación."""
    # Verificar que la cremación exista y pertenezca al tenant
    cremation = db.query(models.Cremation).filter(
        models.Cremation.id == doc_in.cremation_id,
        models.Cremation.tenant_id == tenant_id
    ).first()
    if not cremation:
        raise HTTPException(status_code=404, detail="Cremación no encontrada")

    db_doc = models.Document(
        **doc_in.dict(),
        tenant_id=tenant_id
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@router.patch("/{document_id}", response_model=schemas.DocumentInDB)
def actualizar_documento(
    document_id: int,
    type: Optional[str] = None,
    file_url: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Actualiza los metadatos de un documento."""
    db_doc = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.tenant_id == tenant_id
    ).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if type:
        db_doc.type = type
    if file_url:
        db_doc.file_url = file_url
        
    db.commit()
    db.refresh(db_doc)
    return db_doc

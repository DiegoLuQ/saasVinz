"""
Endpoint público de contacto para el Plan Recuerdo (memorial gratuito).
Valida reCAPTCHA v3 y envía notificación por email de forma asíncrona.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from sqlalchemy.orm import Session
import uuid
import random
import string
from datetime import datetime, timedelta
import os

from app.database import get_db
from app import models
from app.services.recaptcha import verify_recaptcha
from app.services.email import send_contact_email, ContactFormData
from app.api.internal.common.media_service import MediaService

router = APIRouter()


class ContactRequest(BaseModel):
    recaptcha_token: str
    nombre_cliente: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    telefono: str = Field(..., min_length=6, max_length=20)
    nombre_mascota: str = Field(..., min_length=1, max_length=100)
    especie: str = Field(..., min_length=1, max_length=50)
    raza: str = Field(default="", max_length=80)
    fecha_nacimiento: str = Field(default="")
    fecha_fallecimiento: str = Field(..., min_length=1)
    mensaje: str = Field(..., min_length=10, max_length=1000)
    foto_base64: Optional[str] = None
    diseno: str = Field(default="editorial")


@router.post("/contact")
async def submit_contact_form(
    payload: ContactRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Recibe formulario de contacto (Plan Recuerdo gratuito).
    1. Verifica reCAPTCHA v3.
    2. Crea Cliente y Mascota en DB (tenant_id=1).
    3. Envía email de notificación en background.
    """
    # Step 1: Verify reCAPTCHA
    is_valid = await verify_recaptcha(payload.recaptcha_token)
    
    # Bypass for development/local testing if it fails
    if not is_valid and os.getenv("ENV") != "production":
        print("⚠️ reCAPTCHA failed but allowing execution (Local/Dev Mode)")
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=403,
            detail="Verificación de seguridad fallida. Por favor, intenta de nuevo."
        )

    # DEFAULT TENANT ID for public requests
    DEFAULT_TENANT_ID = 1

    # Step 2: DB Creation
    # 2.1 Find or Create Customer
    customer = db.query(models.Customer).filter(
        models.Customer.tenant_id == DEFAULT_TENANT_ID,
        models.Customer.email == payload.email
    ).first()

    if not customer:
        customer = models.Customer(
            tenant_id=DEFAULT_TENANT_ID,
            name=payload.nombre_cliente,
            email=payload.email,
            phone=payload.telefono
        )
        db.add(customer)
        db.flush() # Get ID

    # 2.2 Create Pet
    # Check if pet already exists for this customer with same name
    pet = db.query(models.Pet).filter(
        models.Pet.tenant_id == DEFAULT_TENANT_ID,
        models.Pet.customer_id == customer.id,
        models.Pet.name == payload.nombre_mascota
    ).first()

    if not pet:
        # Parse dates
        birth_dt = None
        if payload.fecha_nacimiento:
            try:
                birth_dt = datetime.fromisoformat(payload.fecha_nacimiento.replace('Z', '+00:00'))
            except: pass
            
        death_dt = None
        try:
            death_dt = datetime.fromisoformat(payload.fecha_fallecimiento.replace('Z', '+00:00'))
        except:
             raise HTTPException(status_code=400, detail="Formato de fecha de fallecimiento inválido")

        pet = models.Pet(
            tenant_id=DEFAULT_TENANT_ID,
            customer_id=customer.id,
            name=payload.nombre_mascota,
            species=payload.especie,
            breed=payload.raza,
            birth_date=birth_dt,
            death_date=death_dt,
            status=models.PetStatus.received
        )
        db.add(pet)
        db.flush()

    # 2.3 Create Initial Memorial (Draft/Processing)
    # Generate a random 6-digit PIN
    pin = ''.join(random.choices(string.digits, k=6))
    
    memorial = db.query(models.Memorial).filter(models.Memorial.id_mascota == pet.id).first()
    if not memorial:
        # Get 'free' plan
        free_plan = db.query(models.MemorialPlan).filter(models.MemorialPlan.name_db == "free").first()
        plan_id = free_plan.id if free_plan else None
        default_diseno = free_plan.default_config if free_plan else {"tema": payload.diseno}

        memorial = models.Memorial(
            id_mascota=pet.id,
            id_tenant=DEFAULT_TENANT_ID,
            plan_id=plan_id,
            plan="FREE", 
            access_key=pin,
            status=models.MemorialStatus.pending,
            msg_despedida=payload.mensaje,
            es_privado=False,
            diseno=default_diseno,
            valid_until=datetime.utcnow() + timedelta(days=30) # 1 month free
        )
        db.add(memorial)
        db.flush()

    # Step 2.4: Handle Photo Upload (New)
    if payload.foto_base64:
        try:
            # Process and upload using unified service
            image_url = await MediaService.upload_base64_media(
                db=db,
                base64_str=payload.foto_base64,
                category="memorials",
                ratio="original", # Preserve aspect for memorials
                description=f"Foto contacto {pet.name}",
                alt_text=f"Mascota {pet.name}",
                processing_mode="optimized",
                tenant_id=DEFAULT_TENANT_ID
            )
            
            # Link to records
            if image_url:
                pet.image_url = image_url
                memorial.main_image_url = image_url
                # Also add to memorial lista_imagenes
                memorial.lista_imagenes = [image_url]
        except Exception as e:
            print(f"⚠️ Error processing contact photo: {e}")
            # We don't fail the whole request for a photo error, but we log it

    db.commit()

    # Step 3: Prepare email data
    email_data = ContactFormData(
        nombre_cliente=payload.nombre_cliente,
        email=payload.email,
        telefono=payload.telefono,
        nombre_mascota=payload.nombre_mascota,
        especie=payload.especie,
        raza=payload.raza,
        fecha_nacimiento=payload.fecha_nacimiento,
        fecha_fallecimiento=payload.fecha_fallecimiento,
        mensaje=payload.mensaje,
        foto_base64=payload.foto_base64,
    )

    # Step 4: Send email
    background_tasks.add_task(send_contact_email, email_data)

    # Step 5: Generate direct memorial link
    from app.core.config import settings
    tenant = db.query(models.Tenant).filter(models.Tenant.id == DEFAULT_TENANT_ID).first()
    tenant_slug = tenant.slug if tenant else "paraiso-de-mascotas"
    pet_slug = payload.nombre_mascota.lower().replace(' ', '-')
    
    # http://domain/memorials/v/{tenant_slug}/{pet_slug}/{id_recuerdo}
    base_url = settings.FRONTEND_URL.rstrip('/')
    memorial_url = f"{base_url}/memorials/v/{tenant_slug}/{pet_slug}/{memorial.id_recuerdo}"

    return {
        "success": True,
        "message": "Tu solicitud ha sido recibida. Revisaremos la información y el memorial estará activo pronto.",
        "memorial_url": memorial_url
    }

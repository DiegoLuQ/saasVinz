from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
import os
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app import models
from app import schemas
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.internal.common.media_service import MediaService
from app.utils.upload_validation import read_and_validate_image
from typing import List

from app.api.deps_limits import check_resource_limit

router = APIRouter()

@router.get("", response_model=List[schemas.PetInDB])
def get_pets(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "view"))
):
    return (
        db.query(models.Pet)
        .filter(models.Pet.tenant_id == tenant_id)
        .order_by(models.Pet.created_at.desc(), models.Pet.id.desc())
        .all()
    )

@router.post("", response_model=schemas.PetInDB)
def create_pet(
    pet_in: schemas.PetCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "create"))
):
    # Verify customer exists for this tenant
    customer = db.query(models.Customer).filter(
        models.Customer.id == pet_in.customer_id,
        models.Customer.tenant_id == tenant_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found for this tenant")

    # Validar duplicado por nombre para el mismo dueño y tenant
    existing_pet = db.query(models.Pet).filter(
        models.Pet.tenant_id == tenant_id,
        models.Pet.customer_id == pet_in.customer_id,
        models.Pet.name == pet_in.name
    ).first()
    if existing_pet:
        raise HTTPException(
            status_code=400,
            detail=f"El cliente ya tiene una mascota registrada con el nombre '{pet_in.name}'."
        )

    db_pet = models.Pet(
        **pet_in.dict(),
        tenant_id=tenant_id
    )
    db.add(db_pet)
    db.commit()
    db.refresh(db_pet)
    return db_pet

@router.patch("/{pet_id}", response_model=schemas.PetInDB)
def actualizar_mascota(
    pet_id: int,
    pet_update: schemas.PetUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "edit"))
):
    """Actualiza parcialmente los datos de una mascota."""
    db_pet = db.query(models.Pet).filter(
        models.Pet.id == pet_id,
        models.Pet.tenant_id == tenant_id
    ).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")

    update_data = pet_update.dict(exclude_unset=True)

    # Validar duplicados si se cambia el nombre para el mismo dueño y tenant
    if "name" in update_data and update_data["name"] != db_pet.name:
        existing = db.query(models.Pet).filter(
            models.Pet.tenant_id == tenant_id,
            models.Pet.customer_id == db_pet.customer_id,
            models.Pet.name == update_data["name"],
            models.Pet.id != pet_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"El cliente ya tiene otra mascota registrada con el nombre '{update_data['name']}'."
            )

    for key, value in update_data.items():
        setattr(db_pet, key, value)
    
    db.commit()
    db.refresh(db_pet)
    return db_pet

@router.post("/upload-image")
async def upload_image(
    pet_name: str,
    customer_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Sube una imagen de mascota usando el MediaService unificado."""
    # Validar por contenido real (magic bytes) + tamaño, no por filename del cliente.
    content, ext = await read_and_validate_image(file)

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    import uuid
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}.{ext}")

    with open(temp_path, "wb") as buffer:
        buffer.write(content)

    try:
        # Normalizar nombre para el prefijo del archivo
        safe_name = "".join(c for c in pet_name if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_").lower()
        
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="pets",
            ratio="1:1", # Forzado para mascotas
            description=f"Imagen para {pet_name}",
            alt_text=f"Foto de {pet_name}",
            processing_mode="optimized",
            custom_prefix=f"{safe_name}_{customer_id}",
            tenant_id=tenant_id
        )
        return {"image_url": media_item.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar la imagen: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.delete("/delete-image")
def delete_image(
    image_path: str,
    pet_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Elimina una imagen física y actualiza la mascota (solo si pertenece al tenant)."""
    # 1. Verificar que la mascota pertenezca al tenant
    db_pet = db.query(models.Pet).filter(
        models.Pet.id == pet_id,
        models.Pet.tenant_id == tenant_id
    ).first()

    if not db_pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada o no pertenece al tenant")

    # 2. Seguridad: Verificar que la imagen pertenezca a la mascota antes de borrar físicamente
    # Esto es crucial para evitar borrar archivos de otros tenants o recursos
    if not db_pet.images or image_path not in db_pet.images:
        raise HTTPException(status_code=403, detail="La imagen no pertenece a esta mascota")

    # 3. Eliminar imagen (soporta R2 y MediaLibrary)
    from app.api.internal.common.models import MediaLibrary
    media_item = db.query(MediaLibrary).filter(MediaLibrary.url == image_path).first()
    
    if media_item:
        MediaService.delete_media(db, media_item)
    else:
        # Fallback para imágenes legacy que no están en MediaLibrary
        from app.utils.images import delete_physical_file
        delete_physical_file(image_path)

    # 4. Actualizar base de datos
    new_images = [img for img in db_pet.images if img != image_path]
    db_pet.images = new_images
    
    # Si la imagen borrada era la principal, actualizar image_url con la siguiente disponible o None
    if db_pet.image_url == image_path:
        db_pet.image_url = new_images[0] if new_images else None
        
    db.commit()
    db.refresh(db_pet)

    return {"status": "deleted"}

@router.get("/{pet_id}/delete-preview")
def preview_delete_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "delete"))
):
    """Qué se eliminará junto con la mascota (para el modal de confirmación)."""
    from app.api.internal.crm.pets import purge
    db_pet = db.query(models.Pet).filter(models.Pet.id == pet_id, models.Pet.tenant_id == tenant_id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    return purge.preview(db, tenant_id, db_pet)


@router.delete("/{pet_id}")
def delete_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    _: bool = Depends(check_permission("mascotas", "delete"))
):
    """Elimina la mascota y TODO lo asociado: órdenes (con evidencias, certificados,
    comisión, etc.), memoriales, solicitudes web e imágenes en Cloudflare R2.
    Si tiene órdenes, además exige permiso para eliminar órdenes."""
    from app.api.internal.crm.pets import purge
    db_pet = db.query(models.Pet).filter(models.Pet.id == pet_id, models.Pet.tenant_id == tenant_id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")

    has_orders = db.query(models.Cremation.id).filter(
        models.Cremation.pet_id == pet_id, models.Cremation.tenant_id == tenant_id
    ).first() is not None
    if has_orders:
        # Misma regla que el resto de la app para borrar órdenes
        check_permission("ordenes", "delete")(db=db, current_user=current_user)

    name = db_pet.name
    summary = purge.purge(db, tenant_id, db_pet)
    return {"status": "deleted", "message": f"Mascota {name} eliminada correctamente", **summary}

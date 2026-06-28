from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
import os
import shutil
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.internal.common.media_service import MediaService
from typing import List

from app.api.deps_limits import check_resource_limit

router = APIRouter()

@router.get("", response_model=List[schemas.PetInDB])
def get_pets(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "view"))
):
    return db.query(models.Pet).filter(models.Pet.tenant_id == tenant_id).all()

@router.post("", response_model=schemas.PetInDB)
def create_pet(
    pet_in: schemas.PetCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "create")),
    __: bool = Depends(check_resource_limit("pets"))
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
    # Temporary save for the orchestrator
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    import uuid
    import time
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{ext}")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

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

@router.delete("/{pet_id}")
def delete_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "delete"))
):
    """Elimina una mascota si no tiene servicios asociados."""
    # 1. Verificar existencia
    db_pet = db.query(models.Pet).filter(
        models.Pet.id == pet_id,
        models.Pet.tenant_id == tenant_id
    ).first()
    
    if not db_pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")

    # 2. Verificar dependencias (Cremaciones)
    cremation_exists = db.query(models.Cremation).filter(
        models.Cremation.pet_id == pet_id,
        models.Cremation.tenant_id == tenant_id
    ).first()

    if cremation_exists:
        raise HTTPException(
            status_code=409, 
            detail="No se puede eliminar la mascota porque tiene servicios asociados."
        )

    # 3. Eliminar imágenes (soporta R2 y MediaLibrary)
    from app.api.internal.common.models import MediaLibrary
    
    # Imagen principal
    if db_pet.image_url:
        m_item = db.query(MediaLibrary).filter(MediaLibrary.url == db_pet.image_url).first()
        if m_item: MediaService.delete_media(db, m_item)
        else:
            MediaService.delete_media_by_url(db, db_pet.image_url)
        
    # Galería
    if db_pet.images:
        for image_path in db_pet.images:
            m_item = db.query(MediaLibrary).filter(MediaLibrary.url == image_path).first()
            if m_item: MediaService.delete_media(db, m_item)
            else:
                from app.utils.images import delete_physical_file
                delete_physical_file(image_path)

    # 4. Eliminar registro
    db.delete(db_pet)
    db.commit()

    return {"status": "deleted", "message": f"Mascota {db_pet.name} eliminada correctamente"}

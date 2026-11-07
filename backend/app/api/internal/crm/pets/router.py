from typing import Optional
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
from pydantic import BaseModel

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

# --- Fotos de mascotas para descargar (antes de /{pet_id}) ---

@router.get("/photos")
def list_pet_photos(
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "view"))
):
    """Fotos de las mascotas (10 por página), filtradas por mascota o dueño."""
    from app.services.pet_photos import photo_rows, ZIP_MAX_PHOTOS
    page = max(1, page)
    page_size = max(1, min(page_size, 50))
    rows = photo_rows(db, tenant_id, q)
    start = (page - 1) * page_size
    return {
        "total": len(rows),
        "pets": len({r["pet_id"] for r in rows}),
        "page": page,
        "page_size": page_size,
        "zip_max": ZIP_MAX_PHOTOS,
        "items": rows[start:start + page_size],
    }


@router.get("/photos/download")
def download_pet_photos(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "view"))
):
    """ZIP con todas las fotos del filtro (máx. ZIP_MAX_PHOTOS)."""
    from fastapi import Response
    from app.services.pet_photos import photo_rows, build_zip, ZIP_MAX_PHOTOS
    rows = photo_rows(db, tenant_id, q)
    if not rows:
        raise HTTPException(status_code=404, detail="No hay fotos para descargar")
    if len(rows) > ZIP_MAX_PHOTOS:
        raise HTTPException(status_code=400, detail=f"Son {len(rows)} fotos: filtra por mascota o dueño para descargar hasta {ZIP_MAX_PHOTOS} a la vez")
    data, added = build_zip(rows)
    if not added:
        raise HTTPException(status_code=404, detail="No se pudieron leer las fotos")
    return Response(
        content=data,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="fotos-mascotas.zip"',
            "X-Photos-Count": str(added),
            "Access-Control-Expose-Headers": "X-Photos-Count, Content-Disposition",
        },
    )


@router.get("/{pet_id}/photos/{index}/download")
def download_pet_photo(
    pet_id: int,
    index: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "view"))
):
    """Una foto de la mascota como archivo (el navegador no puede forzar la
    descarga de una URL de otro dominio)."""
    from fastapi import Response
    from app.services.pet_photos import photo_rows, fetch_photo
    pet = db.query(models.Pet).filter(models.Pet.id == pet_id, models.Pet.tenant_id == tenant_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    row = next((r for r in photo_rows(db, tenant_id) if r["pet_id"] == pet_id and r["index"] == index), None)
    data = fetch_photo(row["url"]) if row else None
    if not data:
        raise HTTPException(status_code=404, detail="Foto no disponible")
    ext = row["filename"].rsplit(".", 1)[-1]
    media = {"jpg": "image/jpeg", "png": "image/png", "gif": "image/gif", "avif": "image/avif"}.get(ext, "image/webp")
    return Response(content=data, media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="{row["filename"]}"'})


@router.get("/{pet_id}", response_model=schemas.PetInDB)
def get_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "view"))
):
    pet = db.query(models.Pet).filter(models.Pet.id == pet_id, models.Pet.tenant_id == tenant_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    return pet

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

class MainImageIn(BaseModel):
    url: str


@router.put("/{pet_id}/main-image", response_model=schemas.PetInDB)
def elegir_foto_principal(
    pet_id: int,
    body: MainImageIn,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("mascotas", "edit"))
):
    """Marca una de sus fotos como principal: queda primera en `images` y en
    `image_url` (la que usan certificado, plantillas, IA, memorial y seguimiento).
    No borra ni sube fotos."""
    db_pet = db.query(models.Pet).filter(models.Pet.id == pet_id, models.Pet.tenant_id == tenant_id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    images = [i for i in (db_pet.images or []) if i]
    if db_pet.image_url and db_pet.image_url not in images:
        images.insert(0, db_pet.image_url)   # la principal antigua no se pierde
    if body.url not in images:
        raise HTTPException(status_code=400, detail="La foto no pertenece a esta mascota")
    db_pet.images = [body.url] + [i for i in images if i != body.url]
    db_pet.image_url = body.url
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

def _customer_to_delete(db: Session, tenant_id: int, pet: models.Pet, current_user) -> Optional[models.Customer]:
    """El cliente de la mascota se borra con ella si no tiene otras mascotas y el usuario
    puede eliminar clientes (p. ej. un cliente duplicado creado junto a una mascota repetida)."""
    customer = db.query(models.Customer).filter(
        models.Customer.id == pet.customer_id, models.Customer.tenant_id == tenant_id
    ).first()
    if not customer:
        return None
    others = db.query(models.Pet.id).filter(
        models.Pet.customer_id == customer.id, models.Pet.tenant_id == tenant_id, models.Pet.id != pet.id
    ).first()
    if others is not None:
        return None
    try:
        check_permission("clientes", "delete")(db=db, current_user=current_user)
    except HTTPException:
        return None
    return customer


@router.get("/{pet_id}/delete-preview")
def preview_delete_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    _: bool = Depends(check_permission("mascotas", "delete"))
):
    """Qué se eliminará junto con la mascota (para el modal de confirmación)."""
    from app.api.internal.crm.pets import purge
    db_pet = db.query(models.Pet).filter(models.Pet.id == pet_id, models.Pet.tenant_id == tenant_id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    data = purge.preview(db, tenant_id, db_pet)
    customer = db.query(models.Customer).filter(
        models.Customer.id == db_pet.customer_id, models.Customer.tenant_id == tenant_id
    ).first()
    to_delete = _customer_to_delete(db, tenant_id, db_pet, current_user)
    data["customer"] = {"id": customer.id, "name": customer.name, "deleted": to_delete is not None} if customer else None
    return data


@router.delete("/{pet_id}")
def delete_pet(
    pet_id: int,
    keep_photos: bool = False,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    _: bool = Depends(check_permission("mascotas", "delete"))
):
    """Elimina una mascota SIN órdenes: sus fotos, memoriales, solicitudes web e imágenes en
    Cloudflare R2, y su cliente si no tiene otras mascotas. Con órdenes responde 409: se
    eliminan desde Recepción de pedidos (borrar la orden con alcance «mascota»)."""
    from app.api.internal.crm.pets import purge
    db_pet = db.query(models.Pet).filter(models.Pet.id == pet_id, models.Pet.tenant_id == tenant_id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")

    has_orders = db.query(models.Cremation.id).filter(
        models.Cremation.pet_id == pet_id, models.Cremation.tenant_id == tenant_id
    ).first() is not None
    if has_orders:
        raise HTTPException(
            status_code=409,
            detail=f"{db_pet.name} tiene órdenes asociadas y no se puede eliminar. "
                   "Elimina primero sus órdenes desde Recepción de pedidos.",
        )

    name = db_pet.name
    summary = purge.purge(db, tenant_id, db_pet, customer=_customer_to_delete(db, tenant_id, db_pet, current_user),
                          keep_photos=keep_photos)
    return {"status": "deleted", "message": f"Mascota {name} eliminada correctamente", **summary}

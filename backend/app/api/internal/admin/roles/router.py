from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, auth
from typing import Optional
from pydantic import BaseModel

router = APIRouter()

SYSTEM_KEYS = {"admin", "creator"}


class RoleUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    label: Optional[str] = None


@router.get("/enabled")
def list_enabled_roles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Roles habilitados (para poblar selectores). Cualquier usuario autenticado."""
    roles = db.query(models.Role).filter(
        models.Role.is_enabled == True  # noqa: E712
    ).order_by(models.Role.is_system.desc(), models.Role.label).all()
    return [{"key": r.key, "label": r.label, "is_system": r.is_system} for r in roles]


@router.get("")
def list_roles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_creator),
):
    """Lista todos los roles con metadatos y conteos de uso. Solo Creador."""
    roles = db.query(models.Role).order_by(
        models.Role.is_system.desc(), models.Role.label
    ).all()
    result = []
    for r in roles:
        user_count = db.query(models.User).filter(models.User.role == r.key).count()
        bp_count = db.query(models.RoleModuleBlueprint).filter(
            models.RoleModuleBlueprint.role == r.key
        ).count()
        result.append({
            "key": r.key,
            "label": r.label,
            "description": r.description,
            "is_system": r.is_system,
            "is_enabled": r.is_enabled,
            "user_count": user_count,
            "blueprint_count": bp_count,
        })
    return result


@router.patch("/{key}")
def update_role(
    key: str,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_creator),
):
    """Habilita/deshabilita o renombra un rol. Solo Creador. Sistema no se deshabilita."""
    role = db.query(models.Role).filter(models.Role.key == key).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    if role.is_system and data.is_enabled is False:
        raise HTTPException(status_code=400, detail="No se puede deshabilitar un rol de sistema.")

    if data.is_enabled is not None:
        role.is_enabled = data.is_enabled
    if data.label is not None:
        label = data.label.strip()
        if not label:
            raise HTTPException(status_code=400, detail="La etiqueta no puede estar vacía.")
        role.label = label

    db.commit()
    return {"status": "success", "key": role.key, "is_enabled": role.is_enabled, "label": role.label}


@router.delete("/{key}")
def delete_role(
    key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_creator),
):
    """
    'Elimina' un rol: solo si no es de sistema y no tiene usuarios. Como el rol es
    un valor de enum embebido en el código, no se borra del sistema; se desactiva
    y se limpian sus filas de blueprint y de configuración por tenant.
    """
    role = db.query(models.Role).filter(models.Role.key == key).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    if role.is_system:
        raise HTTPException(status_code=400, detail="No se puede eliminar un rol de sistema.")

    user_count = db.query(models.User).filter(models.User.role == key).count()
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar: {user_count} usuario(s) tienen este rol. Reasígnalos primero.",
        )

    try:
        bp_deleted = db.query(models.RoleModuleBlueprint).filter(
            models.RoleModuleBlueprint.role == key
        ).delete(synchronize_session=False)
        cfg_deleted = db.query(models.TenantModuleConfig).filter(
            models.TenantModuleConfig.role == key
        ).delete(synchronize_session=False)
        role.is_enabled = False
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar el rol: {e}")

    return {
        "status": "deleted",
        "key": key,
        "blueprint_removed": bp_deleted,
        "config_removed": cfg_deleted,
    }

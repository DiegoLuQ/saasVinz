"""
SuperAdmin (Creator): tarjetas de homenaje.

- Globales (tenant_id NULL): visibles para todos los tenants.
- Exclusivas (tenant_id + is_locked): copia personalizada para un crematorio;
  solo el SuperAdmin la edita. Se crean con POST /{id}/customize.
- sys_tenants.form_farewell_template_id indica qué tarjeta usa el formulario
  público de cada crematorio (NULL = global predeterminada).
"""
import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from pydantic import BaseModel

from app.database import get_db
from app import models, schemas
from app.auth import get_current_creator
from app.core.config import settings
from app.utils.r2 import upload_file_to_r2
from app.api.internal.common.media_service import MediaService
from app.core.tenant_context import apply_bypass_rls

router = APIRouter()


@router.post("/upload-background")
async def upload_farewell_background(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Sube una imagen de fondo para plantillas de despedida globales.

    Devuelve la URL pública R2. El SuperAdmin luego hace PATCH sobre la
    plantilla con `config.backgroundImage.url` apuntando a esa URL.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    safe_name = (file.filename or "background").replace("\\", "/").split("/")[-1]
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}_{safe_name}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Utilizar MediaService para optimizar, subir a R2 e insertar el registro en la base de datos
        # Se guarda bajo la categoría "backgrounds" para que se liste en la biblioteca de medios.
        # GLOBAL a propósito: fondos de plantillas de despedida globales (SuperAdmin)
        # -> NO se pasa tenant_id (compartidos por todos los tenants).
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="backgrounds",
            ratio="original",
            description=f"Fondo de despedida: {safe_name}",
            alt_text="Fondo de plantilla de despedida global",
            processing_mode="original"
        )

        return {"url": media_item.url}
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


class FarewellTemplateAdmin(schemas.FarewellTemplate):
    tenant_name: Optional[str] = None
    # Crematorios cuyo formulario usa esta tarjeta (asignación explícita o,
    # para la global predeterminada, los que no tienen otra)
    form_tenants: List[dict] = []
    is_form_fallback: bool = False


class CustomizeRequest(BaseModel):
    tenant_id: int


class AssignFormRequest(BaseModel):
    tenant_id: int
    template_id: Optional[int] = None  # None = volver a la global predeterminada


def _get_template(db: Session, template_id: int) -> models.FarewellTemplate:
    apply_bypass_rls(db)  # las exclusivas tienen RLS por tenant
    t = db.query(models.FarewellTemplate).filter(models.FarewellTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return t


@router.get("", response_model=List[FarewellTemplateAdmin])
def list_farewell_templates(
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Globales + exclusivas de cada crematorio, con qué formularios las usan."""
    from app.api.public.tenants.router import resolve_farewell_template

    apply_bypass_rls(db)
    templates = (
        db.query(models.FarewellTemplate)
        .order_by(models.FarewellTemplate.tenant_id.is_(None).desc(), models.FarewellTemplate.created_at.desc())
        .all()
    )
    tenants = db.query(models.Tenant).order_by(models.Tenant.name).all()
    names = {t.id: t.name for t in tenants}

    # Tarjeta efectiva del formulario de cada crematorio
    usage: dict[int, list[dict]] = {}
    fallback_ids: set[int] = set()
    for t in tenants:
        eff = resolve_farewell_template(db, t.id)
        if not eff:
            continue
        usage.setdefault(eff.id, []).append({"id": t.id, "name": t.name, "explicit": t.form_farewell_template_id == eff.id})
        if t.form_farewell_template_id != eff.id and eff.tenant_id is None:
            fallback_ids.add(eff.id)

    out = []
    for tpl in templates:
        item = FarewellTemplateAdmin.model_validate(tpl)
        item.tenant_name = names.get(tpl.tenant_id)
        item.form_tenants = usage.get(tpl.id, [])
        item.is_form_fallback = tpl.id in fallback_ids
        out.append(item)
    return out


@router.get("/{template_id}", response_model=schemas.FarewellTemplate)
def get_farewell_template_admin(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    return _get_template(db, template_id)


@router.post("", response_model=schemas.FarewellTemplate)
def create_global_farewell_template(
    template_in: schemas.FarewellTemplateCreate,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Crea una plantilla global (tenant_id NULL)."""
    if template_in.is_default:
        db.query(models.FarewellTemplate).filter(
            models.FarewellTemplate.tenant_id.is_(None)
        ).update({"is_default": False})

    db_template = models.FarewellTemplate(
        **template_in.dict(),
        tenant_id=None,
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.patch("/{template_id}", response_model=schemas.FarewellTemplate)
def update_farewell_template_admin(
    template_id: int,
    template_update: schemas.FarewellTemplateUpdate,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Edita una global o una exclusiva. "Predeterminada" solo aplica a globales."""
    db_template = _get_template(db, template_id)
    update_data = template_update.dict(exclude_unset=True)
    if update_data.get("is_default") is True:
        if db_template.tenant_id is not None:
            raise HTTPException(status_code=400, detail="Solo una plantilla global puede ser la predeterminada")
        db.query(models.FarewellTemplate).filter(
            models.FarewellTemplate.tenant_id.is_(None),
            models.FarewellTemplate.id != template_id,
        ).update({"is_default": False})

    for key, value in update_data.items():
        setattr(db_template, key, value)

    db.commit()
    db.refresh(db_template)
    return db_template


@router.delete("/{template_id}")
def delete_farewell_template_admin(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Elimina una global o exclusiva. Los formularios que la usaban vuelven a la
    global predeterminada (FK ON DELETE SET NULL)."""
    db_template = _get_template(db, template_id)
    db.query(models.Tenant).filter(models.Tenant.form_farewell_template_id == template_id).update(
        {"form_farewell_template_id": None}
    )
    db.delete(db_template)
    db.commit()
    return {"status": "deleted", "message": "Plantilla eliminada correctamente"}


@router.post("/{template_id}/customize", response_model=schemas.FarewellTemplate)
def customize_for_tenant(
    template_id: int,
    body: CustomizeRequest,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Copia exclusiva de una tarjeta para un crematorio (solo el SuperAdmin la
    edita) y la asigna a su formulario."""
    source = _get_template(db, template_id)
    tenant = db.query(models.Tenant).filter(models.Tenant.id == body.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Crematorio no encontrado")

    base_name = source.name.split(" · ")[0]
    copy = models.FarewellTemplate(
        tenant_id=tenant.id,
        name=f"{base_name} · {tenant.name}"[:120],
        description=f"Tarjeta del formulario de {tenant.name}",
        config=dict(source.config or {}),
        preview_url=source.preview_url,
        is_default=False,
        is_locked=True,
    )
    db.add(copy)
    db.flush()
    tenant.form_farewell_template_id = copy.id
    db.commit()
    db.refresh(copy)
    return copy


@router.put("/form-assignment")
def assign_form_template(
    body: AssignFormRequest,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Qué tarjeta usa el formulario de un crematorio: una global o una de sus
    exclusivas. template_id None = global predeterminada."""
    apply_bypass_rls(db)
    tenant = db.query(models.Tenant).filter(models.Tenant.id == body.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Crematorio no encontrado")
    if body.template_id is not None:
        tpl = _get_template(db, body.template_id)
        if tpl.tenant_id not in (None, tenant.id):
            raise HTTPException(status_code=400, detail="Esa plantilla es exclusiva de otro crematorio")
    tenant.form_farewell_template_id = body.template_id
    db.commit()
    return {"tenant_id": tenant.id, "form_farewell_template_id": tenant.form_farewell_template_id}

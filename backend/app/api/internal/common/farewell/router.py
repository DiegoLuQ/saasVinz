from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app import models
from app import schemas
from app.api.deps import get_tenant_id
from app.api.deps_features import check_feature
from typing import List

router = APIRouter()

@router.get("", response_model=List[schemas.FarewellTemplate])
def get_farewell_templates(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    # Plantillas propias del tenant + GLOBALES del sistema (tenant_id IS NULL).
    return db.query(models.FarewellTemplate).filter(
        or_(
            models.FarewellTemplate.tenant_id == tenant_id,
            models.FarewellTemplate.tenant_id.is_(None),
        )
    ).all()

@router.get("/{template_id}", response_model=schemas.FarewellTemplate)
def get_farewell_template(
    template_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    db_template = db.query(models.FarewellTemplate).filter(
        models.FarewellTemplate.id == template_id,
        models.FarewellTemplate.tenant_id == tenant_id
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return db_template

@router.post("", response_model=schemas.FarewellTemplate)
def create_farewell_template(
    template_in: schemas.FarewellTemplateCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _feat: bool = Depends(check_feature("certificados:diseno"))
):
    db_template = models.FarewellTemplate(
        **template_in.dict(),
        tenant_id=tenant_id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.patch("/{template_id}", response_model=schemas.FarewellTemplate)
def update_farewell_template(
    template_id: int,
    template_update: schemas.FarewellTemplateUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    db_template = db.query(models.FarewellTemplate).filter(
        models.FarewellTemplate.id == template_id,
        models.FarewellTemplate.tenant_id == tenant_id
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    update_data = template_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.patch("/by-name/{name}", response_model=schemas.FarewellTemplate)
def update_farewell_template_by_name(
    name: str,
    template_update: schemas.FarewellTemplateUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Actualiza una plantilla buscando por su nombre dentro del tenant."""
    # Encode name for URL safety if needed, though FastAPI handles it
    db_template = db.query(models.FarewellTemplate).filter(
        models.FarewellTemplate.name == name,
        models.FarewellTemplate.tenant_id == tenant_id
    ).first()
    
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada por nombre")

    update_data = template_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}")
def delete_farewell_template(
    template_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    db_template = db.query(models.FarewellTemplate).filter(
        models.FarewellTemplate.id == template_id,
        models.FarewellTemplate.tenant_id == tenant_id
    ).first()
    
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    db.delete(db_template)
    db.commit()

    return {"status": "deleted", "message": "Plantilla eliminada correctamente"}
@router.get("/{template_id}/preview")
def preview_farewell_template(
    template_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    db_template = db.query(models.FarewellTemplate).filter(
        models.FarewellTemplate.id == template_id,
        models.FarewellTemplate.tenant_id == tenant_id
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    # Simple HTML preview for farewell
    config = db_template.config or {}
    bg_color = config.get("bg_color", "#fafafa")
    text_color = config.get("text_color", "#333")
    font_family = config.get("font_family", "Georgia, serif")
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ 
                margin: 0; 
                padding: 40px; 
                background-color: {bg_color}; 
                color: {text_color}; 
                font-family: {font_family};
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                text-align: center;
            }}
            .card {{
                max-width: 600px;
                padding: 40px;
                background: white;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                border-radius: 12px;
                line-height: 1.8;
                border: 4px double {text_color}33;
            }}
            h1 {{ font-size: 24px; margin-bottom: 20px; opacity: 0.8; }}
            .message {{ font-size: 20px; font-style: italic; white-space: pre-wrap; }}
            .footer {{ margin-top: 30px; font-size: 14px; opacity: 0.6; }}
            @page {{ size: Carta; margin: 0; }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Mensaje de Conmemoración</h1>
            <div class="message">"{db_template.description or 'Escribe aquí tus palabras de despedida...'}"</div>
            <div class="footer">
                --- Tributo en Memoria ---
            </div>
        </div>
    </body>
    </html>
    """
    return {"html_content": html}

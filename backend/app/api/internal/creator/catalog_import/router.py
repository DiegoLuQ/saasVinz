"""
Carga masiva del catálogo de un tenant (servicios + productos) — SOLO SuperAdmin.

El tenant se resuelve bajo el bypass de get_current_creator; a partir de ahí la
sesión se cambia al RLS estricto del tenant destino (apply_tenant_rls), de modo
que las lecturas de duplicados y las inserciones quedan confinadas a ese tenant.
"""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_creator
from app.core.tenant_context import apply_tenant_rls
from app.database import get_db
from app.api.internal.creator.catalog_import import services

router = APIRouter()

MAX_FILE_BYTES = 5 * 1024 * 1024
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _resolve_tenant(identifier: str, db: Session) -> models.Tenant:
    if identifier and identifier.isdigit():
        tenant = db.query(models.Tenant).filter(models.Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(models.Tenant).filter(models.Tenant.slug == identifier).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado.")
    return tenant


@router.get("/catalog-import/template")
def download_template(creator: models.User = Depends(get_current_creator)):
    return Response(
        content=services.build_template(),
        media_type=XLSX_MIME,
        headers={"Content-Disposition": 'attachment; filename="plantilla_catalogo_vinzer.xlsx"'},
    )


@router.post("/tenants/{identifier}/catalog-import")
async def import_catalog(
    identifier: str,
    file: UploadFile = File(...),
    dry_run: bool = Query(True, description="True = solo validar y previsualizar"),
    creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    if not (file.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Sube un archivo .xlsx (usa la plantilla).")
    content = await file.read(MAX_FILE_BYTES + 1)
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="El archivo supera los 5 MB.")

    tenant = _resolve_tenant(identifier, db)
    tenant_id, tenant_info = tenant.id, {"id": tenant.id, "name": tenant.name, "slug": tenant.slug}
    apply_tenant_rls(db, tenant_id)

    try:
        result = services.process_import(db, tenant_id, content, dry_run=dry_run)
    except services.ImportFileError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result["tenant"] = tenant_info
    return result

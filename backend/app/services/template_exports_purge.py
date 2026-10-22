"""Borrado de todo lo creado con una plantilla de imagen (SuperAdmin).

Elimina, en todos los crematorios, los registros de `sys_template_exports` de la
plantilla (diseños/recetas e ilustraciones IA guardadas) y sus archivos en R2.
Las generaciones IA se conservan como historial de consumo y cobro, pero sin la
imagen (igual que al borrar una mascota, ver crm/pets/purge.py).

Orden: primero la base de datos en una transacción; recién confirmada se borran
los archivos, y solo los que ningún otro registro sigue usando.
"""
from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.api.internal.crm.pets.purge import _still_referenced


def _stored(url: str | None) -> bool:
    return bool(url) and (url.startswith("http") or url.startswith("/storage") or url.startswith("/static"))


def _collect(db: Session, template_id: int) -> dict:
    exports = db.query(models.TemplateExport).filter(models.TemplateExport.template_id == template_id).all()
    generations = db.query(models.AiGeneration).filter(
        models.AiGeneration.template_id == template_id,
        (models.AiGeneration.media_url.isnot(None)) | (models.AiGeneration.pending_image.isnot(None)),
    ).all()
    urls: list[str] = []
    for u in [e.media_url for e in exports] + [g.media_url for g in generations]:
        if _stored(u) and u not in urls:
            urls.append(u)
    return {"exports": exports, "generations": generations, "urls": urls}


def preview(db: Session, template_id: int) -> dict:
    g = _collect(db, template_id)
    size = 0
    if g["urls"]:
        size = db.query(func.coalesce(func.sum(models.MediaLibrary.file_size), 0)).filter(
            models.MediaLibrary.url.in_(g["urls"])
        ).scalar() or 0
    tenant_ids = {e.tenant_id for e in g["exports"]} | {x.tenant_id for x in g["generations"]}
    names = dict(db.query(models.Tenant.id, models.Tenant.name).filter(models.Tenant.id.in_(tenant_ids or {0})).all())
    return {
        "designs": sum(1 for e in g["exports"] if e.kind == "design"),
        "illustrations": sum(1 for e in g["exports"] if e.kind == "illustration"),
        "others": sum(1 for e in g["exports"] if e.kind not in ("design", "illustration")),
        "generations_with_image": len(g["generations"]),
        "files": len(g["urls"]),
        "bytes": int(size),
        "tenants": sorted(names.get(t, f"Crematorio #{t}") for t in tenant_ids),
    }


def purge(db: Session, tpl: models.ImageTemplate, *, unlock: bool) -> dict:
    from app.api.internal.common.media_service import MediaService

    g = _collect(db, tpl.id)
    summary = {"exports_deleted": len(g["exports"]), "files_found": len(g["urls"])}
    for e in g["exports"]:
        db.delete(e)
    for gen in g["generations"]:
        gen.media_url = None      # el registro de consumo IA se conserva, sin la imagen
        gen.pending_image = None
    if unlock:
        # Sin diseños que se redibujen con ella, se puede volver a editar.
        tpl.usage_count = 0
    db.commit()

    deleted = kept = failed = 0
    for url in g["urls"]:
        try:
            if _still_referenced(db, url):
                kept += 1
                continue
            if MediaService.delete_media_by_url(db, url):
                deleted += 1
            else:
                failed += 1
        except Exception as e:  # un archivo que falle no revierte lo ya borrado
            print(f"[purge template {tpl.id}] no se pudo borrar {url}: {e}")
            failed += 1
    summary.update({"files_deleted": deleted, "files_kept_shared": kept, "files_failed": failed,
                    "unlocked": unlock})
    return summary

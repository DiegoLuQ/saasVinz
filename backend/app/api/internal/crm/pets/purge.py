"""Eliminación completa de una mascota y todo lo asociado.

Incluye sus órdenes (con detalle, finanzas, logística, programación, evidencias,
certificados, documentos, tareas y comisión: cascada del ORM; el stock de los
productos se devuelve), memoriales (con dedicatorias), solicitudes web
vinculadas, ilustraciones IA y diseños para redes, y las imágenes en Cloudflare
R2. Opcionalmente también el cliente (si no le quedan otras mascotas).

Las generaciones IA y sesiones de crédito se conservan (son el registro de
consumo y cobro), pero sin la imagen.

Orden de operación: primero la base de datos en una sola transacción; recién si
se confirma se borran los archivos, y solo los que ya ningún otro registro usa
(una misma URL puede estar en la mascota, la orden y la solicitud).
"""
from __future__ import annotations

from typing import Iterable
from urllib.parse import urlparse

from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.api.internal.memorials.models import Memorial

FINAL_COMMISSION_PAID = ("paid", "pagada", "pagado")


def _as_list(v) -> list:
    if not v:
        return []
    if isinstance(v, list):
        return [x for x in v if isinstance(x, str) and x]
    if isinstance(v, str):
        return [v]
    return []


def _collect(db: Session, tenant_id: int, pet: models.Pet) -> dict:
    orders = db.query(models.Cremation).filter(
        models.Cremation.pet_id == pet.id, models.Cremation.tenant_id == tenant_id
    ).all()
    memorials = db.query(Memorial).filter(Memorial.id_mascota == pet.id).all()
    submissions = db.query(models.FormSubmission).filter(
        models.FormSubmission.pet_id == pet.id, models.FormSubmission.tenant_id == tenant_id
    ).all()
    exports = db.query(models.TemplateExport).filter(
        models.TemplateExport.pet_id == pet.id, models.TemplateExport.tenant_id == tenant_id
    ).all()
    generations = db.query(models.AiGeneration).filter(
        models.AiGeneration.pet_id == pet.id, models.AiGeneration.tenant_id == tenant_id,
        models.AiGeneration.media_url.isnot(None),
    ).all()

    urls: list[str] = [pet.image_url] if pet.image_url else []
    urls += _as_list(pet.images)
    evidence = certificates = paid_commissions = 0
    for o in orders:
        if o.details:
            urls += _as_list(o.details.images)
        for e in (o.evidence or []):
            evidence += 1
            urls += _as_list(e.photo_url)
        if o.technical:
            urls += _as_list(o.technical.evidence_url)
        for t in (o.logistics_tasks or []):
            urls += _as_list(t.evidence_image_url) + _as_list(t.signature_url)
        certificates += len(o.certificates or [])
        if o.commission and (str(o.commission.status or "").lower() in FINAL_COMMISSION_PAID):
            paid_commissions += 1
    for m in memorials:
        urls += _as_list(m.main_image_url) + _as_list(m.lista_imagenes) + _as_list(m.imagen_ia)
    for s in submissions:
        urls += _as_list(s.images)
    for e in exports:
        urls += _as_list(e.media_url)
    for g in generations:
        urls += _as_list(g.media_url)

    # Solo archivos subidos (R2 o almacenamiento local), sin duplicados
    uniq = []
    for u in urls:
        if (u.startswith("http") or u.startswith("/storage") or u.startswith("/static")) and u not in uniq:
            uniq.append(u)

    return {
        "orders": orders, "memorials": memorials, "submissions": submissions,
        "exports": exports, "generations": generations, "urls": uniq, "evidence": evidence, "certificates": certificates,
        "paid_commissions": paid_commissions,
    }


def preview(db: Session, tenant_id: int, pet: models.Pet) -> dict:
    g = _collect(db, tenant_id, pet)
    return {
        "pet": {"id": pet.id, "name": pet.name},
        "orders": [
            {"id": o.id, "oc_number": o.oc_number, "status": o.status, "type": o.cremation_type}
            for o in g["orders"]
        ],
        "memorials": len(g["memorials"]),
        "submissions": len(g["submissions"]),
        "designs": sum(1 for e in g["exports"] if e.kind == "design"),
        "illustrations": sum(1 for e in g["exports"] if e.kind == "illustration"),
        "digital_cards": sum(1 for e in g["exports"] if e.kind == "digital"),
        "evidence": g["evidence"],
        "certificates": g["certificates"],
        "images": len(g["urls"]),
        "paid_commissions": g["paid_commissions"],
    }


def _key(url: str) -> str:
    return (urlparse(url).path if "://" in url else url).lstrip("/")


def _still_referenced(db: Session, url: str) -> bool:
    """¿Algún registro que sigue existiendo usa el archivo? (tras borrar la mascota)."""
    like = f"%{_key(url)}%"
    checks = [
        "SELECT 1 FROM crm_pets WHERE image_url LIKE :l OR images::text LIKE :l",
        "SELECT 1 FROM oc_details WHERE images::text LIKE :l",
        "SELECT 1 FROM ops_order_evidence WHERE photo_url LIKE :l",
        "SELECT 1 FROM oc_cremation_technical WHERE evidence_url LIKE :l",
        "SELECT 1 FROM rec_recuerdos WHERE main_image_url LIKE :l OR lista_imagenes::text LIKE :l OR imagen_ia LIKE :l",
        "SELECT 1 FROM web_form_submissions WHERE images::text LIKE :l",
        "SELECT 1 FROM sys_template_exports WHERE media_url LIKE :l OR meta::text LIKE :l",
        "SELECT 1 FROM sys_ai_generations WHERE media_url LIKE :l",
        "SELECT 1 FROM inv_products WHERE image_url LIKE :l OR images::text LIKE :l",
        "SELECT 1 FROM srv_plans WHERE image_url LIKE :l",
        "SELECT 1 FROM sys_tenants WHERE logo_url LIKE :l",
    ]
    for sql in checks:
        if db.execute(text(sql + " LIMIT 1"), {"l": like}).first():
            return True
    return False


def purge(db: Session, tenant_id: int, pet: models.Pet, customer: models.Customer | None = None) -> dict:
    """Borra todo en una transacción y luego los archivos que quedaron sin uso.
    Con `customer`, también borra al cliente (debe quedar sin otras mascotas)."""
    from app.api.internal.common.media_service import MediaService

    g = _collect(db, tenant_id, pet)
    summary = {
        "orders": len(g["orders"]), "memorials": len(g["memorials"]),
        "submissions": len(g["submissions"]), "designs": len(g["exports"]),
        "images_found": len(g["urls"]), "customer_deleted": False,
    }
    for s in g["submissions"]:
        db.delete(s)
    for m in g["memorials"]:
        db.delete(m)          # dedicatorias en cascada
    for e in g["exports"]:
        db.delete(e)
    for gen in g["generations"]:
        gen.media_url = None  # el registro de consumo IA se conserva, sin la imagen
        gen.pending_image = None
    for o in g["orders"]:
        for p_assoc in (o.productos or []):   # devolver stock, igual que al borrar una orden
            prod = db.query(models.Product).filter(models.Product.id == p_assoc.product_id).first()
            if prod:
                prod.stock += p_assoc.cantidad
                prod.availability_status = "Disponible"
        db.delete(o)          # detalle, finanzas, evidencias, certificados, comisión… en cascada
    db.flush()
    db.delete(pet)
    if customer is not None:
        db.flush()
        others = db.query(models.Pet.id).filter(
            models.Pet.customer_id == customer.id, models.Pet.tenant_id == tenant_id
        ).first()
        if others is not None:
            raise ValueError("El cliente tiene otras mascotas")
        for s in db.query(models.FormSubmission).filter(
            models.FormSubmission.customer_id == customer.id, models.FormSubmission.tenant_id == tenant_id
        ).all():
            urls = _as_list(s.images)
            g["urls"] += [u for u in urls if u not in g["urls"]]
            db.delete(s)
        db.delete(customer)
        summary["customer_deleted"] = True
    db.commit()               # si algo falla antes, no se tocó ningún archivo

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
            print(f"[purge pet {pet.id}] no se pudo borrar {url}: {e}")
            failed += 1
    summary.update({"images_deleted": deleted, "images_kept_shared": kept, "images_failed": failed})
    return summary

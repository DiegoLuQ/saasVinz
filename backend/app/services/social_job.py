"""Imagen para redes (IA) generada en segundo plano desde la orden.

La generación con IA puede tardar 1-2 minutos y el crematorio no puede esperar
con la pantalla abierta. Al pedirla:

1. (síncrono, en la petición) se valida todo, se usa el crédito / se reserva el
   intento — así un "sin créditos" se informa al instante — y se crea la tarea
   (sys_document_jobs, estado `queued`);
2. (asíncrono) una tarea del event loop genera texto e ilustración con las mismas
   funciones que la pantalla de Diseños para Redes, guarda la ilustración en
   tenant_{id}/ia/ (se acepta sola: nadie está mirando), registra el diseño como
   receta (igual que "Generar todo") y avisa en la campana.

Si el servidor se reinicia a mitad, la tarea queda colgada: `expire_stale_jobs`
la marca como interrumpida y devuelve el intento si no se llegó a generar nada.
"""
import asyncio
import base64
import logging
from datetime import timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models
from app.core.tenant_context import apply_tenant_rls
from app.database import SessionLocal
from app.services import ai_credits, ai_providers, gemini
from app.utils import tz

logger = logging.getLogger(__name__)

STALE_AFTER = timedelta(minutes=10)
MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
          "septiembre", "octubre", "noviembre", "diciembre"]
# Proporciones que aceptan los modelos de imagen (espejo de AI_RATIOS en el frontend).
AI_RATIOS = [("1:1", 1.0), ("4:5", 0.8), ("3:4", 0.75), ("9:16", 0.5625), ("4:3", 4 / 3), ("16:9", 16 / 9)]
RATIO_WH = {"9:16": (9, 16), "4:5": (4, 5), "3:4": (3, 4), "4:3": (4, 3), "1:1": (1, 1)}

# Referencias fuertes a las tareas en curso (si no, el recolector podría cortarlas).
_TASKS: set = set()


def _today() -> str:
    d = tz.get_now()
    return f"{d.day} de {MONTHS[d.month - 1]} de {d.year}"


def _nearest_ratio(r: float) -> str:
    return min(AI_RATIOS, key=lambda x: abs(x[1] - r))[0]


def _ai_layer(tpl: models.ImageTemplate) -> Optional[dict]:
    layers = (tpl.definition or {}).get("layers") or []
    return next((l for l in layers if l.get("type") == "photo" and l.get("source") == "ai"), None)


def _has_ai_text(tpl: models.ImageTemplate) -> bool:
    layers = (tpl.definition or {}).get("layers") or []
    return any(l.get("type") == "text" and l.get("binding") == "ai_text" for l in layers)


def _pet_photos(pet: Optional[models.Pet]) -> dict:
    """Foto principal y las dos siguientes de la galería (mismo orden que "Generar todo")."""
    images = [i for i in ((pet.images if pet else None) or []) if isinstance(i, str)]
    main = (pet.image_url if pet else None) or (images[0] if images else None)
    rest = [i for i in images if i != main]
    return {"photo_1": main, "photo_2": rest[0] if rest else None, "photo_3": rest[1] if len(rest) > 1 else None}


def _plan(db: Session, tpl: models.ImageTemplate, pet: Optional[models.Pet]) -> dict:
    """Qué se generará con IA: texto, ilustración (necesita foto) o nada."""
    layer = _ai_layer(tpl)
    photos = _pet_photos(pet)
    ai_from = (layer or {}).get("ai_from") or "photo_1"
    wants_text = _has_ai_text(tpl) and ai_providers.resolve(db, "text") is not None
    wants_image = layer is not None and ai_providers.resolve(db, "image") is not None and bool(photos.get(ai_from))
    return {"layer": layer, "photos": photos, "ai_from": ai_from, "text": wants_text, "image": wants_image}


def _active_session(db: Session, tenant_id: int, template_id: int, pet_id: Optional[int]):
    rows = (db.query(models.AiDesignSession)
            .filter(models.AiDesignSession.tenant_id == tenant_id,
                    models.AiDesignSession.template_id == template_id,
                    models.AiDesignSession.pet_id == pet_id)
            .order_by(models.AiDesignSession.created_at.desc()).limit(5).all())
    return next((s for s in rows if ai_credits.session_info(s)["active"]), None)


def start_social_job(db: Session, *, tenant: models.Tenant, cremation: models.CremationOC,
                     tpl: models.ImageTemplate, user_id: int) -> models.DocumentJob:
    """Parte síncrona: crédito / intento y tarea. Lanza la generación en segundo plano."""
    pet = cremation.pet
    if pet is None:
        raise HTTPException(status_code=400, detail="La orden no tiene mascota.")
    running = (db.query(models.DocumentJob)
               .filter(models.DocumentJob.tenant_id == tenant.id, models.DocumentJob.cremation_id == cremation.id,
                       models.DocumentJob.kind == "social", models.DocumentJob.status.in_(("queued", "running")))
               .first())
    if running:
        return running

    plan = _plan(db, tpl, pet)
    session_id = None
    if plan["text"] or plan["image"]:
        session = _active_session(db, tenant.id, tpl.id, pet.id) or ai_credits.open_session(
            db, tenant, template_id=tpl.id, pet_id=pet.id, user_id=user_id)
        session = ai_credits.reserve_attempt(db, tenant.id, session.id, template_id=tpl.id, pet_id=pet.id)
        session_id = session.id

    job = models.DocumentJob(
        tenant_id=tenant.id, cremation_id=cremation.id, pet_id=pet.id, kind="social", template_id=tpl.id,
        status="queued", detail="En cola", ai_session_id=session_id, created_by=user_id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    task = asyncio.get_running_loop().create_task(_run(job.id, tenant.id))
    _TASKS.add(task)
    task.add_done_callback(_TASKS.discard)
    return job


async def _run(job_id: int, tenant_id: int) -> None:
    db = SessionLocal()
    attempt_open = False
    try:
        apply_tenant_rls(db, tenant_id)
        job = db.get(models.DocumentJob, job_id)
        if job is None:
            return
        attempt_open = job.ai_session_id is not None
        job.status, job.started_at, job.detail = "running", tz.get_now(), "Generando con IA…"
        db.commit()

        export_id, warning, generated = await _generate(db, job)
        if generated:
            attempt_open = False  # el intento se consumió en una generación real
        job = db.get(models.DocumentJob, job_id)
        job.status, job.export_id, job.finished_at = "done", export_id, tz.get_now()
        job.detail = warning or "Listo"
        db.commit()
        _notify(db, job, ok=True, warning=warning)
    except Exception as e:  # noqa: BLE001 — la tarea nunca debe quedar en "running"
        logger.exception("Tarea de imagen para redes %s falló", job_id)
        db.rollback()
        apply_tenant_rls(db, tenant_id)
        job = db.get(models.DocumentJob, job_id)
        if job is not None:
            if attempt_open and job.ai_session_id:
                ai_credits.release_attempt(db, job.ai_session_id)
            job.status, job.finished_at = "error", tz.get_now()
            job.error = (getattr(e, "detail", None) or str(e) or "Error inesperado")
            job.error = job.error if isinstance(job.error, str) else str(job.error)
            job.detail = "No se pudo generar"
            db.commit()
            _notify(db, job, ok=False)
    finally:
        db.close()


async def _generate(db: Session, job: models.DocumentJob):
    """Genera con IA (si corresponde), guarda la ilustración y registra el diseño.
    Devuelve (id del diseño, advertencia o None, si hubo alguna generación exitosa)."""
    from app.api.internal.common.image_templates.router import _gen_image, _gen_text
    from app.services import image_template_ai as ai

    tpl = db.get(models.ImageTemplate, job.template_id)
    pet = db.get(models.Pet, job.pet_id) if job.pet_id else None
    tenant = db.get(models.Tenant, job.tenant_id)
    cremation = db.get(models.CremationOC, job.cremation_id) if job.cremation_id else None
    if tpl is None:
        raise RuntimeError("La plantilla ya no existe.")
    plan = _plan(db, tpl, pet)
    photos = plan["photos"]
    pet_name = pet.name if pet else "sin mascota"

    ratio = (tpl.supported_ratios or ["4:5"])[0]
    dedication = getattr(getattr(cremation, "details", None), "dedication", None) if cremation else None
    ai_text = dedication or tpl.default_phrase or ""
    ai_url: Optional[str] = None
    errors: list[str] = []
    generated = False

    if job.ai_session_id and (plan["text"] or plan["image"]):
        common = dict(tpl=tpl, tenant=tenant, pet=pet, details="", session_id=job.ai_session_id,
                      user_id=job.created_by)
        coros = []
        if plan["text"]:
            coros.append(_gen_text(db, ai_providers.resolve(db, "text"), prompt_override=None, **common))
        if plan["image"]:
            layer = plan["layer"] or {}
            rw, rh = RATIO_WH.get(ratio, (4, 5))
            lw, lh = float(layer.get("width") or 100), float(layer.get("height") or 100)
            aspect = _nearest_ratio((lw / lh) * (rw / rh) if lh else 1.0)
            photo = await ai.load_stored_photo(photos[plan["ai_from"]])
            coros.append(_gen_image(db, ai_providers.resolve(db, "image"), prompt_override=None,
                                    aspect_ratio=aspect, photo=photo, **common))
        results = await asyncio.gather(*coros, return_exceptions=True)

        for res in results:
            if isinstance(res, BaseException):
                errors.append(str(res) if isinstance(res, gemini.GeminiError) else "Error inesperado de la IA")
                continue
            generated = True
            if hasattr(res, "text"):
                ai_text = res.text
            else:
                # La ilustración se acepta sola (nadie está mirando): se guarda como WebP en tenant_{id}/ia/.
                content = base64.b64decode(res.url.split(",", 1)[1])
                ai_url = ai.save_to_tenant_ia(db, tenant_id=job.tenant_id, content=content,
                                              description=f"Ilustración IA · {pet_name}")
                gen = db.get(models.AiGeneration, res.generation_id)
                if gen is not None:
                    gen.media_url, gen.pending_image = ai_url, None
                db.add(models.TemplateExport(
                    tenant_id=job.tenant_id, template_id=tpl.id, pet_id=pet.id if pet else None,
                    title=f"Ilustración IA · {pet_name}"[:250], media_url=ai_url,
                    created_by=job.created_by, kind="illustration",
                ))
                db.commit()
        if not generated:
            # Ni texto ni ilustración: _run devuelve el intento e informa el error.
            raise RuntimeError(" · ".join(errors) or "La IA no respondió.")

    fill = lambda url: {"url": url, "zoom": 1, "offset_x": 0, "offset_y": 0}  # noqa: E731
    recipe = {
        "ratio": ratio, "ai_text": ai_text, "phrase": tpl.default_phrase or "", "pet_name": "", "date": _today(),
        "photos": {
            "photo_1": fill(photos["photo_1"]), "photo_2": fill(photos["photo_2"]), "photo_3": fill(photos["photo_3"]),
            "ai": fill(ai_url or photos.get(plan["ai_from"])),
        },
    }
    row = models.TemplateExport(
        tenant_id=job.tenant_id, template_id=tpl.id, pet_id=pet.id if pet else None,
        title=f"{tpl.name} · {pet_name}"[:250], media_url=None, meta=recipe,
        created_by=job.created_by, kind="design",
    )
    db.add(row)
    tpl.usage_count = (tpl.usage_count or 0) + 1
    db.commit()
    warning = ("Listo, pero la IA falló en una parte: " + " · ".join(errors))[:300] if errors else None
    return row.id, warning, generated


def _notify(db: Session, job: models.DocumentJob, *, ok: bool, warning: Optional[str] = None) -> None:
    try:
        pet = db.get(models.Pet, job.pet_id) if job.pet_id else None
        name = pet.name if pet else "la mascota"
        db.add(models.Notification(
            tenant_id=job.tenant_id,
            title=f"Imagen para redes lista: {name}" if ok else f"No se pudo generar la imagen de {name}",
            message=(warning or "La imagen con IA ya está en la orden y en Mis diseños.") if ok
            else (job.error or "Inténtalo nuevamente desde la orden."),
            type="document_ready" if ok else "document_error",
            audience="ordenes",
            data={"cremation_id": job.cremation_id, "pet_id": job.pet_id, "job_id": job.id, "export_id": job.export_id},
            # Abre la orden (su ficha lista la imagen generada, con vista grande y descarga).
            action_url=f"/dashboard/recepcion-pedidos?orden={job.cremation_id}" if job.cremation_id else None,
        ))
        db.commit()
    except Exception:  # noqa: BLE001 — el aviso es secundario
        logger.exception("No se pudo crear el aviso de la tarea %s", job.id)
        db.rollback()


def expire_stale_jobs(db: Session, tenant_id: int) -> None:
    """Tareas que quedaron en curso por un reinicio del servidor: se marcan como
    interrumpidas y se devuelve el intento si no se llegó a generar nada."""
    limit = tz.get_now() - STALE_AFTER
    stale = (db.query(models.DocumentJob)
             .filter(models.DocumentJob.tenant_id == tenant_id,
                     models.DocumentJob.status.in_(("queued", "running")),
                     models.DocumentJob.created_at < limit)
             .all())
    for job in stale:
        if job.ai_session_id:
            got_any = (db.query(models.AiGeneration)
                       .filter(models.AiGeneration.session_id == job.ai_session_id,
                               models.AiGeneration.success.is_(True),
                               models.AiGeneration.created_at >= job.created_at)
                       .first())
            if got_any is None:
                ai_credits.release_attempt(db, job.ai_session_id)
        job.status, job.finished_at = "error", tz.get_now()
        job.error = "Se interrumpió (el servidor se reinició). Vuelve a intentarlo: no se cobró otro intento."
        job.detail = "Interrumpido"
    if stale:
        db.commit()


def job_info(job: models.DocumentJob) -> dict:
    return {
        "id": job.id, "cremation_id": job.cremation_id, "pet_id": job.pet_id, "kind": job.kind,
        "template_id": job.template_id, "status": job.status, "detail": job.detail, "error": job.error,
        "export_id": job.export_id, "created_at": job.created_at, "finished_at": job.finished_at,
    }

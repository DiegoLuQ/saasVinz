from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app import schemas
from app.api.deps import get_current_user, get_tenant_id
from app.api.internal.operations.operations import board
from app.api.internal.admin.rbac.router import check_permission
from app.api.deps_limits import check_resource_limit
from app.api.internal.operations.services import CremationService

router = APIRouter()

# Dependency Helper
def get_cremation_service(db: Session = Depends(get_db)) -> CremationService:
    return CremationService(db)

@router.get("", response_model=List[schemas.CremationOCInDB])
def obtener_cremaciones(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cremation_type: Optional[str] = None,
    status: Optional[str] = None,
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    _: bool = Depends(check_permission("ordenes", "view"))
):
    """Obtiene todas las OC del tenant con filtros granulares."""
    return service.get_all(
        tenant_id=tenant_id,
        start_date=start_date,
        end_date=end_date,
        cremation_type=cremation_type,
        status=status,
        sort_order=sort_order
    )

@router.post("", response_model=schemas.CremationOCInDB)
def crear_cremacion(
    cremation_in: schemas.CremationOCCreate,
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    _: bool = Depends(check_permission("ordenes", "create")),
    __: bool = Depends(check_resource_limit("orders"))
):
    """Registra una nueva OC con múltiples servicios, planes y productos."""
    return service.create(tenant_id, cremation_in)

# --- Expediente del servicio ---------------------------------------------------
# Todo lo de una orden en una sola respuesta, para el panel de Recepción de
# pedidos: familia y mascota, servicios, etapas con evidencia, veterinaria y
# comisión, y entregables (seguimiento, tarjeta de homenaje, certificado y
# memorial) + la siguiente acción sugerida.

_FINAL = {"entregado", "delivered", "completado", "completed"}
_CANCELED = {"cancelado", "canceled", "cancelled"}
_IN_PROGRESS = {"en_proceso", "processing", "ready"}


def _status_group(raw: Optional[str]) -> str:
    v = (raw or "").strip().lower()
    if v in _FINAL:
        return "entregado"
    if v in _CANCELED:
        return "cancelado"
    if v in _IN_PROGRESS:
        return "en_proceso"
    return "pendiente"


class DedicationUpdate(BaseModel):
    dedication: Optional[str] = None


@router.put("/{cremation_id}/dedication")
def actualizar_carta_despedida(
    cremation_id: int,
    body: DedicationUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "edit")),
):
    """Carta de despedida de la orden (máx. 500). Sirve también para órdenes
    creadas sin formulario. Vacía = sin carta."""
    from fastapi import HTTPException
    from app import models

    text_ = (body.dedication or "").strip()
    if len(text_) > 500:
        raise HTTPException(status_code=400, detail="La carta de despedida admite hasta 500 caracteres")
    oc = db.query(models.Cremation).filter(
        models.Cremation.id == cremation_id, models.Cremation.tenant_id == tenant_id
    ).first()
    if not oc:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if not oc.details:
        oc.details = models.CremationDetails(cremation_id=oc.id, tenant_id=tenant_id)
    # "" (no None) marca que la carta se vació a propósito: no se vuelve a tomar la del formulario
    oc.details.dedication = text_
    db.commit()
    return {"cremation_id": oc.id, "dedication": text_ or None}


@router.get("/{cremation_id}/expediente")
def obtener_expediente(
    cremation_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "view")),
):
    from sqlalchemy.orm import joinedload
    from fastapi import HTTPException
    from app import models
    from app.api.internal.memorials.models import Memorial
    from app.api.public.tenants.router import resolve_farewell_template
    from app.services.public_form_config import get_weight_tiers, weight_surcharge

    C = models.Cremation
    oc = db.query(C).options(
        joinedload(C.pet).joinedload(models.Pet.customer),
        joinedload(C.details), joinedload(C.financial),
        joinedload(C.technical).joinedload(models.CremationTechnical.step),
        joinedload(C.commission), joinedload(C.evidence), joinedload(C.certificates),
        joinedload(C.partner_link),
    ).filter(C.id == cremation_id, C.tenant_id == tenant_id).first()
    if not oc:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    pet, customer = oc.pet, (oc.pet.customer if oc.pet else None)
    group = _status_group(oc.status)

    # Solicitud de origen (formulario): dedicatoria y fotos de la familia.
    submission = None
    if oc.pet_id:
        submission = db.query(models.FormSubmission).filter(
            models.FormSubmission.tenant_id == tenant_id,
            models.FormSubmission.pet_id == oc.pet_id,
        ).order_by(models.FormSubmission.id.desc()).first()
    pet_data = (submission.pet_data or {}) if submission else {}
    photos = [u for u in ((submission.images if submission else None) or []) if isinstance(u, str)]
    if pet and pet.image_url and pet.image_url not in photos:
        photos.insert(0, pet.image_url)

    # Servicios, planes y productos de la orden.
    items = []
    for s_ in (oc.servicios or []):
        items.append({"tipo": "servicio", "nombre": getattr(s_.service, "name", "Servicio"), "cantidad": s_.cantidad or 1, "precio": s_.precio_venta or 0})
    for p_ in (oc.planes or []):
        # Lo que trae el plan (servicios y productos incluidos, sin precio aparte)
        incluye = []
        if p_.plan:
            incluye = [s.name for s in (p_.plan.services or []) if s and s.name] + \
                      [pr.name for pr in (p_.plan.products or []) if pr and pr.name]
        items.append({"tipo": "plan", "nombre": getattr(p_.plan, "name", "Plan"), "cantidad": getattr(p_, "cantidad", 1) or 1,
                      "precio": p_.precio_venta or 0, "incluye": incluye})
    for pr in (oc.productos or []):
        items.append({"tipo": "producto", "nombre": getattr(pr.product, "name", "Producto"), "cantidad": pr.cantidad or 1, "precio": pr.precio_venta or 0})

    # Recargo por peso: igual que el formulario de registro, se deriva de los
    # tramos vigentes (las órdenes del formulario público / Registro Rápido o con
    # peso editado en Operaciones guardan weight_price = 0). Sin tramos, el guardado.
    tiers = get_weight_tiers(db, tenant_id)
    weight_price = weight_surcharge(tiers, oc.weight) if tiers else ((oc.financial.weight_price or 0) if oc.financial else 0)
    if weight_price:
        items.append({"tipo": "peso", "nombre": f"Recargo por peso ({oc.weight:g} kg)".replace(".", ","),
                      "cantidad": 1, "precio": weight_price})

    # Etapas del crematorio con su evidencia (misma lógica que el seguimiento público).
    steps = db.query(models.WorkflowStep).filter(
        models.WorkflowStep.tenant_id == tenant_id, models.WorkflowStep.is_active == True  # noqa: E712
    ).order_by(models.WorkflowStep.order_index).all()
    # Todas las evidencias de cada etapa (antes un dict dejaba solo la última)
    evidence_by_step: dict = {}
    for e in sorted(oc.evidence or [], key=lambda x: (x.created_at is None, x.created_at)):
        evidence_by_step.setdefault(e.step_id, []).append(e)
    current_id = oc.technical.step_id if oc.technical else None
    current_idx = next((i for i, st in enumerate(steps) if st.id == current_id), -1)

    # Fecha/hora y responsable de cada etapa completada: oc_cremation_technical.timeline
    # = {"<step_id>": {"completed_at": iso, "updated_by": user_id}}
    raw_tl = (oc.technical.timeline if oc.technical and isinstance(oc.technical.timeline, dict) else {}) or {}
    user_ids = {v.get("updated_by") for v in raw_tl.values() if isinstance(v, dict) and v.get("updated_by")}
    user_names = {}
    if user_ids:
        for uid, uname in db.query(models.User.id, models.User.name).filter(models.User.id.in_(user_ids)).all():
            user_names[uid] = uname

    def _completed(step_id):
        v = raw_tl.get(str(step_id)) if isinstance(raw_tl, dict) else None
        return v if isinstance(v, dict) else {}

    timeline = []
    for i, st in enumerate(steps):
        if group == "entregado" or (current_idx >= 0 and i < current_idx):
            state = "completado"
        elif i == current_idx:
            state = "en_curso"
        else:
            state = "pendiente"
        evs = evidence_by_step.get(st.id, [])
        evidence = []
        for ev in evs:
            comments = ev.comments if isinstance(ev.comments, list) else ([ev.comments] if ev.comments else [])
            evidence.append({"photo_url": ev.photo_url, "comments": [c for c in comments if c], "at": ev.created_at})
        done = _completed(st.id)
        # En curso: desde que se completó la etapa anterior (o desde que se creó la orden)
        started_at = None
        if state == "en_curso":
            prev = _completed(steps[i - 1].id) if i > 0 else {}
            started_at = prev.get("completed_at") or oc.created_at
        last = evidence[-1] if evidence else None
        timeline.append({
            "step_id": st.id, "name": st.name, "state": state,
            "completed_at": done.get("completed_at") if state == "completado" else None,
            "completed_by": user_names.get(done.get("updated_by")) if state == "completado" else None,
            "started_at": started_at,
            "evidence": evidence,
            # Compatibilidad: última evidencia plana
            "photo_url": next((e["photo_url"] for e in reversed(evidence) if e["photo_url"]), None),
            "comments": [c for e in evidence for c in e["comments"]],
            "at": last["at"] if last else None,
        })

    # Veterinaria y comisión (solo si la comisión es de este mismo vínculo).
    partner = None
    if oc.partner_link:
        vet = oc.partner_link.veterinary
        comm = oc.commission if (oc.commission and oc.commission.partner_link_id == oc.partner_link_id) else None
        partner = {
            "name": vet.name if vet else "Veterinaria",
            "commission": {
                "amount": comm.amount, "status": str(getattr(comm.status, "value", comm.status)), "paid_at": comm.paid_at,
            } if comm else None,
        }

    # Certificado: disponible según el plan (feature del plan, respeta demo).
    plan = getattr(tenant, "effective_plan", None) or getattr(tenant, "subscription_plan", None)
    features = getattr(plan, "features", None) or {}
    cert_enabled = bool(features.get("certificados:generar_pdf", False)) if isinstance(features, dict) else False
    certs = sorted(oc.certificates or [], key=lambda c: c.created_at or c.issue_date, reverse=True)

    memorial = db.query(Memorial).filter(Memorial.id_mascota == oc.pet_id, Memorial.id_tenant == tenant_id).first() if oc.pet_id else None
    farewell = resolve_farewell_template(db, tenant_id)

    # Siguiente acción sugerida.
    if group == "cancelado":
        next_action = None
    elif group == "entregado":
        next_action = {"key": "emitir_certificado", "label": "Emitir certificado"} if (cert_enabled and not certs) else None
    elif current_idx < 0:
        next_action = {"key": "iniciar", "label": "Iniciar operación"}
    elif current_idx < len(steps) - 1:
        next_action = {"key": "avanzar", "label": f"Avanzar a: {steps[current_idx + 1].name}"}
    else:
        next_action = {"key": "entregar", "label": "Marcar como entregado"}

    # Total como lo calcula el registro (calculateGrandTotal): ítems + recargo por
    # peso, menos el descuento %. El total_price guardado puede venir sin el recargo.
    fin = oc.financial
    discount_pct = (fin.discount or 0) if fin else 0
    subtotal = sum(i["precio"] * i["cantidad"] for i in items)
    total = subtotal - subtotal * discount_pct / 100
    return {
        "order": {
            "id": oc.id, "oc_number": oc.oc_number, "status": oc.status, "status_group": group,
            "cremation_type": oc.cremation_type, "created_at": oc.created_at,
            "verification_code": oc.verification_code,
            "current_step": steps[current_idx].name if current_idx >= 0 else None,
        },
        "pet": {
            "id": pet.id if pet else None, "name": pet.name if pet else None,
            "species": pet.species if pet else None, "breed": pet.breed if pet else None,
            # La de la orden manda; la solicitud es solo el respaldo (órdenes antiguas)
            "dedication": ((oc.details.dedication or None) if oc.details and oc.details.dedication is not None
                           else (pet_data.get("dedication") or None)),
            "dedication_source": ("orden" if oc.details and oc.details.dedication is not None
                                  else ("formulario" if pet_data.get("dedication") else None)),
            "photos": photos,
        },
        "customer": {
            "name": customer.name if customer else None,
            "phone": customer.phone if customer else None,
            "email": customer.email if customer else None,
        },
        "items": items,
        "financial": {
            "subtotal": subtotal,
            "total": total,
            "discount": discount_pct,
        },
        "timeline": timeline,
        "partner": partner,
        "deliverables": {
            "tracking": {
                "tenant_slug": tenant.slug if tenant else None,
                "token": (oc.details.tracking_token if oc.details else None) or oc.verification_code,
            },
            "certificate": {
                "enabled": cert_enabled,
                "issued": [{"id": c.id, "number": c.number, "issued_at": c.issue_date or c.created_at} for c in certs],
            },
            "memorial": {"uuid": str(memorial.id_recuerdo), "status": str(getattr(memorial.status, "value", memorial.status))} if memorial else None,
            "farewell_template": {"id": farewell.id, "config": farewell.config} if farewell else None,
        },
        "origin": {
            "submission_id": submission.id if submission else None,
            "submission_code": submission.code if submission else None,
        },
        "next_action": next_action,
    }


@router.get("/{cremation_id}", response_model=schemas.CremationOCInDB)
def obtener_cremacion(
    cremation_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    _: bool = Depends(check_permission("ordenes", "view"))
):
    """Obtiene los detalles de una OC específica."""
    return service.get_by_id(tenant_id, cremation_id)

@router.patch("/{cremation_id}", response_model=schemas.CremationOCInDB)
def actualizar_cremacion(
    cremation_id: int,
    cremation_in: schemas.CremationOCUpdate,
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    current_user=Depends(get_current_user),
    _: bool = Depends(check_permission("ordenes", "edit"))
):
    """Actualiza una OC y sus asociaciones (servicios, planes, productos)."""
    # Retroceder el estado (p. ej. entregado -> pendiente) es solo del dueño.
    if cremation_in.status and not board.is_owner(current_user):
        current = service.get_by_id(tenant_id, cremation_id)
        old_rank, new_rank = board.status_rank(current.status), board.status_rank(cremation_in.status)
        if old_rank is not None and new_rank is not None and new_rank < old_rank:
            raise HTTPException(status_code=403, detail="Solo el administrador del crematorio puede retroceder el estado de una orden")
    return service.update(tenant_id, cremation_id, cremation_in)

@router.delete("/{cremation_id}")
def eliminar_cremacion(
    cremation_id: int,
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service),
    _: bool = Depends(check_permission("ordenes", "delete"))
):
    """Elimina una OC y sus registros asociados (con restauración de stock y limpieza de archivos)."""
    return service.delete(tenant_id, cremation_id)

@router.get("/{cremation_id}/delete-preview")
def vista_previa_eliminacion(
    cremation_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "delete"))
):
    """Lo que se borra junto con la OC (para el aviso de confirmación). Debe
    coincidir con CremationService.delete y las cascadas de CremationOC."""
    from fastapi import HTTPException
    from app import models

    C = models.Cremation
    oc = db.query(C).filter(C.id == cremation_id, C.tenant_id == tenant_id).first()
    if not oc:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    other_orders = db.query(C).filter(C.pet_id == oc.pet_id, C.id != oc.id).count() if oc.pet_id else 0
    pet = oc.pet
    pet_photos = 0
    if pet and other_orders == 0:
        pet_photos = (1 if pet.image_url else 0) + len([u for u in (pet.images or []) if u and u != pet.image_url])
    evidence_photos = len([e for e in (oc.evidence or []) if e.photo_url])
    order_photos = len((oc.details.images if oc.details else None) or [])
    comm = oc.commission

    return {
        "oc_number": oc.oc_number,
        "verification_code": oc.verification_code,
        "status": oc.status,
        "pet_name": pet.name if pet else None,
        "customer_name": pet.customer.name if pet and pet.customer else None,
        "servicios": len(oc.servicios or []),
        "planes": len(oc.planes or []),
        "productos": sum((p.cantidad or 0) for p in (oc.productos or [])),
        "certificados": len(oc.certificates or []),
        "documentos": len(oc.documents or []),
        "evidencias": len(oc.evidence or []),
        "fotos": order_photos + evidence_photos,
        "tareas_logistica": len(oc.logistics_tasks or []),
        "comision": {
            "amount": comm.amount,
            "status": str(getattr(comm.status, "value", comm.status)),
        } if comm else None,
        # Si es la única orden de la mascota, el servicio borra también sus fotos
        "fotos_mascota": pet_photos,
    }

@router.post("/upload-image")
async def upload_image(
    cremation_id: int,
    file: UploadFile = File(...),
    tenant_id: int = Depends(get_tenant_id),
    service: CremationService = Depends(get_cremation_service)
):
    """Sube una imagen para una cremación."""
    image_url = await service.upload_image(tenant_id, cremation_id, file)
    return {"image_url": image_url}

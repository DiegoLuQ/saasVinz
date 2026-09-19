from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query, Form
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from app import schemas
from app import auth
from app.api.deps import get_current_user, get_tenant_id
from typing import List, Optional
from datetime import datetime, time, timedelta
from app.utils import tz
import os
import uuid
import shutil
from app.api.internal.common.media_service import MediaService
from app.utils.time import get_tenant_now, format_tenant_datetime, convert_to_tenant_tz
import pytz
from app.api.internal.operations.operations import board

router = APIRouter()

# Removed local convert_utc_to_tenant_tz in favor of app.utils.time

def get_enriched_order(db: Session, cremation_id: int, tenant_id: int):
    """Obtiene una orden con sus joins y metadata convertida (DailyOrderSchema)."""
    result = board.base_query(db, tenant_id).filter(models.Cremation.id == cremation_id).first()
    if not result:
        return None
    return board.to_daily_order(result, board.tenant_tz(db, tenant_id))

@router.get("/ops/current-time")
def get_current_time(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    local_now = get_tenant_now(db, tenant_id)
    
    return {
        "current_time": local_now.strftime('%d-%m-%Y, %H:%M'),
        "timezone": str(local_now.tzinfo)
    }

# --- SUB-MODULO 1: PLANTA / CREMACIÓN (Operator) ---

@router.get("/plant/queue", response_model=List[schemas.CremationInDB])
def get_cremation_queue(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Retorna las mascotas con estado 'received' para iniciar proceso."""
    # Validación de rol: admin u operator
    if current_user.role not in [models.UserRole.admin, models.UserRole.operator, models.UserRole.operador_cremacion, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    return db.query(models.Cremation).filter(
        models.Cremation.tenant_id == tenant_id,
        models.Cremation.status == "received"
    ).all()

@router.post("/plant/cremations/{cremation_id}/start", response_model=schemas.CremationInDB)
async def start_cremation(
    cremation_id: int,
    furnace_id: Optional[str] = None,
    temperature: Optional[float] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Inicia el proceso de cremación técnica."""
    cremation = db.query(models.Cremation).filter(
        models.Cremation.id == cremation_id,
        models.Cremation.tenant_id == tenant_id
    ).first()
    
    if not cremation:
        raise HTTPException(status_code=404, detail="Cremación no encontrada")
    
    allowed_statuses = ["received", "pending", "pendiente", "recibido", "Pendiente", "Recibido", "coordinado", "Coordinado"]
    if cremation.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"La cremación debe estar en estado Pendiente, Recibido o Coordinado (Estado actual: {cremation.status})")
        
    # Get or create technical record
    tech = cremation.technical
    if not tech:
        tech = models.CremationTechnical(cremation_id=cremation.id)
        db.add(tech)

    cremation.status = "en_proceso"
    tech.start_at = tz.get_now()
    tech.operator_id = current_user.id
    tech.furnace_id = furnace_id
    tech.temperature = temperature
    
    db.commit()
    db.refresh(cremation)
    return cremation

@router.post("/plant/cremations/{cremation_id}/finish", response_model=schemas.CremationInDB)
async def finish_cremation(
    cremation_id: int,
    temperature_final: float,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Finaliza el proceso de cremación técnica y guarda evidencia."""
    cremation = db.query(models.Cremation).filter(
        models.Cremation.id == cremation_id,
        models.Cremation.tenant_id == tenant_id
    ).first()
    
    if not cremation:
        raise HTTPException(status_code=404, detail="Cremación no encontrada")
        
    if cremation.status not in ("en_proceso", "processing"):
        raise HTTPException(status_code=400, detail="La cremación no está en proceso")

    # Asegurar registro técnico
    tech = cremation.technical
    if not tech:
        tech = models.CremationTechnical(cremation_id=cremation.id)
        db.add(tech)

    # Guardar evidencia técnica (WebP optimizado via MediaService)
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{ext}")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="technical_evidence",
            ratio="1:1",
            description=f"Evidencia técnica OC {cremation.oc_number}",
            alt_text=f"Técnica {cremation.oc_number}",
            processing_mode="optimized",
            custom_prefix=f"tech_{cremation_id}",
            tenant_id=tenant_id
        )
        url = media_item.url
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar evidencia: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
    
    # Estado final único = entregado (el fin técnico marca la orden como entregada)
    cremation.status = "entregado"
    tech.end_at = tz.get_now()
    if cremation.scheduling:
        cremation.scheduling.completed_at = tz.get_now() # Sincronizar con fecha comercial
    # Promedio o registro final
    if tech.temperature:
        tech.temperature = (tech.temperature + temperature_final) / 2
    else:
        tech.temperature = temperature_final
    
    # Eliminar evidencia anterior si existe
    if tech.evidence_url:
        from app.api.internal.common.models import MediaLibrary
        old_m = db.query(MediaLibrary).filter(MediaLibrary.url == tech.evidence_url).first()
        if old_m: MediaService.delete_media(db, old_m)

    tech.evidence_url = url
    
    db.commit()
    db.refresh(cremation)
    return cremation

# --- SUB-MODULO 2: LOGÍSTICA / RUTAS (Driver) ---

@router.get("/logistics/tasks/my", response_model=List[schemas.LogisticsTaskInDB])
def get_my_tasks(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Obtiene las tareas asignadas al driver logueado."""
    if current_user.role not in [models.UserRole.admin, models.UserRole.driver, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    # El admin ve todo el tenant, el driver solo lo suyo
    query = db.query(models.LogisticsTask).filter(models.LogisticsTask.tenant_id == tenant_id)
    if current_user.role == models.UserRole.driver:
        query = query.filter(models.LogisticsTask.driver_id == current_user.id)
        
    return query.filter(models.LogisticsTask.status != "completed").all()

@router.patch("/logistics/tasks/{task_id}", response_model=schemas.LogisticsTaskInDB)
async def update_task(
    task_id: int,
    status: Optional[str] = None,
    checklist: Optional[dict] = None,
    evidence_file: Optional[UploadFile] = File(None),
    signature_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Actualiza estado y checklist de una tarea logística."""
    task = db.query(models.LogisticsTask).filter(
        models.LogisticsTask.id == task_id,
        models.LogisticsTask.tenant_id == tenant_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
        
    if status:
        task.status = status
        
    if checklist:
        task.checklist = checklist
        
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)

    if evidence_file:
        ext = os.path.splitext(evidence_file.filename)[1]
        t_path = os.path.join(temp_dir, f"ev_{uuid.uuid4()}{ext}")
        with open(t_path, "wb") as b: shutil.copyfileobj(evidence_file.file, b)
        
        m_item = MediaService.upload_media(
            db=db, local_path=t_path, media_type="image", category="logistics",
            ratio="original", description=f"Evidencia logística tarea {task_id}",
            processing_mode="optimized", custom_prefix=f"log_ev_{task_id}",
            tenant_id=tenant_id
        )
        if task.evidence_image_url:
            from app.api.internal.common.models import MediaLibrary
            old = db.query(MediaLibrary).filter(MediaLibrary.url == task.evidence_image_url).first()
            if old: MediaService.delete_media(db, old)
        task.evidence_image_url = m_item.url
        os.remove(t_path)
        
    if signature_file:
        ext = os.path.splitext(signature_file.filename)[1]
        t_path = os.path.join(temp_dir, f"sig_{uuid.uuid4()}{ext}")
        with open(t_path, "wb") as b: shutil.copyfileobj(signature_file.file, b)
        
        m_item = MediaService.upload_media(
            db=db, local_path=t_path, media_type="image", category="signatures",
            ratio="original", description=f"Firma digital tarea {task_id}",
            processing_mode="optimized", custom_prefix=f"log_sig_{task_id}",
            tenant_id=tenant_id
        )
        if task.signature_url:
            from app.api.internal.common.models import MediaLibrary
            old = db.query(MediaLibrary).filter(MediaLibrary.url == task.signature_url).first()
            if old: MediaService.delete_media(db, old)
        task.signature_url = m_item.url
        os.remove(t_path)
        
    if task.status == "completed":
        task.completed_at = tz.get_now()
        # Sincronizar estado de la mascota si aplica
        if task.cremation_id:
            cremation = db.query(models.Cremation).get(task.cremation_id)
            if cremation and task.type == "pickup":
                cremation.status = "received"
    
    db.commit()
    db.refresh(task)
    return task

# --- SUB-MODULO 3: CONFIGURACIÓN WORKFLOW (Admin) ---

@router.get("/steps", response_model=List[schemas.WorkflowStepInDB])
def get_workflow_steps(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Lista los pasos del flujo operativo."""
    # Permitir lectura a operators también para saber en qué paso están
    if current_user.role not in [models.UserRole.admin, models.UserRole.operator, models.UserRole.operador_cremacion, models.UserRole.driver, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    return db.query(models.WorkflowStep).filter(
        models.WorkflowStep.tenant_id == tenant_id,
        models.WorkflowStep.is_active == True
    ).order_by(models.WorkflowStep.order_index).all()

@router.post("/steps", response_model=schemas.WorkflowStepInDB)
def create_workflow_step(
    step_in: schemas.WorkflowStepCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Crea un nuevo paso en el flujo (Solo Admin)."""
    if current_user.role not in [models.UserRole.admin, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Solo administradores pueden configurar el flujo")
        
    step = models.WorkflowStep(
        **step_in.model_dump(),
        tenant_id=tenant_id
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return step

@router.put("/steps/{step_id}", response_model=schemas.WorkflowStepInDB)
def update_workflow_step(
    step_id: int,
    step_in: schemas.WorkflowStepUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Actualiza un paso del flujo (Solo Admin)."""
    if current_user.role not in [models.UserRole.admin, models.UserRole.creator]:
        raise HTTPException(status_code=403, detail="Solo administradores pueden configurar el flujo")
        
    step = db.query(models.WorkflowStep).filter(models.WorkflowStep.id == step_id, models.WorkflowStep.tenant_id == tenant_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Paso no encontrado")
        
    if step_in.name is not None:
        step.name = step_in.name
    if step_in.order_index is not None:
        step.order_index = step_in.order_index
    if step_in.is_active is not None:
        step.is_active = step_in.is_active
        
    db.commit()
    db.refresh(step)
    return step

# --- SUB-MODULO 4: OPERACIONES / EVIDENCIA ---

@router.get("/ops/daily-orders", response_model=List[schemas.DailyOrderSchema])
def get_daily_orders(
    scope: str = Query("active", enum=["active", "completed", "all"]),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    cremation_type: Optional[str] = None,
    status: Optional[str] = None,
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """
    Lista completa (sin paginar) de órdenes del panel operativo.
    El Panel de Trabajo usa /ops/board; esto queda por compatibilidad.
    """
    if current_user.role not in board.OPS_ROLES:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    query = board.base_query(db, tenant_id)

    if scope == "active":
        query = query.filter(models.Cremation.status.in_(board.ACTIVE_STATUSES))
    elif scope == "completed":
        query = query.filter(models.Cremation.status.in_(board.FINAL_STATUSES))

    # Filtro granular de estado (sobrescribe el scope)
    if status and status != "all":
        query = query.filter(models.Cremation.status == status)

    if cremation_type and cremation_type != "all":
        query = query.filter(models.Cremation.cremation_type == cremation_type)

    # Rango de fechas sobre la fecha operativa (programada; si no hay, creación)
    sched = board.scheduled_expr()
    if start_date:
        try:
            query = query.filter(sched >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            if len(end_date) <= 10:
                end_dt = datetime.combine(end_dt.date(), time(23, 59, 59))
            query = query.filter(sched <= end_dt)
        except ValueError:
            pass

    if sort_order == "desc":
        query = query.order_by(sched.desc(), models.Cremation.id.desc())
    else:
        query = query.order_by(sched.asc(), models.Cremation.id.asc())

    tzinfo = board.tenant_tz(db, tenant_id)
    return [board.to_daily_order(row, tzinfo) for row in query.all()]

@router.get("/ops/board", response_model=schemas.OpsBoardResponse)
def get_ops_board(
    tab: str = Query("today", enum=["today", "in_progress", "not_started", "finished", "all"]),
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Panel de Trabajo del operador: pestañas, búsqueda y paginación en servidor.

    - today: abiertas programadas para hoy o atrasadas.
    - in_progress / not_started: abiertas según hayan iniciado o no.
    - finished: entregadas (más recientes primero).
    - all: cualquier estado salvo canceladas (búsqueda rápida de tracking).
    """
    if current_user.role not in board.OPS_ROLES:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    tzinfo = board.tenant_tz(db, tenant_id)
    now_local = datetime.now(tzinfo)
    tomorrow_start = tzinfo.localize(datetime.combine(now_local.date() + timedelta(days=1), time.min))
    sched = board.scheduled_expr()
    status_col = models.Cremation.status

    tab_filters = {
        "today": [status_col.in_(board.ACTIVE_STATUSES), models.CremationScheduling.scheduled_at < tomorrow_start],
        # La fase es la fuente de verdad: con fase = en proceso, sin fase = por iniciar
        # (hay órdenes legacy "pendiente" con fases avanzadas; advance las corrige).
        "in_progress": [status_col.in_(board.ACTIVE_STATUSES), models.CremationTechnical.step_id.isnot(None)],
        "not_started": [status_col.in_(board.ACTIVE_STATUSES), models.CremationTechnical.step_id.is_(None)],
        "finished": [status_col.in_(board.FINAL_STATUSES)],
        "all": [status_col.notin_(board.CANCELED_STATUSES)],
    }

    search_filter = None
    term = (q or "").strip()
    if term:
        pattern = f"%{term}%"
        conditions = [
            models.Pet.name.ilike(pattern),
            models.Customer.name.ilike(pattern),
            models.Cremation.verification_code.ilike(pattern),
        ]
        digits = term.upper().replace("OC-", "").replace("SVC-", "").strip()
        if digits.isdigit():
            conditions += [models.Cremation.oc_number == int(digits), models.Cremation.id == int(digits)]
        search_filter = or_(*conditions)

    def count_for(key: str) -> int:
        cq = db.query(func.count(models.Cremation.id)).join(
            models.Pet, models.Cremation.pet_id == models.Pet.id
        ).join(
            models.Customer, models.Pet.customer_id == models.Customer.id
        ).outerjoin(
            models.CremationScheduling, models.CremationScheduling.cremation_id == models.Cremation.id
        ).outerjoin(
            models.CremationTechnical, models.CremationTechnical.cremation_id == models.Cremation.id
        ).filter(models.Cremation.tenant_id == tenant_id, *tab_filters[key])
        if search_filter is not None:
            cq = cq.filter(search_filter)
        return cq.scalar() or 0

    counts = schemas.OpsBoardCounts(**{k: count_for(k) for k in ("today", "in_progress", "not_started", "finished")})
    total = getattr(counts, tab) if tab != "all" else count_for("all")

    query = board.base_query(db, tenant_id).filter(*tab_filters[tab])
    if search_filter is not None:
        query = query.filter(search_filter)

    if tab == "finished":
        closed_at = func.coalesce(models.CremationScheduling.completed_at, models.Cremation.created_at)
        query = query.order_by(closed_at.desc(), models.Cremation.id.desc())
    elif tab == "all":
        query = query.order_by(sched.desc(), models.Cremation.id.desc())
    else:
        # Lo más urgente primero (atrasadas arriba)
        query = query.order_by(sched.asc(), models.Cremation.id.asc())

    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    return schemas.OpsBoardResponse(
        items=[board.to_daily_order(row, tzinfo) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        counts=counts,
    )

@router.post("/ops/evidence", response_model=schemas.DailyOrderSchema)
async def upload_evidence(
    cremation_id: int,
    step_id: int,
    comments: Optional[str] = Form(None), 
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Sube evidencia (Upsert: Crea o actualiza) para un paso específico."""
    
    # 1. Verificar orden y paso
    cremation = db.query(models.Cremation).filter(models.Cremation.id == cremation_id, models.Cremation.tenant_id == tenant_id).first()
    if not cremation:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
        
    step = db.query(models.WorkflowStep).filter(models.WorkflowStep.id == step_id, models.WorkflowStep.tenant_id == tenant_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Paso no encontrado")

    # 2. Buscar si ya existe evidencia para este paso
    evidence = db.query(models.OrderEvidence).filter(
        models.OrderEvidence.cremation_id == cremation_id,
        models.OrderEvidence.step_id == step_id
    ).first()

    # 3. Procesar Comentarios
    import json
    comments_list = []
    if comments:
        try:
            comments_list = json.loads(comments)
            if not isinstance(comments_list, list):
                comments_list = [str(comments_list)]
            # Limitar a 3 comentarios como pidió el usuario si es necesario, 
            # aunque el modelo JSON permite más, la UI mandará 3.
            comments_list = [c for c in comments_list if c and str(c).strip()][:3]
        except:
            comments_list = [comments]

    # 4. Upsert Logic
    if not evidence:
        evidence = models.OrderEvidence(
            cremation_id=cremation_id,
            step_id=step_id,
            comments=comments_list
        )
        db.add(evidence)
    else:
        evidence.comments = comments_list

    # 5. Procesar Foto (Si viene una nueva)
    if photo:
        # Procesar con MediaService unificado
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        ext = os.path.splitext(photo.filename)[1]
        temp_path = os.path.join(temp_dir, f"wf_{uuid.uuid4().hex}{ext}")
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

        try:
            # Eliminar anterior si existe
            if evidence.photo_url:
                from app.api.internal.common.models import MediaLibrary
                old_m = db.query(MediaLibrary).filter(MediaLibrary.url == evidence.photo_url).first()
                if old_m:
                    MediaService.delete_media(db, old_m)
                else:
                    # Fallback legacy deletion
                    MediaService.delete_media_by_url(db, evidence.photo_url)

            media_item = MediaService.upload_media(
                db=db,
                local_path=temp_path,
                media_type="image",
                category="workflow_evidence",
                ratio="original", # Preserve aspect ratio for evidence photos
                description=f"Evidencia OC {cremation.oc_number} - Paso {step.name}",
                alt_text=f"Evidencia {step.name}",
                processing_mode="optimized",
                custom_prefix=f"wf_{cremation_id}_{step_id}",
                tenant_id=tenant_id
            )
            evidence.photo_url = media_item.url
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
    db.commit()
    db.refresh(evidence)
    
    # Return enriched order for UI sync
    return get_enriched_order(db, cremation_id, tenant_id)

@router.delete("/ops/evidence/{evidence_id}", response_model=schemas.DailyOrderSchema)
async def delete_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Elimina un registro de evidencia y su archivo físico."""
    evidence = db.query(models.OrderEvidence).filter(
        models.OrderEvidence.id == evidence_id
    ).first()
    
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidencia no encontrada")
        
    # Verificar que pertenece al tenant (via cremation)
    cremation = db.query(models.Cremation).filter(
        models.Cremation.id == evidence.cremation_id,
        models.Cremation.tenant_id == tenant_id
    ).first()
    
    if not cremation:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    # Eliminar archivo (soporta R2 y MediaLibrary)
    if evidence.photo_url:
        from app.api.internal.common.models import MediaLibrary
        m_item = db.query(MediaLibrary).filter(MediaLibrary.url == evidence.photo_url).first()
        if m_item:
            MediaService.delete_media(db, m_item)
        else:
            from app.utils.images import delete_physical_file
            delete_physical_file(evidence.photo_url)

    db.delete(evidence)
    db.commit()
    
    # Return enriched order for UI sync
    return get_enriched_order(db, cremation.id, tenant_id)

@router.patch("/ops/orders/{cremation_id}/advance", response_model=schemas.DailyOrderSchema)
def advance_order_step(
    cremation_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Avanza la orden al siguiente paso del flujo.

    - Sin fase asignada: inicia la orden (primera fase + estado en_proceso).
    - Con fase: registra la hora de término de la fase actual y pasa a la siguiente
      (la evidencia es opcional).
    El estado de la orden queda siempre sincronizado con la fase.
    """
    cremation = db.query(models.Cremation).filter(
        models.Cremation.id == cremation_id,
        models.Cremation.tenant_id == tenant_id
    ).first()

    if not cremation:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if cremation.status in board.FINAL_STATUSES + board.CANCELED_STATUSES:
        raise HTTPException(status_code=400, detail="La orden ya está cerrada")

    steps = db.query(models.WorkflowStep).filter(
        models.WorkflowStep.tenant_id == tenant_id,
        models.WorkflowStep.is_active == True
    ).order_by(models.WorkflowStep.order_index).all()

    if not steps:
        raise HTTPException(status_code=400, detail="Workflow no configurado")

    tech = cremation.technical
    if not tech:
        tech = models.CremationTechnical(cremation_id=cremation.id)
        db.add(tech)

    current_index = next((i for i, st in enumerate(steps) if st.id == tech.step_id), -1) if tech.step_id else -1

    if current_index == -1:
        # Inicio (o fase inválida): primera fase
        tech.step_id = steps[0].id
    elif current_index < len(steps) - 1:
        meta = dict(tech.timeline or {})
        meta[str(tech.step_id)] = {
            "completed_at": get_tenant_now(db, tenant_id).isoformat(),
            "updated_by": current_user.id
        }
        tech.timeline = meta
        tech.step_id = steps[current_index + 1].id
    else:
        raise HTTPException(status_code=400, detail="La orden ya está en la última fase: usa «Concluir»")

    # Estado sincronizado con la fase (antes podía quedar "pendiente" con fases avanzadas)
    if cremation.status not in board.IN_PROGRESS_STATUSES:
        cremation.status = "en_proceso"
    if not tech.start_at:
        tech.start_at = tz.get_now()
    if not tech.operator_id:
        tech.operator_id = current_user.id

    db.commit()
    db.refresh(cremation)

    return get_enriched_order(db, cremation_id, tenant_id)

@router.patch("/ops/orders/{cremation_id}/revert", response_model=schemas.DailyOrderSchema)
def revert_order_step(
    cremation_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Retrocede la orden al paso anterior del flujo y elimina el registro de tiempo del paso actual (Solo Admin/Op)."""
    cremation = db.query(models.Cremation).filter(models.Cremation.id == cremation_id, models.Cremation.tenant_id == tenant_id).first()
    if not cremation:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Obtener todos los pasos ordenados
    steps = db.query(models.WorkflowStep).filter(
        models.WorkflowStep.tenant_id == tenant_id,
        models.WorkflowStep.is_active == True
    ).order_by(models.WorkflowStep.order_index).all()

    tech = cremation.technical
    if not steps or not tech or not tech.step_id:
        raise HTTPException(status_code=400, detail="No se puede retroceder")

    # Buscar índice actual

    current_index = next((i for i, s in enumerate(steps) if s.id == tech.step_id), -1)
    
    if current_index > 0:
        # Eliminar el registro de tiempo del paso anterior
        previous_step_id = str(steps[current_index - 1].id)
        meta = dict(tech.timeline or {})
        if previous_step_id in meta:
            del meta[previous_step_id]
            tech.timeline = meta
        
        # Retroceder al anterior
        tech.step_id = steps[current_index - 1].id
        
        # New: Reset status if reverting from a final state
        if cremation.status in ["entregado", "completado", "delivered", "completed"]:
            cremation.status = "en_proceso"
    else:
        # Ya está en el primero
        raise HTTPException(status_code=400, detail="Ya está en el primer paso")

    db.commit()
    db.refresh(cremation)
    
    # Return enriched order
    return get_enriched_order(db, cremation_id, tenant_id)

@router.patch("/ops/orders/{cremation_id}/finalize", response_model=schemas.DailyOrderSchema)
def finalize_order(
    cremation_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Concluye la orden: exige estar en la última fase y la marca entregada."""
    cremation = db.query(models.Cremation).filter(models.Cremation.id == cremation_id, models.Cremation.tenant_id == tenant_id).first()
    if not cremation:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if cremation.status in board.FINAL_STATUSES:
        return get_enriched_order(db, cremation_id, tenant_id)
    if cremation.status in board.CANCELED_STATUSES:
        raise HTTPException(status_code=400, detail="La orden está cancelada")

    steps = db.query(models.WorkflowStep).filter(
        models.WorkflowStep.tenant_id == tenant_id,
        models.WorkflowStep.is_active == True
    ).order_by(models.WorkflowStep.order_index).all()

    tech = cremation.technical
    now = tz.get_now()

    if steps:
        last = steps[-1]
        if not tech or tech.step_id != last.id:
            raise HTTPException(status_code=400, detail="La orden debe estar en la última fase para concluirla")
        meta = dict(tech.timeline or {})
        meta[str(last.id)] = {
            "completed_at": get_tenant_now(db, tenant_id).isoformat(),
            "updated_by": current_user.id
        }
        tech.timeline = meta

    if tech:
        tech.end_at = now

    cremation.status = "entregado"
    if cremation.scheduling:
        cremation.scheduling.completed_at = now
    else:
        db.add(models.CremationScheduling(cremation_id=cremation.id, completed_at=now))

    db.commit()
    db.refresh(cremation)

    return get_enriched_order(db, cremation_id, tenant_id)

@router.patch("/ops/orders/{cremation_id}/steps/{step_id}/time", response_model=schemas.DailyOrderSchema)
def update_step_time(
    cremation_id: int,
    step_id: int,
    completed_at: str, # ISO Format or simple datetime string
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Actualiza la fecha/hora de finalización de un paso (Solo Admin/Op)."""
    cremation = db.query(models.Cremation).filter(models.Cremation.id == cremation_id, models.Cremation.tenant_id == tenant_id).first()
    if not cremation:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Get tenant timezone
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    timezone_str = tenant.timezone if tenant and tenant.timezone else 'America/Santiago'
    
    # Parse the datetime string
    try:
        # Try to parse as ISO format first
        if 'T' in completed_at:
            # Check if it has timezone info
            if '+' in completed_at or completed_at.endswith('Z'):
                # Has timezone, parse as-is
                dt = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                # Convert to UTC if not already
                if dt.tzinfo is None:
                    dt = pytz.utc.localize(dt)
                utc_dt = dt.astimezone(pytz.utc)
            else:
                # No timezone, interpret as local time in tenant's timezone
                naive_dt = datetime.fromisoformat(completed_at)
                # Localize to tenant timezone
                tenant_tz = pytz.timezone(timezone_str)
                local_dt = tenant_tz.localize(naive_dt)
                # Convert to UTC
                utc_dt = local_dt.astimezone(pytz.utc)
        else:
            raise ValueError("Invalid format")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido (use ISO: YYYY-MM-DDTHH:MM:SS)")

    # Get technical record
    tech = cremation.technical
    if not tech:
        tech = models.CremationTechnical(cremation_id=cremation.id)
        db.add(tech)

    # Store as UTC ISO string
    utc_iso_string = utc_dt.isoformat()

    meta = dict(tech.timeline or {})
    step_key = str(step_id)
    
    # Preservar otros datos
    current_step_data = meta.get(step_key, {})
    current_step_data["completed_at"] = utc_iso_string
    current_step_data["updated_by"] = current_user.id
    current_step_data["updated_at"] = tz.get_now().isoformat()
    
    meta[step_key] = current_step_data
    tech.timeline = meta
    
    db.commit()
    db.refresh(cremation)
    
    return get_enriched_order(db, cremation_id, tenant_id)

@router.patch("/ops/orders/{cremation_id}/weight", response_model=schemas.DailyOrderSchema)
def update_cremation_weight(
    cremation_id: int,
    weight: float = Query(..., ge=0),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user)
):
    """Actualiza el peso de la mascota en la orden (Solo Admin/Op)."""
    cremation = db.query(models.Cremation).filter(models.Cremation.id == cremation_id, models.Cremation.tenant_id == tenant_id).first()
    if not cremation:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
        
    cremation.weight = weight
    
    db.commit()
    db.refresh(cremation)
    
    return get_enriched_order(db, cremation_id, tenant_id)

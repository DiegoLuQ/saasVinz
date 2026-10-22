"""
"Generar todo" del detalle de un registro: configuración del crematorio de qué
documentos se generan y con qué plantilla (certificado, tarjeta digital de
homenaje e imagen para redes). Guardado en sys_tenants.auto_documents.

El certificado lo genera el backend (/ops-records/generate); la tarjeta digital
y la imagen para redes se dibujan en el navegador con estas plantillas.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_tenant_id
from app.api.internal.admin.image_templates.schemas import ImageTemplateInDB
from app.auth import get_current_user
from app.database import get_db
from app.api.deps_features import check_feature

router = APIRouter()

# "Generar todo" + Documentos automáticos: característica del plan (sin flag = permitido).
# El GET de la configuración queda abierto: lo leen las vistas previas del registro.
GENERATE_ALL_FEATURE = check_feature("certificados:generar_todo", default=True)
REDES_FEATURE = check_feature("certificados:redes", default=True)

KINDS = ("certificate", "digital", "social")


class DocSetting(BaseModel):
    enabled: bool = True
    template_id: Optional[int] = None


class AutoDocumentsSettings(BaseModel):
    certificate: DocSetting = DocSetting()
    digital: DocSetting = DocSetting()
    social: DocSetting = DocSetting(enabled=False)


def _tenant(db: Session, tenant_id: int) -> models.Tenant:
    t = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if t is None:
        raise HTTPException(status_code=404, detail="Crematorio no encontrado")
    return t


def _settings(tenant: models.Tenant) -> AutoDocumentsSettings:
    raw = tenant.auto_documents if isinstance(tenant.auto_documents, dict) else {}
    try:
        return AutoDocumentsSettings(**raw)
    except Exception:
        return AutoDocumentsSettings()


def _social_templates(db: Session, tenant_id: int):
    return (db.query(models.ImageTemplate)
            .filter(models.ImageTemplate.is_active.is_(True),
                    or_(models.ImageTemplate.tenant_id.is_(None), models.ImageTemplate.tenant_id == tenant_id))
            .order_by(models.ImageTemplate.created_at.desc()))


def _farewell_templates(db: Session, tenant_id: int):
    FT = models.FarewellTemplate
    return db.query(FT).filter(or_(FT.tenant_id == tenant_id, FT.tenant_id.is_(None))).order_by(FT.name)


def _ai_layers(tpl: models.ImageTemplate) -> dict:
    layers = (tpl.definition or {}).get("layers") or []
    return {
        "has_ai_text": any(l.get("type") == "text" and l.get("binding") == "ai_text" for l in layers),
        "has_ai_image": any(l.get("type") == "photo" and l.get("source") == "ai" for l in layers),
    }


@router.get("")
def get_auto_documents(db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    """Configuración + opciones de plantillas + plantillas efectivas (lo que se usará)."""
    from app.api.internal.operations.documents.router import _certificate_templates, resolve_certificate_template
    from app.api.public.tenants.router import resolve_farewell_template

    tenant = _tenant(db, tenant_id)
    cfg = _settings(tenant)

    cert_opts = _certificate_templates(db, tenant_id).order_by(models.CertificateTemplate.name).all()
    cert_default, _src = resolve_certificate_template(db, tenant)
    farewell_opts = _farewell_templates(db, tenant_id).all()
    farewell_default = resolve_farewell_template(db, tenant_id)
    social_opts = _social_templates(db, tenant_id).all()

    cert_chosen = next((t for t in cert_opts if t.id == cfg.certificate.template_id), None) or cert_default
    farewell_chosen = next((t for t in farewell_opts if t.id == cfg.digital.template_id), None) or farewell_default
    social_chosen = next((t for t in social_opts if t.id == cfg.social.template_id), None)

    return {
        "settings": cfg.model_dump(),
        "options": {
            "certificate": [{"id": t.id, "name": t.name, "global": t.tenant_id is None} for t in cert_opts],
            "digital": [{"id": t.id, "name": t.name, "global": t.tenant_id is None} for t in farewell_opts],
            "social": [{"id": t.id, "name": t.name, "global": t.tenant_id is None, **_ai_layers(t)} for t in social_opts],
        },
        "defaults": {
            "certificate": {"id": cert_default.id, "name": cert_default.name} if cert_default else None,
            "digital": {"id": farewell_default.id, "name": farewell_default.name} if farewell_default else None,
        },
        # Lo que usará "Generar todo" (con datos para dibujar en el navegador).
        "resolved": {
            "certificate": {"id": cert_chosen.id, "name": cert_chosen.name} if cert_chosen else None,
            "digital": {"id": farewell_chosen.id, "name": farewell_chosen.name, "config": farewell_chosen.config}
            if farewell_chosen else None,
            "social": ({**ImageTemplateInDB.model_validate(social_chosen).model_dump(mode="json"), **_ai_layers(social_chosen)}
                       if social_chosen else None),
        },
    }


@router.put("")
def update_auto_documents(payload: AutoDocumentsSettings, db: Session = Depends(get_db),
                          tenant_id: int = Depends(get_tenant_id),
                          current_user: models.User = Depends(get_current_user),
                          _f: bool = Depends(GENERATE_ALL_FEATURE)):
    from app.api.internal.operations.documents.router import _certificate_templates

    role = getattr(current_user.role, "value", current_user.role)
    if role not in ("admin", "creator"):
        raise HTTPException(status_code=403, detail="Solo el administrador del crematorio puede cambiar esta configuración.")
    tenant = _tenant(db, tenant_id)
    checks = {
        "certificate": lambda i: _certificate_templates(db, tenant_id).filter(models.CertificateTemplate.id == i).first(),
        "digital": lambda i: _farewell_templates(db, tenant_id).filter(models.FarewellTemplate.id == i).first(),
        "social": lambda i: _social_templates(db, tenant_id).filter(models.ImageTemplate.id == i).first(),
    }
    for kind in KINDS:
        setting: DocSetting = getattr(payload, kind)
        if setting.template_id is not None and checks[kind](setting.template_id) is None:
            raise HTTPException(status_code=400, detail=f"La plantilla elegida para «{kind}» no está disponible.")
    if payload.social.enabled and payload.social.template_id is None:
        raise HTTPException(status_code=400, detail="Elige la plantilla para redes sociales o desactívala.")
    tenant.auto_documents = payload.model_dump()
    db.commit()
    return get_auto_documents(db, tenant_id)


# ---------------------------------------------------------------------------
# Medición de cada "Generar todo"
# ---------------------------------------------------------------------------

STEP_KEYS = ("cliente", "mascota", "orden") + KINDS


class RunStep(BaseModel):
    key: str = Field(..., max_length=20)
    state: str = Field(..., max_length=10)
    ms: int = Field(0, ge=0, le=3_600_000)
    detail: Optional[str] = Field(None, max_length=300)


class RunCreate(BaseModel):
    submission_id: Optional[int] = None
    cremation_id: Optional[int] = None
    pet_id: Optional[int] = None
    ai_session_id: Optional[int] = None
    started_at: datetime
    total_ms: int = Field(..., ge=0, le=3_600_000)
    steps: List[RunStep] = Field(default_factory=list, max_length=len(STEP_KEYS))


@router.post("/runs")
def record_run(payload: RunCreate, db: Session = Depends(get_db),
               tenant_id: int = Depends(get_tenant_id),
               current_user: models.User = Depends(get_current_user),
               _f: bool = Depends(GENERATE_ALL_FEATURE)):
    """Registra una ejecución. El crédito usado y el costo IA se calculan aquí
    (sesión abierta y generaciones desde el inicio), no se confía en el navegador."""
    steps = [s.model_dump() for s in payload.steps if s.key in STEP_KEYS and s.state in ("done", "error", "skipped")]
    credits_used, ai_cost = 0, 0.0
    session_id = None
    if payload.ai_session_id:
        session = (db.query(models.AiDesignSession)
                   .filter(models.AiDesignSession.id == payload.ai_session_id,
                           models.AiDesignSession.tenant_id == tenant_id).first())
        if session:
            session_id = session.id
            # Margen por diferencias de reloj entre navegador y servidor.
            since = payload.started_at - timedelta(minutes=2)
            credits_used = 1 if session.created_at and session.created_at >= since else 0
            ai_cost = float(
                db.query(func.coalesce(func.sum(models.AiGeneration.cost_usd), 0))
                .filter(models.AiGeneration.session_id == session.id, models.AiGeneration.created_at >= since)
                .scalar() or 0
            )
    run = models.DocumentRun(
        tenant_id=tenant_id, submission_id=payload.submission_id, cremation_id=payload.cremation_id,
        pet_id=payload.pet_id, ai_session_id=session_id, steps=steps, total_ms=payload.total_ms,
        ok_count=sum(1 for s in steps if s["state"] == "done"),
        error_count=sum(1 for s in steps if s["state"] == "error"),
        credits_used=credits_used, ai_cost_usd=round(ai_cost, 5),
        created_by=current_user.id, started_at=payload.started_at,
    )
    db.add(run)
    db.commit()
    return {"id": run.id, "total_ms": run.total_ms, "credits_used": credits_used}


# ---------------------------------------------------------------------------
# Imagen para redes en segundo plano (desde la ficha de la orden)
# ---------------------------------------------------------------------------

class JobCreate(BaseModel):
    cremation_id: int
    template_id: Optional[int] = None  # vacío = la plantilla de Documentos automáticos


@router.post("/jobs")
async def create_social_job(payload: JobCreate, db: Session = Depends(get_db),
                            tenant_id: int = Depends(get_tenant_id),
                            current_user: models.User = Depends(get_current_user),
                            _f: bool = Depends(REDES_FEATURE)):
    """Pide la imagen para redes de una orden. Usa el crédito / intento al instante
    (errores de crédito se informan aquí) y la genera en segundo plano."""
    from app.api.internal.admin.rbac.router import check_permission
    from app.services import social_job

    check_permission("ordenes", "edit")(db=db, current_user=current_user)
    tenant = _tenant(db, tenant_id)
    cremation = db.query(models.CremationOC).filter(
        models.CremationOC.id == payload.cremation_id, models.CremationOC.tenant_id == tenant_id).first()
    if cremation is None:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    template_id = payload.template_id or _settings(tenant).social.template_id
    tpl = _social_templates(db, tenant_id).filter(models.ImageTemplate.id == template_id).first() if template_id else None
    if tpl is None:
        raise HTTPException(status_code=400, detail="Elige la plantilla para redes en Configuración → Documentos automáticos.")
    job = social_job.start_social_job(db, tenant=tenant, cremation=cremation, tpl=tpl, user_id=current_user.id)
    return social_job.job_info(job)


@router.get("/jobs")
def list_social_jobs(cremation_id: int, db: Session = Depends(get_db),
                     tenant_id: int = Depends(get_tenant_id)):
    """Últimas tareas de la orden (más reciente primero)."""
    from app.services import social_job

    social_job.expire_stale_jobs(db, tenant_id)
    rows = (db.query(models.DocumentJob)
            .filter(models.DocumentJob.tenant_id == tenant_id, models.DocumentJob.cremation_id == cremation_id)
            .order_by(models.DocumentJob.created_at.desc()).limit(5).all())
    return [social_job.job_info(j) for j in rows]

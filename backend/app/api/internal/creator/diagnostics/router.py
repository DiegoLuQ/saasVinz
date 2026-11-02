"""Diagnóstico 360° (SuperAdmin): banco de preguntas, configuración y diagnósticos de
crematorios prospecto. Lógica en services/diagnostics.py; el PDF lo arma el navegador
(components/admin/diagnostics/DiagnosticPDF.tsx) y aquí solo se envía por correo."""
from datetime import date, datetime, time, timedelta
from io import BytesIO
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette.datastructures import Headers

from app.auth import get_current_creator
from app.core.tenant_context import apply_bypass_rls
from app.database import get_db
from app.services import diagnostics as svc
from app.utils import tz

from .models import Diagnostic, DiagnosticCategory, DiagnosticQuestion

router = APIRouter()

MAX_PDF_BYTES = 8 * 1024 * 1024


def _db(db: Session = Depends(get_db), _creator=Depends(get_current_creator)) -> Session:
    apply_bypass_rls(db)
    return db


# ===== Esquemas =====

class OptionIn(BaseModel):
    text: str = Field(..., max_length=200)
    pct: float = Field(..., ge=0, le=100)


class QuestionIn(BaseModel):
    category_id: int
    text: str = Field(..., min_length=3, max_length=300)
    help: Optional[str] = Field(None, max_length=600)
    options: List[OptionIn] = Field(..., min_length=2, max_length=6)
    allows_na: bool = False
    modes: List[int] = []
    recommendation: Optional[str] = Field(None, max_length=600)
    vinzer_feature: Optional[str] = Field(None, max_length=300)
    sort_order: int = 0
    is_active: bool = True


class CategoryIn(BaseModel):
    id: int
    name: str = Field(..., max_length=80)
    weight: float = Field(..., ge=0, le=100)
    vinzer_feature: Optional[str] = Field(None, max_length=300)


class LevelIn(BaseModel):
    min: int = Field(..., ge=0, le=100)
    name: str = Field(..., max_length=40)
    message: Optional[str] = Field(None, max_length=300)


class PlanRulesIn(BaseModel):
    free_below: int = Field(40, ge=0, le=100)


class ConfigIn(BaseModel):
    levels: List[LevelIn]
    public_mode: Literal[10, 15, 20] = 10
    promo_pct: int = Field(45, ge=0, le=90)
    promo_text: Optional[str] = Field(None, max_length=160)
    recommend_below: int = Field(60, ge=1, le=100)
    min_applicable: int = Field(70, ge=0, le=100)
    plan_rules: PlanRulesIn
    cta_url: Optional[str] = Field(None, max_length=300)


class ProspectIn(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=150)
    contact_name: str = Field(..., min_length=2, max_length=120)
    city: str = Field(..., min_length=2, max_length=80)
    region: Optional[str] = Field(None, max_length=80)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=40)
    website: Optional[str] = Field(None, max_length=200)
    monthly_cremations: Optional[int] = Field(None, ge=0, le=100000)
    consent: bool = False


class DiagnosticCreate(ProspectIn):
    mode: Literal[10, 15, 20]
    answers: dict  # {question_id: índice de alternativa | "na"}


class DiagnosticUpdate(BaseModel):
    business_name: Optional[str] = Field(None, min_length=2, max_length=150)
    contact_name: Optional[str] = Field(None, min_length=2, max_length=120)
    city: Optional[str] = Field(None, min_length=2, max_length=80)
    region: Optional[str] = Field(None, max_length=80)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=40)
    website: Optional[str] = Field(None, max_length=200)
    monthly_cremations: Optional[int] = Field(None, ge=0, le=100000)
    consent: Optional[bool] = None
    status: Optional[Literal["nuevo", "contactado", "demo", "cliente", "descartado"]] = None
    notes: Optional[str] = Field(None, max_length=2000)


def _question_dto(q: DiagnosticQuestion) -> dict:
    return {
        "id": q.id, "category_id": q.category_id, "category_key": q.category.key, "category_name": q.category.name,
        "text": q.text, "help": q.help, "options": q.options or [], "allows_na": q.allows_na,
        "modes": q.modes or [], "recommendation": q.recommendation, "vinzer_feature": q.vinzer_feature,
        "sort_order": q.sort_order, "is_active": q.is_active,
    }


def _category_dto(c: DiagnosticCategory) -> dict:
    return {"id": c.id, "key": c.key, "name": c.name, "weight": c.weight,
            "vinzer_feature": c.vinzer_feature, "sort_order": c.sort_order}


def _diag_dto(d: Diagnostic, full: bool = False, db: Session | None = None) -> dict:
    out = {
        "id": d.id, "business_name": d.business_name, "contact_name": d.contact_name, "city": d.city,
        "region": d.region, "email": d.email, "phone": d.phone, "website": d.website,
        "monthly_cremations": d.monthly_cremations, "consent": d.consent, "mode": d.mode,
        "total_pct": d.total_pct, "level": d.level, "is_partial": d.is_partial,
        "suggested_plan": d.suggested_plan, "status": d.status, "linked_tenant_id": d.linked_tenant_id,
        "sent_at": d.sent_at, "created_at": d.created_at, "updated_at": d.updated_at,
        "source": d.source, "completed_at": d.completed_at, "utm": d.utm,
        "public_url": svc.report_url(d.public_token) if d.public_token and d.completed_at else None,
    }
    if full:
        out.update(svc.report(db, d), notes=d.notes)
    return out


def _get(db: Session, diag_id: int) -> Diagnostic:
    d = db.query(Diagnostic).filter(Diagnostic.id == diag_id).first()
    if not d:
        raise HTTPException(404, "Diagnóstico no encontrado")
    return d


# ===== Banco de preguntas y configuración =====

@router.get("/questions")
def list_questions(mode: Optional[int] = Query(None), include_inactive: bool = False, db: Session = Depends(_db)):
    rows = svc.questions(db, mode, only_active=not include_inactive)
    return {
        "questions": [_question_dto(q) for q in rows],
        "categories": [_category_dto(c) for c in svc.categories(db)],
        "mode_counts": svc.mode_counts(db),
    }


@router.post("/questions", status_code=201)
def create_question(data: QuestionIn, db: Session = Depends(_db)):
    payload = data.model_dump()
    svc.validate_question(payload)
    if not db.query(DiagnosticCategory).get(data.category_id):
        raise HTTPException(404, "Categoría no encontrada")
    q = DiagnosticQuestion(**payload)
    db.add(q)
    db.commit()
    db.refresh(q)
    return _question_dto(q)


@router.put("/questions/{question_id}")
def update_question(question_id: int, data: QuestionIn, db: Session = Depends(_db)):
    q = db.query(DiagnosticQuestion).get(question_id)
    if not q:
        raise HTTPException(404, "Pregunta no encontrada")
    payload = data.model_dump()
    svc.validate_question(payload)
    if not db.query(DiagnosticCategory).get(data.category_id):
        raise HTTPException(404, "Categoría no encontrada")
    for k, v in payload.items():
        setattr(q, k, v)
    db.commit()
    db.refresh(q)
    return _question_dto(q)


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: int, db: Session = Depends(_db)):
    q = db.query(DiagnosticQuestion).get(question_id)
    if not q:
        raise HTTPException(404, "Pregunta no encontrada")
    # Los diagnósticos guardan su propia copia: borrar no altera informes anteriores
    db.delete(q)
    db.commit()


@router.put("/categories")
def update_categories(items: List[CategoryIn], db: Session = Depends(_db)):
    return [_category_dto(c) for c in svc.save_category_weights(db, [i.model_dump() for i in items])]


@router.get("/config")
def get_config(db: Session = Depends(_db)):
    return svc.get_config(db)


@router.put("/config")
def put_config(data: ConfigIn, db: Session = Depends(_db)):
    return svc.save_config(db, data.model_dump())


@router.get("/summary")
def get_summary(db: Session = Depends(_db)):
    return svc.summary(db)


# ===== Diagnósticos =====

@router.get("")
def list_diagnostics(
    q: Optional[str] = None,
    level: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[Literal["admin", "web"]] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(_db),
):
    query = db.query(Diagnostic)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Diagnostic.business_name.ilike(like), Diagnostic.city.ilike(like),
                                 Diagnostic.contact_name.ilike(like), Diagnostic.email.ilike(like)))
    if level:
        query = query.filter(Diagnostic.level == level)
    if status:
        query = query.filter(Diagnostic.status == status)
    if source:
        query = query.filter(Diagnostic.source == source)
    tzinfo = tz.get_now().tzinfo
    if date_from:
        query = query.filter(Diagnostic.created_at >= datetime.combine(date_from, time.min, tzinfo=tzinfo))
    if date_to:
        query = query.filter(Diagnostic.created_at < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=tzinfo))
    rows = query.order_by(Diagnostic.created_at.desc()).limit(500).all()
    return [_diag_dto(d) for d in rows]


@router.post("", status_code=201)
def create_diagnostic(data: DiagnosticCreate, db: Session = Depends(_db), creator=Depends(get_current_creator)):
    result = svc.compute(db, data.mode, data.answers, data.monthly_cremations)
    fields = data.model_dump(exclude={"answers", "mode"})
    d = Diagnostic(**fields, mode=data.mode, created_by=creator.id, source="admin", completed_at=tz.get_now(), **result)
    svc.link_tenant(db, d)
    db.add(d)
    db.commit()
    db.refresh(d)
    return _diag_dto(d, full=True, db=db)


@router.get("/{diag_id}")
def get_diagnostic(diag_id: int, db: Session = Depends(_db)):
    d = _get(db, diag_id)
    if not d.linked_tenant_id:
        svc.link_tenant(db, d)
        if d.linked_tenant_id:
            db.commit()
    return _diag_dto(d, full=True, db=db)


@router.patch("/{diag_id}")
def update_diagnostic(diag_id: int, data: DiagnosticUpdate, db: Session = Depends(_db)):
    d = _get(db, diag_id)
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(d, k, v)
    if "monthly_cremations" in changes:
        # El plan sugerido depende de las cremaciones al mes
        cat_pct = {s["key"]: s.get("pct") for s in d.category_scores or []}
        d.suggested_plan = svc.suggest_plan(svc.get_config(db), cat_pct, d.monthly_cremations, d.total_pct, svc.paid_plans(db))
    if "email" in changes:
        d.linked_tenant_id = None
        svc.link_tenant(db, d)
    db.commit()
    db.refresh(d)
    return _diag_dto(d, full=True, db=db)


@router.delete("/{diag_id}", status_code=204)
def delete_diagnostic(diag_id: int, db: Session = Depends(_db)):
    db.delete(_get(db, diag_id))
    db.commit()


@router.post("/{diag_id}/send")
async def send_diagnostic(
    diag_id: int,
    pdf: UploadFile = File(...),
    to: Optional[EmailStr] = Form(None),
    db: Session = Depends(_db),
):
    """Envía el informe (PDF generado en el navegador) al correo del crematorio."""
    from app.services.email import send_action_email

    d = _get(db, diag_id)
    recipient = to or d.email
    if not recipient:
        raise HTTPException(400, "El diagnóstico no tiene correo de contacto.")
    content = await pdf.read()
    if not content.startswith(b"%PDF") or len(content) > MAX_PDF_BYTES:
        raise HTTPException(400, "El informe debe ser un PDF de máximo 8 MB.")

    name = "".join(ch if ch.isalnum() else "-" for ch in d.business_name.lower()).strip("-")[:60] or "crematorio"
    attachment = UploadFile(filename=f"diagnostico-360-{name}.pdf", file=BytesIO(content),
                            headers=Headers({"content-type": "application/pdf"}))
    cfg = svc.get_config(db)
    total = f"{d.total_pct:g} %" if d.total_pct is not None else "—"
    await send_action_email(
        to=recipient,
        subject=f"Diagnóstico 360° de {d.business_name}",
        title="Tu Diagnóstico 360°",
        kicker="Vinzer",
        paragraphs=[
            f"Hola{' ' + d.contact_name.split(' ')[0] if d.contact_name else ''}, te enviamos el informe del diagnóstico de {d.business_name}.",
            "En el PDF adjunto encontrarás tu resultado por área, tus fortalezas, las oportunidades de mejora "
            "y recomendaciones concretas para tu crematorio.",
        ],
        rows=[("Resultado general", total), ("Nivel", d.level or "—")],
        button_label="Conoce Vinzer",
        button_url=cfg["cta_url"],
        attachments=[attachment],
    )
    d.sent_at = tz.get_now()
    if d.status == "nuevo":
        d.status = "contactado"
    db.commit()
    return {"sent_to": recipient, "sent_at": d.sent_at}

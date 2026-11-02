"""Diagnóstico 360° público (vinzer.cl/diagnostico): el crematorio se diagnostica solo.

1. GET  /api/public/diagnostic            preguntas activas (sin los %) con sus modalidades;
   el crematorio elige rápido / estándar / completo (por defecto `public_mode`).
2. POST /api/public/diagnostic/start      nombre del crematorio + correo (reCAPTCHA) → token.
   Queda guardado como prospecto aunque no termine.
3. POST /api/public/diagnostic/{token}/answers   respuestas → informe; envía el enlace al
   correo del crematorio y avisa al SuperAdmin.
4. GET  /api/public/diagnostic/{token}    informe (enlace privado del correo).

Lógica de puntaje en services/diagnostics.py.
"""
import logging
import secrets
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.api.internal.creator.diagnostics.models import Diagnostic
from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.tenant_context import apply_bypass_rls
from app.database import get_db
from app.services import diagnostics as svc
from app.services.recaptcha import verify_recaptcha
from app.utils import tz

logger = logging.getLogger(__name__)
router = APIRouter()

UTM_KEYS = ("utm_source", "utm_medium", "utm_campaign", "ref")


class StartIn(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    recaptcha_token: str = ""
    utm: Optional[dict] = None
    mode: Optional[int] = None  # 10 / 15 / 20; None = la modalidad por defecto de la web
    monthly_cremations: Optional[int] = Field(None, ge=1, le=100000)  # `value` de uno de los rangos


class AnswersIn(BaseModel):
    answers: dict  # {question_id: índice de alternativa | "na"}


def _by_token(db: Session, token: str) -> Diagnostic:
    d = None
    if token and len(token) <= 64:
        d = db.query(Diagnostic).filter(Diagnostic.public_token == token, Diagnostic.source == "web").first()
    if not d:
        raise HTTPException(404, "Diagnóstico no encontrado")
    return d


@router.get("")
@limiter.limit("60/minute")
def public_questions(request: Request, db: Session = Depends(get_db)):
    apply_bypass_rls(db)
    cfg = svc.get_config(db)
    counts = svc.mode_counts(db)
    return {
        "mode": cfg["public_mode"],
        "volume_ranges": svc.volume_ranges(svc.paid_plans(db)),
        "modes": [{"value": m, "count": c} for m, c in counts.items() if c > 0],
        "questions": [
            {
                "id": q.id, "category_name": q.category.name, "text": q.text, "help": q.help,
                "options": [o["text"] for o in q.options or []], "allows_na": q.allows_na,
                "modes": q.modes or [],
            }
            for q in svc.questions(db)
        ],
        "promo_pct": cfg["promo_pct"] or 0,
        "promo_text": cfg["promo_text"],
    }


@router.post("/start")
@limiter.limit("5/minute;30/hour")
async def start(request: Request, data: StartIn, db: Session = Depends(get_db)):
    ok = await verify_recaptcha(data.recaptcha_token)
    if not ok and settings.IS_PRODUCTION:
        raise HTTPException(403, "Verificación de seguridad fallida. Recarga la página e intenta de nuevo.")
    apply_bypass_rls(db)
    mode = data.mode or svc.get_config(db)["public_mode"]
    if mode not in svc.MODES or not svc.mode_counts(db).get(mode):
        raise HTTPException(400, "Modalidad no válida.")
    utm = {k: str(v)[:80] for k, v in (data.utm or {}).items() if k in UTM_KEYS and v} or None
    d = Diagnostic(
        business_name=data.business_name.strip(), email=data.email.strip().lower(), consent=True,
        mode=mode, answers=[], category_scores=[],
        source="web", public_token=secrets.token_urlsafe(24), utm=utm, monthly_cremations=data.monthly_cremations,
    )
    svc.link_tenant(db, d)
    db.add(d)
    db.commit()
    return {"token": d.public_token}


@router.post("/{token}/answers")
@limiter.limit("10/minute")
def submit_answers(request: Request, token: str, data: AnswersIn, background_tasks: BackgroundTasks,
                   db: Session = Depends(get_db)):
    apply_bypass_rls(db)
    d = _by_token(db, token)
    if d.completed_at:
        return svc.report(db, d)  # doble envío: devuelve el mismo informe
    result = svc.compute(db, d.mode, data.answers, d.monthly_cremations)
    for k, v in result.items():
        setattr(d, k, v)
    d.completed_at = tz.get_now()
    db.commit()
    db.refresh(d)
    background_tasks.add_task(_after_complete, d.id)
    return svc.report(db, d)


@router.get("/{token}")
@limiter.limit("30/minute")
def get_report(request: Request, token: str, db: Session = Depends(get_db)):
    apply_bypass_rls(db)
    d = _by_token(db, token)
    if not d.completed_at:
        raise HTTPException(409, "El diagnóstico aún no está terminado.")
    return svc.report(db, d)


async def _after_complete(diag_id: int) -> None:
    """Correo al crematorio con el enlace a su informe + aviso al SuperAdmin."""
    from app.api.internal.common.models import Notification, NotificationPriority, RecipientType
    from app.database import SessionLocal
    from app.services.email import notification_recipients, send_action_email

    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        d = db.query(Diagnostic).get(diag_id)
        if not d:
            return
        cfg = svc.get_config(db)
        url = svc.report_url(d.public_token)
        total = f"{d.total_pct:g} %" if d.total_pct is not None else "—"
        origin = (d.utm or {}).get("utm_source") or "directo"
        info = dict(business=d.business_name, email=d.email, total=total, level=d.level or "—",
                    plan=(d.suggested_plan or {}).get("plan") or "—", origin=origin, id=d.id)
        try:
            db.add(Notification(
                title=f"Nuevo diagnóstico: {d.business_name} ({total})",
                message=f"{d.email} se diagnosticó en la web: {d.level or '—'}. Plan sugerido: {info['plan']}. Origen: {origin}.",
                type="diagnostic_lead", recipient_type=RecipientType.admin, priority=NotificationPriority.high,
                action_url=f"/dashboard/diagnosticos/{d.id}", data={"diagnostic_id": d.id},
            ))
            db.commit()
        except Exception:  # noqa: BLE001
            db.rollback()
            logger.exception("No se pudo crear la notificación del diagnóstico")
    finally:
        db.close()

    promo = f"{cfg['promo_text']}: {cfg['promo_pct']} % de descuento." if cfg.get("promo_pct") else None
    try:
        await send_action_email(
            info["email"], f"Tu Diagnóstico 360°: {info['total']}", "Tu Diagnóstico 360° está listo",
            [f"Gracias por diagnosticar {info['business']}. Este es tu resultado y desde el enlace puedes ver "
             "el informe completo, con tus fortalezas, oportunidades de mejora y recomendaciones, y descargarlo en PDF."]
            + ([promo] if promo else []),
            button_label="Ver mi informe", button_url=url, kicker="Vinzer",
            rows=[("Resultado general", info["total"]), ("Nivel", info["level"])],
        )
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo enviar el informe del diagnóstico")
    try:
        await send_action_email(
            notification_recipients(), f"Nuevo diagnóstico: {info['business']} ({info['total']})",
            "Un crematorio se diagnosticó en la web",
            ["Es un prospecto caliente: acaba de ver su resultado y la oferta. Escríbele hoy."],
            kicker="Diagnóstico 360°",
            rows=[("Crematorio", info["business"]), ("Correo", info["email"]), ("Resultado", info["total"]),
                  ("Nivel", info["level"]), ("Plan sugerido", info["plan"]), ("Origen", info["origin"])],
        )
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo avisar del diagnóstico al SuperAdmin")

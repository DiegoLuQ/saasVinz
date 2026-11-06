"""Formulario público para crear un memorial de Vinzer (memorial.<dominio>/crear).

Sin invitación exige reCAPTCHA; con `invite` (enlace de un solo uso generado en
Admin → Memoriales) no. El memorial queda pendiente de pago (ver app/services/memorial_signup.py).
"""
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.internal.memorials import models as mem_models
from app.core.config import settings
from app.core.rate_limiter import limiter
from app.database import get_db
from app.services import memorial_signup as svc
from app.services.recaptcha import verify_recaptcha

router = APIRouter()


def _valid_invite(db: Session, token: Optional[str]):
    if not token:
        return None
    inv = db.query(mem_models.MemorialInvite).filter(mem_models.MemorialInvite.token == token.strip()[:64]).first()
    if not inv:
        raise HTTPException(404, "Este enlace no existe. Pide uno nuevo.")
    if inv.used_at:
        raise HTTPException(410, "Este enlace ya se usó para crear un memorial.")
    exp = inv.expires_at if inv.expires_at.tzinfo else inv.expires_at.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(410, "Este enlace venció. Pide uno nuevo.")
    return inv


@router.get("/memorial-plans")
@limiter.limit("60/minute")
def public_plans(request: Request, db: Session = Depends(get_db)):
    """Planes Vinzer vigentes (precio y límites) para la landing y la mejora de plan."""
    from app.core.tenant_context import apply_bypass_rls
    apply_bypass_rls(db)
    return svc.available_plans(db)


@router.get("/memorial-signup")
@limiter.limit("30/minute")
def get_options(request: Request, invite: Optional[str] = None, db: Session = Depends(get_db)):
    data = svc.options(db)
    inv = _valid_invite(db, invite)
    data["invite"] = {"plan": inv.plan} if inv else None
    return data


@router.post("/memorial-signup")
@limiter.limit("3/minute;15/hour")
async def submit(
    request: Request,
    background_tasks: BackgroundTasks,
    data: str = Form(...),
    photos: List[UploadFile] = File(default=[]),
    invite: Optional[str] = Form(None),
    recaptcha_token: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    try:
        payload = json.loads(data)
    except ValueError:
        raise HTTPException(400, "Datos inválidos.")
    if not isinstance(payload, dict):
        raise HTTPException(400, "Datos inválidos.")

    from app.core.tenant_context import apply_bypass_rls
    apply_bypass_rls(db)
    inv = _valid_invite(db, invite)
    if not inv and settings.IS_PRODUCTION and not await verify_recaptcha(recaptcha_token or ""):
        raise HTTPException(403, "Verificación de seguridad fallida. Intenta de nuevo.")

    values = svc.validate(db, payload, photos)
    memorial = svc.create(db, values, source="invitacion" if inv else "web", invite=inv)
    background_tasks.add_task(svc.after_create, memorial.id, False)
    return {
        "id_recuerdo": str(memorial.id_recuerdo),
        "short_code": memorial.short_code,
        "pin": memorial.access_key,
        "plan": memorial.plan,
        "status": "pending",
    }

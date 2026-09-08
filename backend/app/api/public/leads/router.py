"""
Endpoint público de captura de leads del formulario de demostración de la landing.

No reutiliza `/api/public/contact` a propósito: ese pertenece al Plan Recuerdo
(memorial gratuito) y su esquema exige datos de mascota y foto. Aquí solo se
piden tres campos y no se escribe nada en las tablas de negocio — el lead se
notifica por correo y punto.

Protección: reCAPTCHA v3 + rate limit por IP. Un formulario público en el
dominio raíz sin ambas cosas recibe spam desde el primer día.
"""
import logging
import os
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field

from app.core.rate_limiter import limiter
from app.services.recaptcha import verify_recaptcha
from app.services.email import send_demo_lead_email, DemoLeadData

logger = logging.getLogger(__name__)

router = APIRouter()


class DemoLeadRequest(BaseModel):
    recaptcha_token: str
    nombre: str = Field(..., min_length=2, max_length=100)
    empresa: str = Field(..., min_length=2, max_length=120)
    telefono: str = Field(..., min_length=6, max_length=25)
    origen: str = Field(default="landing", max_length=40)


@router.post("/leads/demo")
@limiter.limit("5/minute")
async def submit_demo_lead(
    request: Request,
    payload: DemoLeadRequest,
    background_tasks: BackgroundTasks,
):
    """
    Recibe una solicitud de demostración guiada (nombre, empresa, teléfono).
    Verifica reCAPTCHA y envía la notificación por correo en background.
    """
    is_valid = await verify_recaptcha(payload.recaptcha_token)

    # Mismo criterio que el formulario de contacto: fuera de producción no se
    # bloquea el flujo local si reCAPTCHA no está configurado.
    if not is_valid and os.getenv("ENV") != "production":
        logger.warning("reCAPTCHA no validado; se permite la ejecucion fuera de produccion")
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=403,
            detail="Verificación de seguridad fallida. Por favor, intenta de nuevo.",
        )

    background_tasks.add_task(
        send_demo_lead_email,
        DemoLeadData(
            nombre=payload.nombre.strip(),
            empresa=payload.empresa.strip(),
            telefono=payload.telefono.strip(),
            origen=payload.origen,
        ),
    )

    return {
        "ok": True,
        "message": "Recibimos tu solicitud. Te contactamos dentro del día hábil.",
    }

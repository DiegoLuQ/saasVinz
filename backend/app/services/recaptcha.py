"""
Servicio de verificación de Google reCAPTCHA v3.
Valida tokens de forma asíncrona usando httpx.
"""
import os
import logging
import httpx
from dotenv import load_dotenv

from app.core.config import settings

load_dotenv()

logger = logging.getLogger(__name__)

RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY", "")
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
MIN_SCORE = 0.5


async def verify_recaptcha(token: str) -> bool:
    """
    Verifica un token reCAPTCHA v3 con Google.
    Retorna True si el score >= MIN_SCORE, False en caso contrario.

    Falla-cerrado en producción: si no hay clave configurada, en producción se
    rechaza (la protección anti-bot no debe desactivarse silenciosamente). En
    desarrollo se omite la verificación para no estorbar pruebas locales.
    """
    if not RECAPTCHA_SECRET_KEY:
        if settings.IS_PRODUCTION:
            logger.error("RECAPTCHA_SECRET_KEY no configurada en producción: rechazando (fail-closed).")
            return False
        logger.warning("RECAPTCHA_SECRET_KEY no configurada (dev): omitiendo verificación.")
        return True

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                RECAPTCHA_VERIFY_URL,
                data={
                    "secret": RECAPTCHA_SECRET_KEY,
                    "response": token
                }
            )
            result = response.json()

            success = result.get("success", False)
            score = result.get("score", 0.0)

            if not success:
                # error-codes indica el motivo exacto del rechazo de Google:
                #   invalid-input-response  -> token inválido/expirado, o el site key
                #                              del frontend no corresponde a este secret
                #   timeout-or-duplicate    -> token reusado o generado hace >2 min
                #   invalid-input-secret    -> RECAPTCHA_SECRET_KEY mal
                logger.warning(
                    "reCAPTCHA rechazado: error-codes=%s hostname=%s",
                    result.get("error-codes"), result.get("hostname"),
                )
            else:
                logger.info(
                    "reCAPTCHA result: success=%s, score=%s, hostname=%s",
                    success, score, result.get("hostname"),
                )

            return success and score >= MIN_SCORE
    except Exception as e:
        logger.error("Error verificando reCAPTCHA: %s", e)
        return False

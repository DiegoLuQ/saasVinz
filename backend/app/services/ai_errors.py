"""Errores comunes de las plataformas de IA (Gemini, Claude, ChatGPT, OpenRouter, DeepSeek)."""
import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class AiError(Exception):
    """Mensaje presentable al usuario (español). `detail` es la respuesta cruda
    del proveedor: solo se muestra al SuperAdmin (prueba de conexión) y en logs."""

    def __init__(self, message: str, detail: Optional[str] = None, fallback: bool = True):
        super().__init__(message)
        self.detail = detail
        # False = no tiene sentido probar otra plataforma (p. ej. contenido bloqueado
        # por políticas: es el prompt, no la plataforma).
        self.fallback = fallback


def _provider_message(resp: httpx.Response) -> str:
    try:
        data = resp.json()
    except ValueError:
        return resp.text[:300]
    err = data.get("error") if isinstance(data, dict) else None
    if isinstance(err, dict):
        return str(err.get("message") or err)[:300]
    if isinstance(err, str):
        return err[:300]
    return str(data)[:300]


# Fallas temporales de la plataforma (saturación / caída momentánea): se reintentan.
TRANSIENT_STATUS = {500, 502, 503, 504, 529}
RETRY_DELAYS = (1.5, 4.0)  # esperas entre intentos (3 intentos en total)
_BUSY_MSG = "El servicio de IA está saturado en este momento. Intenta de nuevo en unos minutos."


def _is_transient(status: int, detail: str) -> bool:
    low = detail.lower()
    return status in TRANSIENT_STATUS or "high demand" in low or "overloaded" in low or "unavailable" in low


def raise_for_response(resp: httpx.Response, label: str, model: str) -> None:
    if resp.status_code < 400:
        return
    detail = _provider_message(resp)
    logger.error("%s %s respondió %s: %s", label, model, resp.status_code, detail)
    low = detail.lower()
    if resp.status_code in (401, 403) or "api key" in low or "api_key" in low:
        raise AiError("La API key de la plataforma de IA es inválida o no tiene permisos.", detail)
    if resp.status_code == 404 or "not found" in low:
        raise AiError(f"El modelo «{model}» no existe o no está disponible para esta key.", detail)
    if resp.status_code == 402 or "credit" in low or "balance" in low or "insufficient_quota" in low or "billing" in low:
        raise AiError("El servicio de IA no tiene saldo disponible. Contacta al administrador de Vinzer.", detail)
    if resp.status_code == 429 or _is_transient(resp.status_code, detail):
        raise AiError(_BUSY_MSG, detail)
    raise AiError("El servicio de IA rechazó la solicitud.", detail)


async def post_json(url: str, *, headers: dict, body: dict, timeout: float, label: str, model: str) -> dict:
    """POST a la plataforma. Las fallas temporales (saturación, 5xx) se reintentan
    hasta 3 veces con espera creciente antes de informar el error."""
    for attempt in range(len(RETRY_DELAYS) + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=body, headers=headers)
        except httpx.TimeoutException:
            raise AiError("La IA tardó demasiado en responder. Intenta nuevamente.")
        except httpx.HTTPError as e:
            logger.error("%s: error de red (%s): %s", label, model, e)
            raise AiError("No se pudo contactar al servicio de IA.", str(e))
        if (resp.status_code >= 400 and attempt < len(RETRY_DELAYS)
                and _is_transient(resp.status_code, _provider_message(resp))):
            logger.warning("%s %s respondió %s (temporal): reintento %s", label, model, resp.status_code, attempt + 1)
            await asyncio.sleep(RETRY_DELAYS[attempt])
            continue
        raise_for_response(resp, label, model)
        return resp.json()
    raise AiError(_BUSY_MSG)


async def get_json(url: str, *, headers: dict, timeout: float, label: str, model: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers)
    except httpx.TimeoutException:
        raise AiError("La plataforma tardó demasiado en responder.")
    except httpx.HTTPError as e:
        raise AiError("No se pudo contactar a la plataforma.", str(e))
    raise_for_response(resp, label, model)
    return resp.json()

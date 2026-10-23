"""Monitoreo de errores con Sentry (opcional).

Sin SENTRY_DSN no hace nada (desarrollo local). Con DSN envía los errores 500 y
las excepciones de las tareas de fondo. Nunca envía datos personales: sin
cookies, headers de autorización ni cuerpos de las peticiones (el login lleva la
contraseña en el cuerpo).
"""
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_SENSITIVE_HEADERS = {"authorization", "cookie", "set-cookie", "x-onboarding-key", "x-api-key"}


def _scrub(event, _hint):
    request = event.get("request") or {}
    headers = request.get("headers")
    if isinstance(headers, dict):
        request["headers"] = {k: ("[filtrado]" if k.lower() in _SENSITIVE_HEADERS else v) for k, v in headers.items()}
    request.pop("cookies", None)
    request.pop("data", None)
    # Los enlaces de restablecer contraseña y los tokens públicos viajan en la URL.
    if request.get("query_string"):
        request["query_string"] = "[filtrado]"
    return event


def init_sentry() -> bool:
    dsn = (settings.SENTRY_DSN or "").strip()
    if not dsn:
        return False
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=dsn,
            environment=settings.ENVIRONMENT,
            send_default_pii=False,
            max_request_body_size="never",
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            before_send=_scrub,
        )
        logger.info("Sentry activo (%s)", settings.ENVIRONMENT)
        return True
    except Exception:  # noqa: BLE001 - el monitoreo nunca debe impedir que arranque la API
        logger.exception("No se pudo iniciar Sentry")
        return False


def capture_exception(exc: BaseException, **tags) -> None:
    """Envía una excepción ya capturada (p. ej. por ErrorLoggingMiddleware)."""
    if not settings.SENTRY_DSN:
        return
    try:
        import sentry_sdk
        with sentry_sdk.new_scope() as scope:
            for k, v in tags.items():
                scope.set_tag(k, v)
            sentry_sdk.capture_exception(exc)
    except Exception:  # noqa: BLE001
        pass

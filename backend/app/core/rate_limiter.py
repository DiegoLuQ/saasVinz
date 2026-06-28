from slowapi import Limiter
from app.core.config import settings
from app.core.client_ip import get_client_ip

# IP real del cliente detrás de Traefik. Crítico para el límite de login (5/min):
# con la IP del proxy, 5 intentos fallidos de UN usuario bloqueaban el login
# de TODOS los tenants a la vez.
def get_real_ip_param(request):
    return get_client_ip(request)

# Inicialización del Limiter
# Usamos storage_uri de settings (redis:// o memory://)
limiter = Limiter(
    key_func=get_real_ip_param,
    storage_uri=settings.REDIS_URL,
    default_limits=[settings.RATE_LIMIT_API], # Límite por defecto para todo
    strategy="fixed-window" # Fixed window es más eficiente en memoria/redis
)

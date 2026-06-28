import time
import logging
import redis
from fastapi import Request, Response, status
from starlette.types import ASGIApp
from app.core.config import settings
from slowapi.errors import RateLimitExceeded
from app.core.client_ip import get_client_ip

class GlobalRateLimitMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app
        self.rate_limit_str = settings.RATE_LIMIT_API # e.g. "100/minute"
        self.limit = int(self.rate_limit_str.split("/")[0])
        self.window = 60 # Default to minute
        
        if "second" in self.rate_limit_str: self.window = 1
        elif "hour" in self.rate_limit_str: self.window = 3600
        elif "day" in self.rate_limit_str: self.window = 86400
        
        self.storage_type = "memory"
        self.memory_store = {}
        self.redis_client = None
        
        if settings.REDIS_URL.startswith("redis"):
            self.storage_type = "redis"
            try:
                self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            except Exception as e:
                print(f"Error connecting to Redis for Global Rate Limit: {e}")
                self.storage_type = "memory"

        if self.storage_type == "memory":
            # Con varias réplicas (docker-compose levanta 3 backends), los
            # contadores en memoria son por proceso: el límite efectivo se
            # multiplica por el número de réplicas. En producción debe usarse
            # Redis (REDIS_URL=redis://...).
            logging.getLogger("saas_crematorio").warning(
                "GlobalRateLimit en modo MEMORIA: los contadores no se comparten "
                "entre réplicas. Configura REDIS_URL=redis://... en producción."
            )

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]
        if not path.startswith("/api/"):
            await self.app(scope, receive, send)
            return
            
        request = Request(scope, receive)
        ip = get_client_ip(request)
        key = f"global_limit:{ip}:{int(time.time() // self.window)}"
        
        current_count = 0
        
        if self.storage_type == "redis" and self.redis_client:
            try:
                pipe = self.redis_client.pipeline()
                pipe.incr(key)
                pipe.expire(key, self.window)
                result = pipe.execute()
                current_count = result[0]
            except Exception as e:
                # Fail-open consciente: si Redis cae preferimos servir tráfico
                # sin límite a tumbar la API, pero lo dejamos registrado para
                # que la degradación no sea silenciosa.
                logging.getLogger("saas_crematorio").error(
                    f"Rate limit fail-open: Redis no disponible ({e})"
                )
        else:
            # Memory implementation (simple dict cleanup could be added but for MVP is fine)
            current_count = self.memory_store.get(key, 0) + 1
            self.memory_store[key] = current_count
            
            # Simple cleanup of old keys (naive approach to prevent memory leak)
            if len(self.memory_store) > 10000:
                current_time = int(time.time() // self.window)
                keys_to_del = [k for k in self.memory_store.keys() if int(k.split(":")[-1]) < current_time]
                for k in keys_to_del:
                    del self.memory_store[k]

        if current_count > self.limit:
             response = Response(
                content=f'{{"error": "Global rate limit exceeded: {self.limit} per {self.window} seconds"}}', 
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json"
             )
             await response(scope, receive, send)
             return

        await self.app(scope, receive, send)

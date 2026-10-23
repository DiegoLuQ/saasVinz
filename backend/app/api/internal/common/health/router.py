import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.auth import get_current_creator
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _redis_status() -> str:
    """'active' | 'error' | 'not_configured' (sin REDIS_URL el rate limit usa memoria)."""
    url = settings.REDIS_URL or ""
    if not url.startswith("redis"):
        return "not_configured"
    try:
        import redis
        client = redis.Redis.from_url(url, socket_connect_timeout=2, socket_timeout=2)
        try:
            client.ping()
        finally:
            client.close()
        return "active"
    except Exception as e:  # noqa: BLE001
        logger.warning("Health check Redis error: %s", e)
        return "error"


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Estado real de la API, la base de datos y Redis. Responde 503 si alguno
    falla, para que un monitor externo (UptimeRobot) avise.
    """
    try:
        db.execute(text("SELECT 1"))
        db_status = "active"
    except Exception as e:  # noqa: BLE001
        db_status = "error"
        logger.error("Health check DB error: %s", e)

    redis_status = _redis_status()
    healthy = db_status == "active" and redis_status != "error"
    body = {
        "status": "active" if healthy else "degraded",
        "database": db_status,
        "redis": redis_status,
        "api": "active",
        "version": "1.0.0",
    }
    return body if healthy else JSONResponse(status_code=503, content=body)

@router.post("/health/optimize")
def optimize_system(
    db: Session = Depends(get_db),
    current_creator = Depends(get_current_creator)
):
    """
    Perform system optimization: database ANALYZE and clear expired notifications.
    """
    try:
        # Run ANALYZE to update DB statistics for better query plans
        db.execute(text("ANALYZE"))
        
        # Delete notifications that are expired (not null and in the past)
        # Recipient type admin can be deleted if expired or all expired notifications
        res = db.execute(text("DELETE FROM sys_notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()"))
        deleted_count = res.rowcount
        
        db.commit()
        return {
            "status": "success",
            "message": "Base de datos optimizada y notificaciones expiradas eliminadas exitosamente.",
            "deleted_expired_notifications": deleted_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error durante la optimización del sistema: {str(e)}"
        )


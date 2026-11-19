import logging
import time

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


def _storage_mode() -> str:
    if settings.R2_BUCKET_NAME and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY:
        return "r2"
    return "local"


def _db_size_mb(db: Session) -> float | None:
    try:
        val = db.execute(text("SELECT ROUND(pg_database_size(current_database()) / 1048576.0, 1)")).scalar()
        return float(val) if val is not None else None
    except Exception:
        return None


@router.get("/health/metrics")
def health_metrics(
    db: Session = Depends(get_db),
    current_creator=Depends(get_current_creator),
):
    """Telemetría detallada para el panel Admin → Mantención SaaS."""
    t0 = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        db_status = "active"
    except Exception as e:  # noqa: BLE001
        db_latency_ms = None
        db_status = "error"
        logger.error("Health metrics DB error: %s", e)

    db_size_mb = _db_size_mb(db) if db_status == "active" else None
    redis_status = _redis_status()
    storage_mode = _storage_mode()

    errors_24h = 0
    media_files = 0
    active_announcements = 0
    total_announcements = 0

    if db_status == "active":
        try:
            errors_24h = int(db.execute(text(
                "SELECT COUNT(*) FROM sys_audit_logs WHERE status = 'error' AND created_at >= NOW() - INTERVAL '24 hours'"
            )).scalar() or 0)
        except Exception:
            errors_24h = 0
        try:
            media_files = int(db.execute(text("SELECT COUNT(*) FROM web_media_library")).scalar() or 0)
        except Exception:
            media_files = 0
        try:
            active_announcements = int(db.execute(text(
                "SELECT COUNT(*) FROM sys_tenant_announcements WHERE is_active = TRUE"
            )).scalar() or 0)
            total_announcements = int(db.execute(text(
                "SELECT COUNT(*) FROM sys_tenant_announcements"
            )).scalar() or 0)
        except Exception:
            pass

    return {
        "api": "active",
        "database": db_status,
        "db_latency_ms": db_latency_ms,
        "db_size_mb": db_size_mb,
        "redis": redis_status,
        "storage": storage_mode,
        "metrics": {
            "errors_24h": errors_24h,
            "media_files": media_files,
            "active_announcements": active_announcements,
            "total_announcements": total_announcements,
        },
    }


@router.get("/health/server-metrics")
def server_telemetry_metrics(
    db: Session = Depends(get_db),
    current_creator = Depends(get_current_creator),
):
    """
    Telemetría avanzada de hardware del VPS (RAM, CPU, Tráfico de Red),
    rendimiento y conexiones de PostgreSQL, y desglose de consumo por crematorio.
    """
    from app.services.server_metrics import collect_server_telemetry
    return collect_server_telemetry(db)


@router.post("/health/optimize")
def optimize_system(
    db: Session = Depends(get_db),
    current_creator = Depends(get_current_creator)
):
    """
    Perform system optimization: database ANALYZE and clear expired notifications and expired unused invites.
    """
    try:
        # Run ANALYZE to update DB statistics for better query plans
        db.execute(text("ANALYZE"))

        # Delete notifications that are expired (not null and in the past)
        res_notif = db.execute(text("DELETE FROM sys_notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()"))
        deleted_notifs = int(res_notif.rowcount or 0)

        # Delete expired unused memorial invites
        deleted_invites = 0
        try:
            res_inv = db.execute(text("DELETE FROM rec_memorial_invites WHERE used_at IS NULL AND expires_at < NOW()"))
            deleted_invites = int(res_inv.rowcount or 0)
        except Exception:
            deleted_invites = 0

        db.commit()
        db_size_mb = _db_size_mb(db)
        return {
            "status": "success",
            "message": "Base de datos optimizada y registros expirados eliminados exitosamente.",
            "deleted_expired_notifications": deleted_notifs,
            "deleted_expired_invites": deleted_invites,
            "db_size_mb": db_size_mb,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error durante la optimización del sistema: {str(e)}"
        )


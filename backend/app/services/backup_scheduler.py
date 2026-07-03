"""
Scheduler de backups automáticos.

Reemplaza al antiguo BackupSchedulerMiddleware, que solo corría si alguien
visitaba /api/internal/maintenance/backups/status y podía dispararse en dos
réplicas a la vez (race entre leer last_backup_at y marcar in_progress).

Diseño:
  - Tarea asyncio lanzada en el startup de cada réplica; cada CHECK_INTERVAL
    revisa la configuración en DB.
  - `pg_try_advisory_lock` (nivel sesión) garantiza que solo UNA réplica evalúa
    y ejecuta el backup; las demás se saltan el ciclo sin bloquear.
  - La lógica de "¿toca backup?" es la misma que tenía el middleware:
    día configurado + hora alcanzada + sin backup hoy + no in_progress.
"""
import asyncio
import logging
from datetime import datetime

from sqlalchemy import text

logger = logging.getLogger("saas_crematorio.backups")

CHECK_INTERVAL_SECONDS = 300

# Identificador arbitrario y fijo del advisory lock de backups (único en la app).
BACKUP_ADVISORY_LOCK_ID = 815001


def _check_and_run_backup() -> None:
    from app.database import SessionLocal
    from app import models
    from app.core.tenant_context import apply_bypass_rls
    from app.services.backup_service import run_db_backup

    db = SessionLocal()
    try:
        apply_bypass_rls(db)

        # Solo una réplica a la vez: si otra tiene el lock, no hay nada que hacer.
        got_lock = db.execute(
            text("SELECT pg_try_advisory_lock(:lock_id)"),
            {"lock_id": BACKUP_ADVISORY_LOCK_ID},
        ).scalar()
        if not got_lock:
            return

        try:
            config = db.query(models.SaaSConfig).first()
            if not (config and config.backup_enabled):
                return

            now = datetime.now()
            if now.weekday() != config.backup_day:
                return
            if now.strftime("%H:%M") < config.backup_time:
                return

            last_backup = config.last_backup_at
            if last_backup and last_backup.date() == now.date():
                return
            if config.last_backup_status == "in_progress":
                return

            logger.info("Iniciando backup automático programado (%s)", now)
            run_db_backup(db)
        finally:
            # El lock de sesión sobrevive a los commits de run_db_backup;
            # se libera explícitamente al terminar.
            db.execute(
                text("SELECT pg_advisory_unlock(:lock_id)"),
                {"lock_id": BACKUP_ADVISORY_LOCK_ID},
            )
            db.commit()
    finally:
        db.close()


async def backup_scheduler_loop() -> None:
    """Bucle infinito: corre en background desde el startup de la app."""
    logger.info("Backup scheduler iniciado (intervalo %ss)", CHECK_INTERVAL_SECONDS)
    while True:
        try:
            # El chequeo usa SQLAlchemy síncrono: se ejecuta en un thread para
            # no bloquear el event loop.
            await asyncio.to_thread(_check_and_run_backup)
        except Exception:
            logger.exception("Error en el ciclo del backup scheduler")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)

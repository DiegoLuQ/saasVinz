import os
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_admin
from app.services.backup_service import run_db_backup, create_db_dump
from typing import Dict

router = APIRouter()

@router.get("/config", response_model=schemas.BackupScheduleBase)
def get_backup_config(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """Retrieve the current database backup schedule."""
    config = db.query(models.SaaSConfig).first()
    if not config:
        # Return default if not exists
        return schemas.BackupScheduleBase()
    
    return schemas.BackupScheduleBase(
        backup_enabled=config.backup_enabled,
        backup_day=config.backup_day,
        backup_time=config.backup_time
    )

@router.post("/config", response_model=schemas.BackupScheduleBase)
def update_backup_config(
    config_in: schemas.BackupScheduleUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """Update the database backup schedule."""
    config = db.query(models.SaaSConfig).first()
    if not config:
        # Create SaaSConfig if it doesn't exist (unlikely in production)
        config = models.SaaSConfig(name="SaaS Crematorio")
        db.add(config)

    if config_in.backup_enabled is not None:
        config.backup_enabled = config_in.backup_enabled
    if config_in.backup_day is not None:
        config.backup_day = config_in.backup_day
    if config_in.backup_time is not None:
        config.backup_time = config_in.backup_time
    
    db.commit()
    db.refresh(config)
    return schemas.BackupScheduleBase(
        backup_enabled=config.backup_enabled,
        backup_day=config.backup_day,
        backup_time=config.backup_time
    )

@router.get("/status", response_model=schemas.BackupStatus)
def get_backup_status(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """Get the status and timestamp of the last database backup."""
    config = db.query(models.SaaSConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="SaaS configuration not found")
    
    return schemas.BackupStatus(
        last_backup_at=config.last_backup_at,
        last_backup_status=config.last_backup_status
    )

@router.post("/trigger")
def trigger_manual_backup(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """Manually trigger a database backup as a background task."""
    # update status to "in progress"
    config = db.query(models.SaaSConfig).first()
    if config:
        config.last_backup_status = "in_progress"
        db.commit()
        
    # La tarea abre su propia sesión de BD (no se le pasa la del request, que se
    # cerraría al responder y dejaría el estado atascado en 'in_progress').
    background_tasks.add_task(run_db_backup)
    return {"message": "Backup triggered in background", "status": "in_progress"}


@router.get("/download")
def download_db_backup(
    admin: models.User = Depends(get_current_admin)
):
    """Genera un dump de la BD on-demand y lo descarga directamente.

    No pasa por R2: ejecuta pg_dump, transmite el archivo .sql al navegador y
    borra la copia temporal del servidor una vez enviado.
    """
    try:
        file_path = create_db_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo generar el respaldo: {str(e)[:300]}")

    filename = os.path.basename(file_path)

    def _cleanup():
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
        background=BackgroundTask(_cleanup),
    )

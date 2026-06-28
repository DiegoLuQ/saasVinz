from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.auth import get_current_creator

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Real health check that verifies API and Database connectivity.
    """
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        db_status = "active"
    except Exception as e:
        db_status = "error"
        print(f"Health check DB error: {e}")

    return {
        "status": "active",
        "database": db_status,
        "api": "active",
        "version": "1.0.0"
    }

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


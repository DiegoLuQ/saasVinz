from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app import models
from app import schemas
from app.auth import get_current_user

router = APIRouter()

def sanitize_ip(ip: str) -> str:
    """Sanitize IP address to show only first 3 octets"""
    if not ip:
        return None
    parts = ip.split('.')
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.{parts[2]}.***"
    return "***"

def sanitize_user_agent(user_agent: str) -> str:
    """Sanitize user agent to remove sensitive info"""
    if not user_agent:
        return None
    # Keep only browser and OS info, remove detailed version numbers
    if len(user_agent) > 100:
        return user_agent[:100] + "..."
    return user_agent

@router.get("/", response_model=dict)
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get audit logs for the current tenant with filtering and pagination.
    Only accessible by admin users.
    """
    # Check if user is admin
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can access audit logs")
    
    # Base query filtered by tenant
    query = db.query(models.AuditLog).filter(
        models.AuditLog.tenant_id == current_user.tenant_id
    )
    
    # Apply filters
    if action:
        query = query.filter(models.AuditLog.action == action)
    
    if status:
        query = query.filter(models.AuditLog.status == status)
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(models.AuditLog.created_at >= date_from_dt)
        except ValueError:
            pass
    
    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            # Add one day to include the entire day
            date_to_dt = date_to_dt + timedelta(days=1)
            query = query.filter(models.AuditLog.created_at < date_to_dt)
        except ValueError:
            pass
    
    if search:
        search_filter = or_(
            models.AuditLog.action.ilike(f"%{search}%"),
            models.AuditLog.resource_type.ilike(f"%{search}%"),
            models.AuditLog.error_message.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Get total count before pagination
    total = query.count()
    
    # Order by most recent first and paginate
    logs = query.order_by(models.AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    # Format response with user names and sanitized data
    logs_data = []
    for log in logs:
        user_name = None
        if log.user_id:
            user = db.query(models.User).filter(models.User.id == log.user_id).first()
            if user:
                user_name = user.name
        
        logs_data.append({
            "id": log.id,
            "tenant_id": log.tenant_id,
            "user_id": log.user_id,
            "user_name": user_name,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "resource_name": log.resource_name,
            "status": log.status,
            "status_code": log.status_code,
            "ip_address": sanitize_ip(log.ip_address),
            "user_agent": sanitize_user_agent(log.user_agent),
            "error_message": log.error_message,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "logs": logs_data
    }

@router.delete("/", response_model=dict)
async def delete_audit_logs(
    delete_data: schemas.AuditLogBulkDelete,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete multiple audit logs by ID.
    Only allows deleting logs belonging to the current tenant.
    Admin access required.
    """
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can delete audit logs")
        
    # Delete query filtered by tenant AND ids in list
    result = db.query(models.AuditLog).filter(
        models.AuditLog.tenant_id == current_user.tenant_id,
        models.AuditLog.id.in_(delete_data.ids)
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {"status": "success", "deleted_count": result}

@router.post("/", response_model=schemas.AuditLogInDB)
async def create_audit_log(
    log_data: schemas.AuditLogCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new audit log entry.
    This is primarily for internal use and manual logging.
    """
    # Get IP and user agent from request
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Create log entry
    audit_log = models.AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action=log_data.action,
        resource_type=log_data.resource_type,
        resource_id=log_data.resource_id,
        status=log_data.status,
        status_code=log_data.status_code,
        resource_name=log_data.resource_name,
        details=log_data.details,
        error_message=log_data.error_message,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    
    # Get user name
    user_name = current_user.name if current_user else None
    
    return schemas.AuditLogInDB(
        id=audit_log.id,
        tenant_id=audit_log.tenant_id,
        user_id=audit_log.user_id,
        user_name=user_name,
        action=audit_log.action,
        resource_type=audit_log.resource_type,
        resource_id=audit_log.resource_id,
        status=audit_log.status,
        status_code=audit_log.status_code,
        ip_address=sanitize_ip(audit_log.ip_address),
        error_message=audit_log.error_message,
        created_at=audit_log.created_at
    )

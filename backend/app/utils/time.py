from datetime import datetime
import pytz
from sqlalchemy.orm import Session
from app import models

def get_tenant_timezone_str(db: Session, tenant_id: int) -> str:
    """Obtiene el string de la zona horaria del tenant, por defecto America/Santiago."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    return tenant.timezone if tenant and tenant.timezone else 'America/Santiago'

def get_tenant_timezone(db: Session, tenant_id: int) -> pytz.BaseTzInfo:
    """Obtiene el objeto timezone de pytz para el tenant."""
    tz_str = get_tenant_timezone_str(db, tenant_id)
    return pytz.timezone(tz_str)

def get_tenant_now(db: Session, tenant_id: int) -> datetime:
    """Obtiene la fecha y hora actual localizada en la zona horaria del tenant."""
    tz = get_tenant_timezone(db, tenant_id)
    return datetime.now(tz)

def convert_to_tenant_tz(dt: datetime, db: Session, tenant_id: int) -> datetime:
    """Convierte un objeto datetime (usualmente UTC) a la zona horaria del tenant."""
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    
    tz = get_tenant_timezone(db, tenant_id)
    return dt.astimezone(tz)

def format_tenant_datetime(dt: datetime, db: Session, tenant_id: int) -> str:
    """Formatea un datetime a string localizado (DD-MM-YYYY, HH:MM)."""
    if dt is None:
        return "N/A"
    
    local_dt = convert_to_tenant_tz(dt, db, tenant_id)
    return local_dt.strftime('%d-%m-%Y, %H:%M')

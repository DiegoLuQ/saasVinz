from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.limit_checker import LimitChecker
from app.api.deps import get_current_user
from app.models import User

def check_resource_limit(resource_name: str):
    """
    Factory que genera una dependencia para validar límites de recursos.
    """
    def dependency(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        # Ejecutar la validación
        LimitChecker.check_limit(db, current_user.tenant_id, resource_name)
        return True
        
    return dependency

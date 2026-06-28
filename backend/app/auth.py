from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

from app.core.config import settings
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Configuración
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default alineado con la config (antes 15 min hardcodeado, que no
        # coincidía con ninguna fuente de verdad real).
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Consolidamos el esquema OAuth2 hacia el endpoint de login interno
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/internal/auth/login", auto_error=False)

def decode_access_token(token: str):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(db: Session = Depends(get_db), token: Optional[str] = Depends(oauth2_scheme), request: Request = None):
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión no iniciada (Token faltante).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o token inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Estructura de token inválida (falta sub).",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Estructura de token inválida (sub no numérico).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Nota RLS: la tabla de usuarios está deliberadamente EXENTA de las políticas
    # estrictas (no figura en 007_strict_rls_policies.sql) porque este lookup
    # ocurre antes de poder fijar el contexto de tenant — el tenant sale del
    # propio usuario. No añadir RLS a esa tabla sin rediseñar este flujo.
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El usuario (ID: {user_id}) ya no existe en el sistema.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Invalidación de sesión por versión: si el token trae "ver" y no coincide
    # con el token_version actual del usuario, el token quedó obsoleto (cambio de
    # contraseña). Tokens antiguos sin "ver" se aceptan hasta su expiración (compat).
    token_ver = payload.get("ver")
    if token_ver is not None and token_ver != getattr(user, "token_version", 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada por cambio de credenciales. Inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validamos que el tenant_id del token coincida con el del usuario (excepto SuperAdmin)
    token_tenant_id = payload.get("tenant_id")
    if user.role != "creator" and user.role != models.UserRole.creator:
        try:
            token_tenant_int = int(token_tenant_id) if token_tenant_id is not None else None
        except (ValueError, TypeError):
            token_tenant_int = None
        if token_tenant_int is None or token_tenant_int != user.tenant_id:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Contexto de empresa (tenant) inválido en el token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Set tenant context for RLS
        from app.core.tenant_context import set_tenant_id, apply_tenant_rls
        set_tenant_id(str(user.tenant_id))
        apply_tenant_rls(db, user.tenant_id)
    else:
        # If creator, we bypass RLS to allow global management
        from app.core.tenant_context import set_tenant_id, apply_bypass_rls
        set_tenant_id("bypass")
        apply_bypass_rls(db)

    # Global Tenant Status Check (Solo para usuarios no-Creator)
    if user.role != "creator" and user.role != models.UserRole.creator and user.tenant:
        if user.tenant.status in [models.TenantStatus.inactive, models.TenantStatus.suspended]:
            detail_msg = f"Acceso denegado. La cuenta de {user.tenant.name} está {user.tenant.status.value}."
            if user.tenant.pending_reason:
                detail_msg += f" Motivo: {user.tenant.pending_reason}"
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail_msg
            )
            
        # 2. Vencimiento de Suscripción (Solo para planes no-FREE):
        #    Tras el período de gracia NO se bloquea el acceso completo aquí.
        #    El bloqueo selectivo (todos los módulos excepto configuracion/
        #    dashboard/perfil) se aplica en check_permission y check_feature, para
        #    que el tenant pueda entrar a Configuración -> Facturación y regularizar
        #    su pago. Ver app.utils.subscription.is_subscription_locked.
        pass

    return user

def get_current_creator(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """
    Dependencia específica para endpoints de SuperAdmin.
    """
    user = get_current_user(db, token)
    if user.role != "creator" and user.role != models.UserRole.creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de SuperAdmin para acceder a este recurso."
        )
    return user

def get_current_admin(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """
    Verify that the current user has 'admin' OR 'creator' role.
    Creators should have access to everything admins can do.
    """
    user = get_current_user(db, token)
    if user.role != models.UserRole.admin and user.role != models.UserRole.creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador"
        )
    return user

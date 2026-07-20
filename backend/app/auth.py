from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import JWTError, jwt
from passlib.context import CryptContext
import hashlib
import secrets
import os

from app.core.config import settings
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils import tz

# Configuración
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

# Cookies de sesión (S-01): el JWT vive en cookie httpOnly y el navegador la
# envía solo (todas las requests del frontend pasan por el proxy same-origin
# de Next). saasc_session es un marcador legible por JS para que el cliente
# sepa "hay sesión" sin exponer el token.
ACCESS_COOKIE_NAME = "saasc_token"
REFRESH_COOKIE_NAME = "saasc_refresh"
SESSION_MARKER_COOKIE_NAME = "saasc_session"
# El refresh solo viaja a los endpoints de auth (login/refresh/logout).
REFRESH_COOKIE_PATH = "/api/internal/auth"

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

def get_token_from_request(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[str]:
    """
    Extrae el access token: header Authorization (precedencia, compat con
    scripts/tests) o fallback a la cookie httpOnly saasc_token (S-01).
    """
    if token:
        return token
    return request.cookies.get(ACCESS_COOKIE_NAME)

# ---------------------------------------------------------------------------
# Refresh tokens (S-02): opacos, rotatorios, almacenados hasheados (SHA-256).
# ---------------------------------------------------------------------------

# Ventana en la que un refresh token ya rotado se acepta como duplicado benigno
# (dos pestañas refrescando a la vez comparten la misma cookie); pasado esto,
# el reuso se trata como robo y revoca todas las sesiones del usuario.
REFRESH_ROTATION_GRACE_SECONDS = 60

def _hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()

def create_access_token_for_user(user) -> str:
    """Access token con los claims estándar de sesión (sub/tenant_id/role/ver)."""
    return create_access_token(
        data={
            "sub": str(user.id),
            "tenant_id": str(user.tenant_id) if user.tenant_id is not None else None,
            "role": user.role,
            "ver": user.token_version,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

def _new_refresh_row(user, request: Optional[Request]) -> Tuple["models.RefreshToken", str]:
    from app.core.client_ip import get_client_ip
    raw = secrets.token_urlsafe(48)
    row = models.RefreshToken(
        user_id=user.id,
        token_hash=_hash_refresh_token(raw),
        expires_at=tz.get_now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=(request.headers.get("user-agent", "")[:255] or None) if request else None,
        ip=get_client_ip(request) if request else None,
    )
    return row, raw

def create_refresh_token(db: Session, user, request: Optional[Request] = None) -> str:
    """Crea y persiste un refresh token nuevo; devuelve el valor opaco."""
    # Poda oportunista: los tokens vencidos del usuario ya no sirven ni para
    # detección de reuso (esta compara contra revoked_at, no contra filas vivas).
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user.id,
        models.RefreshToken.expires_at <= tz.get_now(),
    ).delete(synchronize_session=False)
    db_token, raw = _new_refresh_row(user, request)
    db.add(db_token)
    db.commit()
    return raw

def revoke_user_refresh_tokens(db: Session, user_id: int) -> None:
    """Revoca todos los refresh tokens vivos de un usuario (logout global)."""
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id,
        models.RefreshToken.revoked_at.is_(None),
    ).update({models.RefreshToken.revoked_at: tz.get_now()}, synchronize_session=False)
    db.commit()

def revoke_refresh_token(db: Session, raw: str) -> None:
    """Revoca un refresh token puntual (logout de una sesión). Best-effort."""
    db_token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == _hash_refresh_token(raw),
        models.RefreshToken.revoked_at.is_(None),
    ).first()
    if db_token:
        db_token.revoked_at = tz.get_now()
        db.commit()

def rotate_refresh_token(db: Session, raw: str, request: Optional[Request] = None) -> Tuple[object, str]:
    """
    Valida y rota un refresh token. Devuelve (user, nuevo_token_opaco).

    Detección de reuso: si el token ya fue rotado/revocado fuera de la ventana
    de gracia, se asume robo y se revocan TODOS los refresh tokens del usuario.
    Dentro de la ventana (carrera multi-pestaña con la misma cookie) se emite
    un token nuevo sin castigo — el cookie jar del navegador converge al último.
    """
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión expirada o token inválido.",
    )
    db_token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == _hash_refresh_token(raw)
    ).first()
    if db_token is None:
        raise invalid

    now = tz.get_now()
    if db_token.revoked_at is not None:
        within_grace = (
            db_token.replaced_by_id is not None
            and (now - db_token.revoked_at).total_seconds() <= REFRESH_ROTATION_GRACE_SECONDS
        )
        if not within_grace:
            revoke_user_refresh_tokens(db, db_token.user_id)
            raise invalid
    if db_token.expires_at <= now:
        raise invalid

    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if user is None or not user.is_active:
        raise invalid

    new_token, new_raw = _new_refresh_row(user, request)
    db.add(new_token)
    db.flush()
    # Solo la primera rotación estampa revoked_at/replaced_by_id; un duplicado
    # en gracia no debe re-estamparla (extendería la ventana indefinidamente).
    if db_token.revoked_at is None:
        db_token.revoked_at = now
        db_token.replaced_by_id = new_token.id
    db.commit()
    return user, new_raw

# ---------------------------------------------------------------------------
# Cookies de sesión (S-01)
# ---------------------------------------------------------------------------

def set_auth_cookies(response: Response, access_token: str, refresh_token: Optional[str] = None) -> None:
    """
    Emite las cookies de sesión. Host-only por diseño (sin Domain=): admin.* y
    app.* mantienen sesiones independientes. Secure solo en producción porque
    el dev local corre sobre http (lvh.me).
    """
    secure = settings.IS_PRODUCTION
    refresh_max_age = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        ACCESS_COOKIE_NAME, access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/", httponly=True, secure=secure, samesite="lax",
    )
    if refresh_token is not None:
        response.set_cookie(
            REFRESH_COOKIE_NAME, refresh_token,
            max_age=refresh_max_age,
            path=REFRESH_COOKIE_PATH, httponly=True, secure=secure, samesite="lax",
        )
    # Marcador legible por JS: permite al cliente saber que hay sesión activa
    # (guards de login) sin exponer el JWT.
    response.set_cookie(
        SESSION_MARKER_COOKIE_NAME, "1",
        max_age=refresh_max_age,
        path="/", httponly=False, secure=secure, samesite="lax",
    )

def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    response.delete_cookie(SESSION_MARKER_COOKIE_NAME, path="/")

def decode_access_token(token: str):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(db: Session = Depends(get_db), token: Optional[str] = Depends(get_token_from_request), request: Request = None):
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

def get_current_creator(db: Session = Depends(get_db), token: str = Depends(get_token_from_request)):
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

def get_current_admin(db: Session = Depends(get_db), token: str = Depends(get_token_from_request)):
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

"""Quién ve qué dentro del tenant: avisos del dueño vs. del equipo.

- Dueño = admin del tenant o creator. Solo el dueño ve lo comercial
  (suscripción, pagos, cambios de plan, difusiones del creador, promos).
- 'ordenes': roles con el módulo de órdenes activo (p. ej. recepción) ven las
  solicitudes web entrantes, porque son su trabajo.
- 'all': avisos operativos para todo el equipo.
"""
from typing import Iterable, Optional, Set

from fastapi import HTTPException
from sqlalchemy import and_, exists
from sqlalchemy.orm import Session

from app import models
from app.utils import tz

OWNER_ROLES = {models.UserRole.admin, models.UserRole.creator}
AUDIENCE_OWNER = "owner"
AUDIENCE_ORDENES = "ordenes"
AUDIENCE_ALL = "all"

# Anuncios del creador que son comerciales (upsell) y solo le importan al dueño
OWNER_ONLY_ANNOUNCEMENT_TYPES = {models.AnnouncementType.promo}


def is_owner(user: models.User) -> bool:
    return user.role in OWNER_ROLES or user.role == "creator"


def user_audiences(db: Session, user: models.User, active_modules: Optional[Iterable[str]] = None) -> Set[str]:
    """Audiencias que alcanzan al usuario. `active_modules` evita recalcular
    permisos cuando el llamador (bootstrap) ya los tiene."""
    if is_owner(user):
        return {AUDIENCE_OWNER, AUDIENCE_ORDENES, AUDIENCE_ALL}

    audiences = {AUDIENCE_ALL}
    if active_modules is not None:
        has_ordenes = "ordenes" in set(active_modules)
    else:
        from app.api.internal.admin.rbac.router import check_permission
        try:
            check_permission("ordenes", "view")(db=db, current_user=user)
            has_ordenes = True
        except HTTPException:
            has_ordenes = False
    if has_ordenes:
        audiences.add(AUDIENCE_ORDENES)
    return audiences


def _state_exists(user_id: int, *conditions):
    return exists().where(and_(
        models.NotificationUserState.notification_id == models.Notification.id,
        models.NotificationUserState.user_id == user_id,
        *conditions,
    ))


def visible_notifications(db: Session, user: models.User, audiences: Set[str], include_read: bool = False):
    """Notificaciones del tenant visibles para el usuario (sin las descartadas por él)."""
    query = db.query(models.Notification).filter(
        models.Notification.tenant_id == user.tenant_id,
        models.Notification.audience.in_(audiences),
        ~_state_exists(user.id, models.NotificationUserState.dismissed_at.isnot(None)),
    )
    if not include_read:
        query = query.filter(
            models.Notification.is_read == False,  # noqa: E712 — resuelta para todos
            ~_state_exists(user.id, models.NotificationUserState.read_at.isnot(None)),
        )
    return query


def read_ids(db: Session, user_id: int, notification_ids: Iterable[int]) -> Set[int]:
    ids = list(notification_ids)
    if not ids:
        return set()
    rows = db.query(models.NotificationUserState.notification_id).filter(
        models.NotificationUserState.user_id == user_id,
        models.NotificationUserState.notification_id.in_(ids),
        models.NotificationUserState.read_at.isnot(None),
    ).all()
    return {r[0] for r in rows}


def mark_for_user(db: Session, notification_id: int, user_id: int, *, read: Optional[bool] = None, dismissed: bool = False):
    state = db.query(models.NotificationUserState).filter(
        models.NotificationUserState.notification_id == notification_id,
        models.NotificationUserState.user_id == user_id,
    ).first()
    if not state:
        state = models.NotificationUserState(notification_id=notification_id, user_id=user_id)
        db.add(state)
    now = tz.get_now()
    if read is not None:
        state.read_at = now if read else None
    if dismissed:
        state.dismissed_at = now
        state.read_at = state.read_at or now
    return state

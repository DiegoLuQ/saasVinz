"""Solicitudes de productos del catálogo público (panel). Lógica en
app/services/product_requests.py. Ver = órdenes:ver; gestionar = órdenes:editar."""
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user, get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.database import get_db
from app.services import product_requests as pr

router = APIRouter()


def _tenant(db: Session, tenant_id: int):
    return db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()


@router.get("")
def list_product_requests(
    status: Optional[Literal["pending", "accepted", "delivered", "rejected", "cancelled"]] = None,
    kind: Optional[Literal["order", "external"]] = None,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "view")),
):
    tenant = _tenant(db, tenant_id)
    rows = pr.list_requests(db, tenant_id, status, kind)
    return {"items": [pr.to_dict(db, r, tenant) for r in rows], "counts": pr.counts(db, tenant_id)}


@router.get("/{request_id}")
def get_product_request(
    request_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "view")),
):
    return pr.to_dict(db, pr.get(db, tenant_id, request_id), _tenant(db, tenant_id))


@router.post("/{request_id}/accept")
def accept_product_request(
    request_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "edit")),
    user: models.User = Depends(get_current_user),
):
    return pr.to_dict(db, pr.accept(db, tenant_id, request_id, user.id), _tenant(db, tenant_id))


@router.post("/{request_id}/items/{index}/accept")
def accept_product_request_line(
    request_id: int,
    index: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "edit")),
    user: models.User = Depends(get_current_user),
):
    """Agrega un solo producto de la solicitud (descuenta su stock)."""
    return pr.to_dict(db, pr.accept_line(db, tenant_id, request_id, index, user.id), _tenant(db, tenant_id))


@router.post("/{request_id}/items/{index}/discard")
def discard_product_request_line(
    request_id: int,
    index: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "edit")),
    user: models.User = Depends(get_current_user),
):
    """Descarta un producto de la solicitud (no disponible)."""
    return pr.to_dict(db, pr.discard_line(db, tenant_id, request_id, index, user.id), _tenant(db, tenant_id))


class RejectIn(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=300)


@router.post("/{request_id}/reject")
def reject_product_request(
    request_id: int,
    data: RejectIn,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "edit")),
    user: models.User = Depends(get_current_user),
):
    return pr.to_dict(db, pr.reject(db, tenant_id, request_id, user.id, data.reason), _tenant(db, tenant_id))


@router.post("/{request_id}/deliver")
def deliver_product_request(
    request_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "edit")),
):
    return pr.to_dict(db, pr.deliver(db, tenant_id, request_id), _tenant(db, tenant_id))


@router.post("/{request_id}/cancel")
def cancel_product_request(
    request_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "edit")),
    user: models.User = Depends(get_current_user),
):
    return pr.to_dict(db, pr.cancel(db, tenant_id, request_id, user.id), _tenant(db, tenant_id))

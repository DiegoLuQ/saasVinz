"""Convenios con empresas (descuentos para sus clientes).

Gestión: Clientes → Convenios (`clientes` view/create/edit/delete + feature de
plan `clientes:convenios`). El selector de la orden usa `/active-options`, que
solo exige sesión del tenant (igual que las veterinarias), para que quien crea
órdenes pueda elegir el convenio sin tener acceso a su gestión.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.deps_features import check_feature
from app.api.internal.catalog.models import Service
from app.api.internal.operations.models import CremationFinancial, CremationOC
from app.services import agreements as agreement_rules
from .models import Agreement
from . import schemas

router = APIRouter(prefix="/api/internal/agreements", tags=["Tenant - Convenios"])

FEATURE = "clientes:convenios"


def _get(db: Session, tenant_id: int, agreement_id: int) -> Agreement:
    obj = db.query(Agreement).filter(Agreement.id == agreement_id, Agreement.tenant_id == tenant_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Convenio no encontrado")
    return obj


def _validate_service(db: Session, tenant_id: int, payload: schemas.AgreementBase) -> None:
    if payload.special_service_id is None:
        return
    ok = db.query(Service.id).filter(Service.id == payload.special_service_id, Service.tenant_id == tenant_id).first()
    if not ok:
        raise HTTPException(status_code=400, detail="El servicio especial no existe")


def _usage(db: Session, tenant_id: int) -> dict:
    rows = (
        db.query(
            CremationFinancial.agreement_id,
            func.count(CremationFinancial.cremation_id),
            func.coalesce(func.sum(CremationFinancial.agreement_discount), 0.0),
        )
        .join(CremationOC, CremationOC.id == CremationFinancial.cremation_id)
        .filter(
            CremationFinancial.tenant_id == tenant_id,
            CremationFinancial.agreement_id.isnot(None),
            func.lower(func.coalesce(CremationOC.status, "")).notin_(["cancelado", "canceled"]),
        )
        .group_by(CremationFinancial.agreement_id)
        .all()
    )
    return {r[0]: (int(r[1]), float(r[2] or 0)) for r in rows}


def _out(obj: Agreement, usage: dict) -> schemas.AgreementOut:
    out = schemas.AgreementOut.model_validate(obj)
    out.orders_count, out.total_discount = usage.get(obj.id, (0, 0.0))
    return out


def _save(db: Session, obj: Agreement) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un convenio con ese nombre")
    db.refresh(obj)


@router.get("/active-options", response_model=List[schemas.AgreementOption])
def active_options(db: Session = Depends(get_db), tenant_id: int = Depends(get_tenant_id)):
    if not agreement_rules.enabled_for(db, tenant_id):
        return []  # el plan no incluye convenios: el selector de la orden queda vacío
    return (
        db.query(Agreement)
        .options(joinedload(Agreement.special_service))
        .filter(Agreement.tenant_id == tenant_id, Agreement.is_active.is_(True))
        .order_by(Agreement.name)
        .all()
    )


@router.get("", response_model=List[schemas.AgreementOut])
def list_agreements(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("clientes", "view")),
    _feat: bool = Depends(check_feature(FEATURE, default=True)),
):
    items = (
        db.query(Agreement)
        .options(joinedload(Agreement.special_service))
        .filter(Agreement.tenant_id == tenant_id)
        .order_by(Agreement.is_active.desc(), Agreement.name)
        .all()
    )
    usage = _usage(db, tenant_id)
    return [_out(a, usage) for a in items]


@router.post("", response_model=schemas.AgreementOut, status_code=201)
def create_agreement(
    payload: schemas.AgreementCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("clientes", "create")),
    _feat: bool = Depends(check_feature(FEATURE, default=True)),
):
    _validate_service(db, tenant_id, payload)
    data = payload.model_dump()
    if not data["special_service_id"]:
        data["special_service_discount_pct"] = 0
    obj = Agreement(tenant_id=tenant_id, **data)
    db.add(obj)
    _save(db, obj)
    return _out(obj, {})


@router.put("/{agreement_id}", response_model=schemas.AgreementOut)
def update_agreement(
    agreement_id: int,
    payload: schemas.AgreementUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("clientes", "edit")),
    _feat: bool = Depends(check_feature(FEATURE, default=True)),
):
    obj = _get(db, tenant_id, agreement_id)
    _validate_service(db, tenant_id, payload)
    data = payload.model_dump()
    if not data["special_service_id"]:
        data["special_service_discount_pct"] = 0
    for k, v in data.items():
        setattr(obj, k, v)
    _save(db, obj)
    return _out(obj, _usage(db, tenant_id))


@router.delete("/{agreement_id}")
def delete_agreement(
    agreement_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("clientes", "delete")),
    _feat: bool = Depends(check_feature(FEATURE, default=True)),
):
    """Con órdenes asociadas se desactiva (las órdenes conservan su copia); sin órdenes se borra."""
    obj = _get(db, tenant_id, agreement_id)
    used = db.query(CremationFinancial.cremation_id).filter(
        CremationFinancial.tenant_id == tenant_id, CremationFinancial.agreement_id == obj.id
    ).first()
    if used:
        obj.is_active = False
        db.commit()
        return {"deleted": False, "deactivated": True}
    db.delete(obj)
    db.commit()
    return {"deleted": True, "deactivated": False}

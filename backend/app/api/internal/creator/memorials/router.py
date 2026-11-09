import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.api.internal.memorials.models import Memorial, MemorialPlan, MemorialInvite, MemorialStatus
from app.services import memorial_plans, memorial_signup
from app.services.memorial_notifications import _memorial_base_url
from app.api.internal.memorials.services import merge_diseno
from app.api.internal.crm.models import Pet, Customer
from app.api.internal.admin.models import Tenant
from app import models, auth
from . import schemas
from typing import List, Optional

router = APIRouter()

@router.get("/plans", response_model=List[schemas.MemorialPlanResponse])
def list_memorial_plans(
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Planes asignables a un memorial: los de Vinzer activos + Partner."""
    rows = memorial_plans.vinzer_plans(db)
    partner = memorial_plans.partner_plan(db)
    return rows + ([partner] if partner else [])


class PlanCatalogUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=60)
    price: Optional[float] = Field(None, ge=0, le=100000)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    billing: Optional[str] = None
    description: Optional[str] = Field(None, max_length=300)
    highlight: Optional[bool] = None
    sort_order: Optional[int] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None
    features: Optional[dict] = None
    discount_percent: Optional[float] = Field(None, ge=0, le=95)
    discount_label: Optional[str] = Field(None, max_length=40)


class GlobalDiscountUpdate(BaseModel):
    discount_percent: float = Field(..., ge=0, le=95)
    discount_label: Optional[str] = Field(None, max_length=40)


@router.get("/plan-catalog")
def plan_catalog(db: Session = Depends(get_db), current_creator: models.User = Depends(auth.get_current_creator)):
    """Planes Vinzer (todos, también inactivos) + Partner, con precio y límites editables."""
    rows = memorial_plans.vinzer_plans(db, only_active=False)
    partner = memorial_plans.partner_plan(db)
    out = [memorial_plans.serialize(p) for p in ([partner] if partner else []) + rows]
    from sqlalchemy import func
    counts = dict(db.query(Memorial.plan_id, func.count(Memorial.id)).group_by(Memorial.plan_id).all())
    for p in out:
        p["memorials"] = counts.get(p["id"], 0)
    return out


@router.put("/plan-catalog/{plan_id}")
def update_plan_catalog(
    plan_id: int,
    body: PlanCatalogUpdate,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Edita precio, cobro y límites. El precio nuevo solo aplica a contratos nuevos."""
    plan = db.query(MemorialPlan).filter(MemorialPlan.id == plan_id,
                                          MemorialPlan.kind.in_([memorial_plans.KIND_VINZER, memorial_plans.KIND_PARTNER])).first()
    if not plan:
        raise HTTPException(404, "Plan no encontrado.")
    is_partner = plan.kind == memorial_plans.KIND_PARTNER
    if body.name is not None:
        plan.name = body.name.strip()
    if body.description is not None:
        plan.description = body.description.strip() or None
    if not is_partner:
        if body.price is not None:
            plan.price = round(body.price, 2)
        if body.currency is not None:
            plan.currency = body.currency.upper()
        if body.billing is not None:
            if body.billing not in (memorial_plans.BILLING_YEARLY, memorial_plans.BILLING_ONE_TIME):
                raise HTTPException(400, "Cobro no válido: anual o pago único.")
            plan.billing = body.billing
        if body.highlight is not None:
            plan.highlight = body.highlight
        if body.sort_order is not None:
            plan.sort_order = body.sort_order
        if body.is_active is not None:
            plan.is_active = body.is_active
        if body.discount_percent is not None or body.discount_label is not None:
            memorial_plans.set_discount(plan, body.discount_percent, body.discount_label)
    if body.features is not None:
        plan.features = memorial_plans.clean_features(body.features, base=memorial_plans.features_of(plan))
    db.commit()
    db.refresh(plan)
    return memorial_plans.serialize(plan)


@router.post("/plan-catalog/global-discount")
def apply_global_discount(
    body: GlobalDiscountUpdate,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Aplica un porcentaje de descuento (0 a 95%) y etiqueta opcional a todos los planes de venta directa Vinzer."""
    rows = memorial_plans.vinzer_plans(db, only_active=False)
    for p in rows:
        memorial_plans.set_discount(p, body.discount_percent, body.discount_label if body.discount_percent > 0 else "")
    db.commit()
    return plan_catalog(db=db, current_creator=current_creator)

@router.get("", response_model=List[schemas.AdminMemorialResponse])
def list_all_memorials(
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50
):
    query = db.query(Memorial).options(
        joinedload(Memorial.pet).joinedload(Pet.customer),
        joinedload(Memorial.tenant)
    )

    if search:
        # Simple search by pet name or customer name
        query = query.join(Memorial.pet).join(Pet.customer).filter(
            (Pet.name.ilike(f"%{search}%")) | 
            (Customer.name.ilike(f"%{search}%"))
        )

    memorials = query.order_by(Memorial.fecha.desc()).offset(skip).limit(limit).all()
    from app.services.memorial_delete import dedication_counts
    counts = dedication_counts(db, [m.id for m in memorials])

    return [
        schemas.AdminMemorialResponse(
            id=m.id,
            id_recuerdo=str(m.id_recuerdo),
            pet_name=m.pet.name if m.pet else "Desconocido",
            pet_image_url=m.pet.image_url if m.pet else None,
            customer_name=m.pet.customer.name if m.pet and m.pet.customer else "Desconocido",
            tenant_name=m.tenant.name if m.tenant else "Desconocido",
            tenant_slug=m.tenant.slug if m.tenant else "default",
            short_code=m.short_code,
            plan_price=m.plan_price,
            plan_currency=m.plan_currency,
            plan_billing=m.plan_billing,
            tenant_id=m.tenant.id if m.tenant else 0,
            plan=m.plan,
            status=m.status,
            valid_until=m.valid_until,
            dedicatoria=m.msg_despedida,
            main_image_url=m.main_image_url,
            lista_imagenes=m.lista_imagenes,
            diseno=m.diseno,
            access_key=m.access_key,
            created_at=m.fecha,
            dedications_count=counts.get(m.id, 0),
        )
        for m in memorials
    ]


class MemorialBulkDelete(BaseModel):
    ids: List[int] = Field(..., min_length=1, max_length=100)


@router.post("/bulk-delete")
def bulk_delete_memorials(
    payload: MemorialBulkDelete,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Elimina varios memoriales; los que tienen mensajes se omiten (ver services/memorial_delete.py)."""
    from app.services.memorial_delete import delete_memorials
    return delete_memorials(db, payload.ids)


@router.delete("/{memorial_id}")
def delete_memorial(
    memorial_id: int,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Elimina un memorial sin mensajes (409 si tiene alguno)."""
    from app.services.memorial_delete import delete_memorials
    res = delete_memorials(db, [memorial_id])
    if not res["deleted"]:
        reason = res["skipped"][0]["reason"] if res["skipped"] else "No existe"
        if reason == "No existe":
            raise HTTPException(status_code=404, detail="Memorial no encontrado")
        raise HTTPException(status_code=409, detail=f"No se puede eliminar: {reason.lower()}. Los mensajes de la familia se conservan.")
    return res

@router.patch("/{memorial_id}", response_model=schemas.AdminMemorialResponse)
def update_memorial_admin(
    memorial_id: int,
    update_data: schemas.AdminMemorialUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    memorial = db.query(Memorial).options(
        joinedload(Memorial.pet).joinedload(Pet.customer),
        joinedload(Memorial.tenant)
    ).filter(Memorial.id == memorial_id).first()

    if not memorial:
        raise HTTPException(status_code=404, detail="Memorial not found")
    was_pending = memorial.status == MemorialStatus.pending

    if update_data.valid_until is not None:
        memorial.valid_until = update_data.valid_until
        memorial.expiry_notice_for = None  # nueva vigencia: vuelve a avisar 1 mes antes

    # Cambio de plan = contrato nuevo: se congela el precio actual de ese plan
    new_key = (update_data.plan or "").strip().lower()
    upgraded_from = None  # Partner/otro → plan Vinzer: correo «tu memorial ahora es Plan X»
    if new_key and new_key != (memorial.plan or "").strip().lower():
        new_plan = (memorial_plans.get_vinzer_plan(db, new_key)
                    or (memorial_plans.partner_plan(db) if new_key == "partner" else None))
        if new_plan is not None:
            old_plan = memorial_plans.plan_of(db, memorial)
            if (new_plan.kind == memorial_plans.KIND_VINZER and memorial.status == MemorialStatus.active
                    and not was_pending):
                upgraded_from = old_plan.name if old_plan else (memorial.plan or "Partner")
            memorial_plans.assign(memorial, new_plan, start_period=memorial.status == MemorialStatus.active
                                  and update_data.valid_until is None)
        else:
            memorial.plan = update_data.plan
        
    if update_data.status is not None:
        memorial.status = update_data.status

    if update_data.dedicatoria is not None:
        memorial.msg_despedida = update_data.dedicatoria

    if memorial.pet:
        if update_data.pet_name is not None:
            memorial.pet.name = update_data.pet_name
        if update_data.pet_image_url is not None:
            memorial.pet.image_url = update_data.pet_image_url

    if update_data.main_image_url is not None:
        memorial.main_image_url = update_data.main_image_url

    if update_data.diseno is not None:
        memorial.diseno = merge_diseno(memorial.diseno, update_data.diseno)

    if update_data.access_key is not None:
        memorial.access_key = update_data.access_key

    # Pago confirmado (pendiente → activo): vigencia según el plan y correo con enlace + PIN
    # Solo memoriales vendidos por Vinzer (creados con este flujo: diseno.origen); los de crematorios no cambian.
    activated = (was_pending and memorial.status == MemorialStatus.active
                 and bool((memorial.diseno or {}).get("origen")))
    if activated and update_data.valid_until is None:
        memorial_signup.activate_memorial(memorial)

    db.commit()
    db.refresh(memorial)
    if activated:
        background_tasks.add_task(memorial_signup.send_welcome_in_background, memorial.id)
    elif upgraded_from and memorial.status == MemorialStatus.active:
        from app.services import memorial_upgrade
        background_tasks.add_task(memorial_upgrade.send_upgraded_email, memorial.id, upgraded_from)
    return schemas.AdminMemorialResponse(
        id=memorial.id,
        id_recuerdo=str(memorial.id_recuerdo),
        pet_name=memorial.pet.name if memorial.pet else "Desconocido",
        pet_image_url=memorial.pet.image_url if memorial.pet else None,
        customer_name=memorial.pet.customer.name if memorial.pet and memorial.pet.customer else "Desconocido",
        tenant_name=memorial.tenant.name if memorial.tenant else "Desconocido",
        tenant_slug=memorial.tenant.slug if memorial.tenant else "default",
        short_code=memorial.short_code,
        plan_price=memorial.plan_price,
        plan_currency=memorial.plan_currency,
        plan_billing=memorial.plan_billing,
        tenant_id=memorial.tenant.id if memorial.tenant else 0,
        plan=memorial.plan,
        status=memorial.status,
        valid_until=memorial.valid_until,
        dedicatoria=memorial.msg_despedida,
        main_image_url=memorial.main_image_url,
        lista_imagenes=memorial.lista_imagenes,
        diseno=memorial.diseno,
        access_key=memorial.access_key,
        created_at=memorial.fecha
    )



# ------------------- Memoriales de Vinzer (creados por el SuperAdmin o por la familia) -------------------

@router.get("/signup-options")
def signup_options(db: Session = Depends(get_db), current_creator: models.User = Depends(auth.get_current_creator)):
    return memorial_signup.options(db)


@router.post("/new")
async def create_memorial_admin(
    background_tasks: BackgroundTasks,
    data: str = Form(...),
    photos: List[UploadFile] = File(default=[]),
    activate: bool = Form(False),
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    try:
        payload = json.loads(data)
    except ValueError:
        raise HTTPException(400, "Datos inválidos.")
    if not isinstance(payload, dict):
        raise HTTPException(400, "Datos inválidos.")
    values = memorial_signup.validate(db, payload, photos)
    memorial = memorial_signup.create(db, values, source="admin", activate=activate)
    background_tasks.add_task(memorial_signup.after_create, memorial.id, activate)
    return {
        "id": memorial.id,
        "id_recuerdo": str(memorial.id_recuerdo),
        "short_code": memorial.short_code,
        "pin": memorial.access_key,
        "plan": memorial.plan,
        "status": "active" if activate else "pending",
    }


class InviteCreate(BaseModel):
    plan: Optional[str] = None
    note: Optional[str] = Field(None, max_length=200)
    expires_in_days: int = Field(7, ge=1, le=60)


def _invite_out(inv: MemorialInvite) -> dict:
    now = datetime.now(timezone.utc)
    exp = inv.expires_at if inv.expires_at.tzinfo else inv.expires_at.replace(tzinfo=timezone.utc)
    return {
        "id": inv.id,
        "url": f"{_memorial_base_url()}/crear?i={inv.token}",
        "plan": inv.plan,
        "note": inv.note,
        "created_at": inv.created_at,
        "expires_at": inv.expires_at,
        "used_at": inv.used_at,
        "memorial_id": inv.memorial_id,
        "status": "usado" if inv.used_at else ("vencido" if exp < now else "activo"),
    }


@router.get("/invites")
def list_invites(db: Session = Depends(get_db), current_creator: models.User = Depends(auth.get_current_creator)):
    rows = db.query(MemorialInvite).order_by(MemorialInvite.created_at.desc()).limit(100).all()
    return [_invite_out(i) for i in rows]


@router.post("/invites")
def create_invite(
    body: InviteCreate,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    plan = (body.plan or "").strip().lower() or None
    if plan and not memorial_plans.get_vinzer_plan(db, plan):
        raise HTTPException(400, "Plan no válido.")
    inv = MemorialInvite(
        token=secrets.token_urlsafe(24),
        plan=plan,
        note=(body.note or "").strip() or None,
        created_by=current_creator.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=body.expires_in_days),
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _invite_out(inv)


@router.post("/{memorial_id}/renew")
def renew_memorial(
    memorial_id: int,
    background_tasks: BackgroundTasks,
    notify: bool = True,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Renueva 1 año al precio congelado (pago confirmado por el SuperAdmin)."""
    from app.services import memorial_expiry
    memorial = db.query(Memorial).filter(Memorial.id == memorial_id).first()
    if not memorial:
        raise HTTPException(404, "Memorial no encontrado.")
    if memorial.plan_billing != memorial_plans.BILLING_YEARLY:
        raise HTTPException(400, "Solo se renuevan los planes anuales.")
    if memorial.status == MemorialStatus.archived:
        raise HTTPException(400, "El memorial está archivado.")
    valid_until = memorial_expiry.renew(memorial)
    db.commit()
    if notify:
        background_tasks.add_task(memorial_expiry.send_renewed_email, memorial.id)
    return {"ok": True, "valid_until": valid_until.isoformat(), "status": "active",
            "plan_price": memorial.plan_price, "plan_currency": memorial.plan_currency}


@router.delete("/invites/{invite_id}")
def delete_invite(invite_id: int, db: Session = Depends(get_db), current_creator: models.User = Depends(auth.get_current_creator)):
    inv = db.query(MemorialInvite).filter(MemorialInvite.id == invite_id).first()
    if not inv:
        raise HTTPException(404, "Enlace no encontrado.")
    db.delete(inv)
    db.commit()
    return {"ok": True}

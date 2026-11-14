"""Corregir el peso o el rango de peso de una orden desde el detalle (pestaña «$»).

La familia elige un RANGO en el formulario («4 – 7 kg»), no kg; si se equivocó, el
crematorio lo corrige aquí y el servidor recalcula el precio:

- Recargo por tramo (modo General «surcharge»): `oc_financial.weight_price` = precio
  del tramo.
- Precio por plan y peso (modo «table», o la orden viene de una tabla de precios de
  promoción, `oc_financial.price_list_id`): el recargo es 0 y cada línea de plan toma
  su precio en ese tramo (`price_lists.plan_price`).

Después se recalcula todo como en los descuentos (`CremationService.recompute_totals`:
convenio, % manual, total y comisión de la veterinaria). Con kg se guarda
`oc_cremations.weight`; eligiendo solo un rango se borra el kg si ya no cae en él.
El rango queda como texto en `crm_pets.size` (mismo formato que el formulario), y lo
que eligió la familia sigue intacto en su registro web (`pet_data.size`).

Cambio de plan (fase 2, `plan_id` + `replace_line_id`): la línea del plan elegida se
reemplaza por el plan nuevo (precio del plan en el rango con la tabla, o su precio
base; copia de lo vendido por el listener de order_snapshot). Sus ánforas/insumos
incluidos (`oc_products.plan_id`) vuelven al stock y se toman las del plan nuevo a $0;
la falta de stock no bloquea (queda «pendiente de stock», como al procesar un registro).
"""
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models
from app.services.public_form_config import (
    get_weight_tiers, plan_fits_weight, tier_for_weight, tier_range_text, uses_price_table,
)

MAX_KG = 500


def _tier_text(t) -> str:
    rng = tier_range_text(t.min_weight, t.max_weight)
    return f"{t.label} ({rng})" if t.label else rng


def _context(db: Session, tenant_id: int, oc):
    fin = oc.financial
    pl = None
    if fin and fin.price_list_id:
        pl = db.query(models.PriceList).filter(models.PriceList.id == fin.price_list_id,
                                               models.PriceList.tenant_id == tenant_id).first()
    tiers = get_weight_tiers(db, tenant_id, pl.id if pl else None)
    table = bool(pl) or uses_price_table(db.query(models.Tenant).get(tenant_id))
    return pl, tiers, table


def _family_choice(db: Session, tenant_id: int, oc) -> Optional[dict]:
    """Lo que eligió la familia en el formulario (no cambia al corregir)."""
    if not oc.pet_id:
        return None
    sub = (db.query(models.FormSubmission)
           .filter(models.FormSubmission.tenant_id == tenant_id, models.FormSubmission.pet_id == oc.pet_id)
           .order_by(models.FormSubmission.id.desc()).first())
    pet = (sub.pet_data or {}) if sub else {}
    size = pet.get("size")
    if not size:
        return None
    tier = pet.get("weightTier") if isinstance(pet.get("weightTier"), dict) else {}
    return {"text": size, "tier_id": tier.get("id")}


def _current_tier(oc, tiers, family: Optional[dict]):
    if oc.weight:
        return tier_for_weight(tiers, oc.weight)
    size = (getattr(oc.pet, "size", None) or "").strip() if oc.pet else ""
    for t in tiers:
        if size and size == _tier_text(t):
            return t
    tid = (family or {}).get("tier_id")
    return next((t for t in tiers if str(t.id) == str(tid)), None)


def _plan_label(plan) -> str:
    return f"{plan.name} · {plan.group_name}" if getattr(plan, "group_name", None) else plan.name


def options(db: Session, tenant_id: int, oc) -> dict:
    """Rangos disponibles para la orden y el actual."""
    pl, tiers, table = _context(db, tenant_id, oc)
    family = _family_choice(db, tenant_id, oc)
    cur = _current_tier(oc, tiers, family)
    return {
        "mode": "table" if table else "surcharge",
        "price_list": {"id": pl.id, "name": pl.name} if pl else None,
        "tiers": [{"id": t.id, "label": t.label, "range_text": tier_range_text(t.min_weight, t.max_weight),
                   "min_weight": t.min_weight or 0, "max_weight": t.max_weight,
                   "price": None if table else float(t.price or 0)} for t in tiers],
        "current_tier_id": cur.id if cur else None,
        "weight": oc.weight,
        "family_choice": family["text"] if family else None,
        "weight_price": float(oc.financial.weight_price or 0) if oc.financial else 0.0,
        "total": float(oc.financial.total_price or 0) if oc.financial else 0.0,
        "order_plans": [{"line_id": l.id, "plan_id": l.plan_id,
                         "name": l.plan_name or (l.plan.name if getattr(l, "plan", None) else "Plan"),
                         "price": float(l.precio_venta or 0)}
                        for l in db.query(models.PlanOC).filter(models.PlanOC.cremation_id == oc.id)
                        .order_by(models.PlanOC.es_principal.desc(), models.PlanOC.id).all()],
        "plans": [{"id": p.id, "name": _plan_label(p), "price": float(p.price or 0), "max_weight": p.max_weight,
                   "products": len(p.products or [])}
                  for p in db.query(models.Plan).filter(models.Plan.tenant_id == tenant_id,
                                                        models.Plan.is_active.is_(True))
                  .order_by(models.Plan.group_name.nullsfirst(), models.Plan.name).all()],
    }


def _swap_plan(db: Session, tenant_id: int, oc, line_id: Optional[int], plan_id: int, backorder: list):
    """Reemplaza una línea de plan por otro plan con sus productos incluidos."""
    from app.services import stock as stock_rules
    new_plan = db.query(models.Plan).filter(models.Plan.id == plan_id, models.Plan.tenant_id == tenant_id).first()
    if new_plan is None or not new_plan.is_active:
        raise HTTPException(status_code=400, detail="El plan no existe o está inactivo")
    lines = (db.query(models.PlanOC).filter(models.PlanOC.cremation_id == oc.id)
             .order_by(models.PlanOC.es_principal.desc(), models.PlanOC.id).all())
    old = next((l for l in lines if l.id == line_id), None) if line_id else (lines[0] if lines else None)
    if line_id and old is None:
        raise HTTPException(status_code=400, detail="Esa línea de plan no es de esta orden")
    if old is not None and old.plan_id == plan_id:
        return new_plan, False
    if any(l.plan_id == plan_id for l in lines):
        raise HTTPException(status_code=400, detail="La orden ya tiene ese plan")

    qty, principal = 1, True
    if old is not None:
        qty, principal = old.cantidad or 1, bool(old.es_principal) or len(lines) == 1
        for prod_line in db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id == oc.id,
                                                            models.ProductoOC.plan_id == old.plan_id).all():
            stock_rules.give_back(db, tenant_id, prod_line.product_id, prod_line.cantidad)
            db.delete(prod_line)
        db.delete(old)
    db.flush()
    db.add(models.PlanOC(tenant_id=tenant_id, cremation_id=oc.id, plan_id=new_plan.id, cantidad=qty,
                         precio_costo=float(getattr(new_plan, "cost", 0) or 0),
                         precio_venta=float(new_plan.price or 0), es_principal=principal))
    for prod in new_plan.products or []:
        taken = stock_rules.take(db, tenant_id, prod.id, 1, backorder=backorder)
        if taken:
            db.add(models.ProductoOC(tenant_id=tenant_id, cremation_id=oc.id, product_id=taken.id, cantidad=1,
                                     precio_costo=taken.cost_price or 0.0, precio_venta=0.0, plan_id=new_plan.id))
    db.flush()
    return new_plan, True


def _recompute_cost(db: Session, oc) -> None:
    total = 0.0
    for model in (models.ServicioOC, models.PlanOC, models.ProductoOC):
        total += sum(float(r.precio_costo or 0) * float(r.cantidad or 1)
                     for r in db.query(model).filter(model.cremation_id == oc.id).all())
    if oc.financial:
        oc.financial.total_cost = total


def apply(service, tenant_id: int, oc, *, tier_id: Optional[int], weight: Optional[float], dry_run: bool,
          plan_id: Optional[int] = None, replace_line_id: Optional[int] = None) -> dict:
    """Aplica el rango / peso y, opcional, el cambio de plan; recalcula. `dry_run` = vista previa."""
    db: Session = service.db
    if weight is not None and not (0 < weight <= MAX_KG):
        raise HTTPException(status_code=400, detail=f"El peso debe estar entre 0 y {MAX_KG} kg")
    if weight is None and tier_id is None and plan_id is None:
        raise HTTPException(status_code=400, detail="Indica el peso, el rango de peso o el plan")
    pl, tiers, table = _context(db, tenant_id, oc)
    if not tiers and plan_id is None:
        raise HTTPException(status_code=400, detail="No hay rangos de peso configurados")

    if weight is not None:
        tier = tier_for_weight(tiers, weight)
    elif tier_id is not None:
        tier = next((t for t in tiers if t.id == tier_id), None)
        if tier is None:
            raise HTTPException(status_code=400, detail="Ese rango de peso no corresponde a esta orden")
    else:
        tier = _current_tier(oc, tiers, _family_choice(db, tenant_id, oc))
    before_total = float(oc.financial.total_price or 0) if oc.financial else 0.0

    fin = oc.financial
    if fin is None:
        fin = models.CremationFinancial(cremation_id=oc.id, tenant_id=tenant_id)
        db.add(fin)
        oc.financial = fin

    if weight is not None:
        oc.weight = weight
    elif oc.weight and tier_for_weight(tiers, oc.weight) is not tier:
        oc.weight = None  # el kg anterior ya no cae en el rango elegido

    backorder: list = []
    swapped_plan, plan_changed = None, False
    if plan_id is not None:
        swapped_plan, plan_changed = _swap_plan(db, tenant_id, oc, replace_line_id, plan_id, backorder)

    warnings: list[str] = []
    plan_lines = db.query(models.PlanOC).filter(models.PlanOC.cremation_id == oc.id).all()
    weight_changed = weight is not None or tier_id is not None
    if table:
        fin.weight_price = 0.0
        if tier is not None:
            from app.services.price_lists import plan_price
            for line in plan_lines:
                # Cambió el peso: todos los planes toman el precio del rango. Solo cambió
                # el plan: solo el nuevo (los demás conservan su precio, quizás editado).
                if not weight_changed and not (plan_changed and line.plan_id == swapped_plan.id):
                    continue
                plan = db.query(models.Plan).get(line.plan_id) if line.plan_id else None
                if plan is not None:
                    line.precio_venta = plan_price(pl, plan, tier.id, True)
    elif tiers and weight_changed:
        fin.weight_price = float(tier.price or 0) if tier else 0.0

    for line in plan_lines:
        plan = db.query(models.Plan).get(line.plan_id) if line.plan_id else None
        if plan is not None and not plan_fits_weight(plan.max_weight, tier.min_weight if tier else None, oc.weight):
            warnings.append(f"El plan «{plan.name}» admite hasta {plan.max_weight:g} kg".replace(".", ","))

    if weight_changed and oc.pet is not None and tier is not None:
        oc.pet.size = _tier_text(tier)[:100]

    for b in backorder:
        warnings.append(f"Pendiente de stock: {b.get('name')} (faltan {b.get('missing')})")
    _recompute_cost(db, oc)
    service.recompute_totals(oc)
    result = {
        "tier_id": tier.id if tier else None,
        "tier_text": _tier_text(tier) if tier else None,
        "weight": oc.weight,
        "weight_price": float(fin.weight_price or 0),
        "plans": [{"plan_id": l.plan_id, "price": float(l.precio_venta or 0)} for l in plan_lines],
        "plan_changed": plan_changed,
        "plan_name": _plan_label(swapped_plan) if swapped_plan else None,
        "total_before": before_total,
        "total": float(fin.total_price or 0),
        "commission": float(fin.commission or 0),
        "warnings": warnings,
        "applied": not dry_run,
    }
    if dry_run:
        db.rollback()
    else:
        db.commit()
    return result

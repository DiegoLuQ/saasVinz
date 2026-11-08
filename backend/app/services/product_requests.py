"""Solicitudes de productos desde el catálogo público (carrito).

- Con `ref` (token de seguimiento, código de verificación o código del registro
  web, el mismo que va en el enlace de seguimiento) la solicitud queda ligada a la
  orden de la mascota (kind 'order'). Si aún es solo un registro, se liga al
  registro y pasa a la orden cuando exista. Orden entregada o cancelada = no se
  reciben solicitudes.
- Sin `ref` = compra externa (kind 'external', «orden de compra de productos»):
  nombre + WhatsApp obligatorios; al aceptar se crea o reutiliza el cliente (sin
  mascota) y se descuenta stock; luego Entregada, o Cancelada (devuelve stock).
- Precios congelados del catálogo al solicitar (precio de venta con su descuento).
- Nada se avisa a la familia: el crematorio escribe por WhatsApp desde el panel.
- Aceptar una de orden agrega las líneas a oc_products (stock.take) y recalcula
  total, convenio y comisión (CremationService.update_discounts).
"""
from __future__ import annotations

from urllib.parse import quote

from fastapi import HTTPException
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app import models
from app.api.internal.catalog.models import Product, ProductRequest
from app.services import stock
from app.utils import tz

CLOSED_STATUSES = {"entregado", "completado", "completed", "delivered",
                   "cancelado", "canceled", "cancelled", "rejected", "rechazado", "rechazado_por_cliente"}
MAX_ITEMS = 20
MAX_QTY = 20
MAX_NOTE = 500
STATUSES = ("pending", "accepted", "delivered", "rejected", "cancelled")


def code(req: ProductRequest) -> str:
    return f"PC-{req.number:04d}"


def unit_price(p: Product) -> float:
    """Precio que muestra el catálogo (venta con su % de descuento), redondeado."""
    price = float(p.sale_price or 0)
    disc = float(getattr(p, "discount_percentage", 0) or 0)
    return float(round(price * (1 - disc / 100))) if disc > 0 else float(round(price))


def _is_closed(cremation) -> bool:
    return (cremation.status or "").lower() in CLOSED_STATUSES


def _order_for_pet(db: Session, tenant_id: int, pet_id: int | None):
    if not pet_id:
        return None
    rows = db.query(models.Cremation).filter(models.Cremation.tenant_id == tenant_id,
                                             models.Cremation.pet_id == pet_id) \
        .order_by(models.Cremation.created_at.desc()).all()
    open_ = [c for c in rows if not _is_closed(c)]
    return (open_ or rows or [None])[0]


def resolve_ref(db: Session, tenant_id: int, ref: str | None) -> dict | None:
    """{cremation, submission, pet_name, closed} o None si el ref no corresponde."""
    ref = (ref or "").strip()
    if not ref or len(ref) > 128:
        return None
    cremation = db.query(models.Cremation).outerjoin(
        models.CremationDetails, models.Cremation.id == models.CremationDetails.cremation_id
    ).filter(
        models.Cremation.tenant_id == tenant_id,
        or_(models.CremationDetails.tracking_token == ref, models.Cremation.verification_code == ref),
    ).first()
    submission = None
    if cremation is None:
        submission = db.query(models.FormSubmission).filter(
            models.FormSubmission.tenant_id == tenant_id,
            models.FormSubmission.code == ref,
            models.FormSubmission.status != "deleted",
        ).first()
        if submission is None:
            return None
        cremation = _order_for_pet(db, tenant_id, submission.pet_id)
    pet_name = None
    if cremation is not None and cremation.pet_id:
        pet = db.query(models.Pet).filter(models.Pet.id == cremation.pet_id).first()
        pet_name = pet.name if pet else None
    if not pet_name and submission is not None:
        pet_name = (submission.pet_data or {}).get("name")
    return {
        "cremation": cremation, "submission": submission, "pet_name": pet_name,
        "closed": bool(cremation is not None and _is_closed(cremation)),
    }


def public_ref_info(db: Session, tenant_id: int, ref: str | None) -> dict | None:
    """Lo que ve la familia en el catálogo: solo el nombre de la mascota y si puede pedir."""
    info = resolve_ref(db, tenant_id, ref)
    if info is None:
        return None
    return {"pet_name": info["pet_name"], "can_request": not info["closed"]}


def _digits(phone: str | None) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


MAX_NAME = 100
_NAME_EXTRA = set(" '-.")


def clean_name(value: str | None) -> str | None:
    """Nombre de contacto: solo letras (con tildes/ñ), espacios, apóstrofo, guion y
    punto; ≤ 100. Otro carácter = 400."""
    name = " ".join((value or "").split())
    if not name:
        return None
    if len(name) > MAX_NAME:
        raise HTTPException(status_code=400, detail=f"El nombre admite hasta {MAX_NAME} caracteres")
    if not any(ch.isalpha() for ch in name) or any(not (ch.isalpha() or ch in _NAME_EXTRA) for ch in name):
        raise HTTPException(status_code=400, detail="El nombre solo puede tener letras")
    return name


def clean_phone(value: str | None) -> str | None:
    """WhatsApp chileno: se aceptan 8 dígitos (tras +56 9), 9 (9XXXXXXXX) o con 56
    delante. Se guarda como +569XXXXXXXX. Otro formato = 400."""
    d = _digits(value)
    if not d:
        return None
    if d.startswith("56") and len(d) == 11:
        d = d[2:]
    if len(d) == 9 and d.startswith("9"):
        d = d[1:]
    if len(d) != 8:
        raise HTTPException(status_code=400, detail="Escribe un WhatsApp válido: 8 números después de +56 9")
    return f"+569{d}"


def clean_note(value: str | None) -> str | None:
    """Nota libre ≤ 500: sin caracteres de control (salvo saltos de línea)."""
    newline = chr(10)
    text_ = "".join(ch for ch in (value or "") if ch == newline or (ch.isprintable() and ch not in "<>"))
    text_ = newline.join(line.strip() for line in text_.strip().splitlines())
    return text_[:MAX_NOTE] or None


def _next_number(db: Session, tenant_id: int) -> int:
    db.execute(text("SELECT pg_advisory_xact_lock(815100, :t)"), {"t": tenant_id})
    current = db.query(func.max(ProductRequest.number)).filter(ProductRequest.tenant_id == tenant_id).scalar()
    return int(current or 0) + 1


def _tenant_whatsapp(tenant) -> str:
    raw = ""
    if isinstance(tenant.social_media, dict):
        raw = tenant.social_media.get("whatsapp") or ""
    raw = raw or tenant.phone or ""
    d = _digits(raw)
    if len(d) == 9 and d.startswith("9"):
        d = "56" + d
    return d


def _clp(v: float) -> str:
    return "$" + f"{int(round(v or 0)):,}".replace(",", ".")


def _items_text(items: list[dict]) -> str:
    return "\n".join(f"- {it['qty']} × {it['name']} ({_clp(it['price'] * it['qty'])})"
                     + (" · a pedido" if it.get("made_to_order") else "") for it in items)


def create(db: Session, tenant, token_row, data: dict) -> dict:
    """Crea la solicitud desde el catálogo público. `data`: ref, items [{product_id, qty}],
    contact_name, contact_phone, note."""
    raw_items = data.get("items") or []
    merged: dict[int, int] = {}
    for it in raw_items:
        try:
            pid, qty = int(it.get("product_id")), int(it.get("qty") or 1)
        except (TypeError, ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Producto no válido")
        if qty < 1 or qty > MAX_QTY:
            raise HTTPException(status_code=400, detail=f"La cantidad debe estar entre 1 y {MAX_QTY}")
        merged[pid] = min(merged.get(pid, 0) + qty, MAX_QTY)
    if not merged:
        raise HTTPException(status_code=400, detail="Tu carrito está vacío")
    if len(merged) > MAX_ITEMS:
        raise HTTPException(status_code=400, detail=f"Puedes pedir hasta {MAX_ITEMS} productos distintos")

    products = {p.id: p for p in db.query(Product).filter(
        Product.tenant_id == tenant.id, Product.id.in_(list(merged))).all()}
    items = []
    for pid, qty in merged.items():
        p = products.get(pid)
        if p is None or p.is_active is False:
            raise HTTPException(status_code=400, detail="Uno de los productos ya no está disponible")
        if not p.made_to_order and (p.stock or 0) < qty:
            left = max(p.stock or 0, 0)
            raise HTTPException(status_code=409, detail=f'«{p.name}»: solo quedan {left}' if left else f'«{p.name}» está agotado')
        items.append({"product_id": p.id, "name": p.name, "price": unit_price(p), "qty": qty,
                      "made_to_order": bool(p.made_to_order), "image_url": p.image_url})
    total = float(sum(it["price"] * it["qty"] for it in items))
    note = clean_note(data.get("note"))

    ref = (data.get("ref") or "").strip()
    req = ProductRequest(tenant_id=tenant.id, items=items, total=total, note=note,
                         catalog_token_id=token_row.id if token_row is not None else None, status="pending")
    contact_name = clean_name(data.get("contact_name"))
    contact_phone = clean_phone(data.get("contact_phone"))
    if ref:
        info = resolve_ref(db, tenant.id, ref)
        if info is None:
            raise HTTPException(status_code=400, detail="El enlace de seguimiento no es válido")
        if info["closed"]:
            raise HTTPException(status_code=409, detail="Este servicio ya concluyó: escríbenos por WhatsApp para ayudarte")
        req.kind = "order"
        req.cremation_id = info["cremation"].id if info["cremation"] is not None else None
        req.submission_id = info["submission"].id if info["submission"] is not None else None
        req.pet_name = (info["pet_name"] or "")[:120] or None
        req.contact_name, req.contact_phone = contact_name, contact_phone  # opcional: otro contacto
    else:
        if not contact_name or len(contact_name) < 2:
            raise HTTPException(status_code=400, detail="Escribe tu nombre")
        if not contact_phone:
            raise HTTPException(status_code=400, detail="Escribe un WhatsApp válido")
        req.kind = "external"
        req.contact_name, req.contact_phone = contact_name, contact_phone

    req.number = _next_number(db, tenant.id)
    db.add(req)
    db.flush()

    who = f"La familia de {req.pet_name}" if req.kind == "order" and req.pet_name else (req.contact_name or "Una familia")
    units = sum(it["qty"] for it in items)
    where = "a su orden" if req.kind == "order" else "(compra externa)"
    db.add(models.Notification(
        tenant_id=tenant.id,
        title=f"Solicitud de productos {code(req)}: {req.pet_name or req.contact_name or ''}".strip(),
        message=f"{who} quiere agregar {units} producto{'s' if units != 1 else ''} {where} · Total {_clp(total)}.",
        type="product_request", audience="ordenes",
        action_url=f"/dashboard/solicitudes-productos?id={req.id}",
        data={"request_id": req.id},
    ))
    db.commit()

    out = {"id": req.id, "code": code(req), "kind": req.kind, "total": total}
    phone = _tenant_whatsapp(tenant)
    if phone:
        intro = (f"Hola {tenant.name}, quiero agregar estos productos para {req.pet_name}" if req.kind == "order"
                 else f"Hola {tenant.name}, soy {req.contact_name}. Quiero solicitar estos productos")
        msg = f"{intro} (solicitud {code(req)}):\n{_items_text(items)}\nTotal: {_clp(total)}"
        if note:
            msg += f"\nNota: {note}"
        out["whatsapp_url"] = f"https://wa.me/{phone}?text={quote(msg)}"
    return out


# --- Panel -----------------------------------------------------------------

def _link_order(db: Session, req: ProductRequest) -> None:
    """Una solicitud hecha sobre un registro pasa a la orden cuando existe."""
    if req.kind == "order" and req.cremation_id is None and req.submission_id:
        sub = db.query(models.FormSubmission).filter(models.FormSubmission.id == req.submission_id).first()
        c = _order_for_pet(db, req.tenant_id, sub.pet_id) if sub else None
        if c is not None:
            req.cremation_id = c.id


def to_dict(db: Session, req: ProductRequest, tenant=None) -> dict:
    cremation = db.query(models.Cremation).filter(models.Cremation.id == req.cremation_id).first() if req.cremation_id else None
    customer = None
    if cremation is not None and cremation.pet_id:
        pet = db.query(models.Pet).filter(models.Pet.id == cremation.pet_id).first()
        customer = pet.customer if pet else None
    elif req.customer_id:
        customer = db.query(models.Customer).filter(models.Customer.id == req.customer_id).first()
    phone = req.contact_phone or (customer.phone if customer else None)
    name = req.contact_name or (customer.name if customer else None)
    wa = None
    from app.services.family_notices import _wa_phone
    digits = _wa_phone(phone)
    if digits:
        tname = tenant.name if tenant is not None else "el crematorio"
        hello = f"Hola {(name or '').split(' ')[0]}".strip()
        about = f" para {req.pet_name}" if req.pet_name else ""
        msg = f"{hello}, te escribimos de {tname} por tu solicitud de productos {code(req)}{about}:\n{_items_text(req.items or [])}\nTotal: {_clp(req.total)}"
        wa = f"https://wa.me/{digits}?text={quote(msg)}"
    raw = req.items or []
    pids = {int(it["product_id"]) for it in raw if it.get("product_id") is not None}
    prods = {p.id: p for p in db.query(Product).filter(Product.tenant_id == req.tenant_id, Product.id.in_(pids)).all()} if pids else {}
    items = []
    for it in raw:
        p = prods.get(int(it["product_id"])) if it.get("product_id") is not None else None
        items.append({**it, "state": line_state(req, it),
                      "stock": (int(p.stock or 0) if p is not None else None),
                      "exists": p is not None and p.is_active is not False,
                      "made_to_order": bool(p.made_to_order) if p is not None else bool(it.get("made_to_order"))})
    added_total = float(sum(it["price"] * it["qty"] for it in items if it["state"] == "added"))
    pending_total = float(sum(it["price"] * it["qty"] for it in items if it["state"] == "pending"))
    return {
        "id": req.id, "code": code(req), "kind": req.kind, "status": req.status,
        "pet_name": req.pet_name, "contact_name": name, "contact_phone": phone,
        "note": req.note, "items": items, "total": req.total, "reject_reason": req.reject_reason,
        "added_total": added_total, "pending_total": pending_total,
        "created_at": req.created_at, "decided_at": req.decided_at, "delivered_at": req.delivered_at,
        "submission_id": req.submission_id, "customer_id": req.customer_id,
        "cremation": ({"id": cremation.id, "oc_number": cremation.oc_number, "status": cremation.status,
                       "closed": _is_closed(cremation)} if cremation is not None else None),
        "whatsapp_url": wa,
    }


def get(db: Session, tenant_id: int, request_id: int) -> ProductRequest:
    req = db.query(ProductRequest).filter(ProductRequest.id == request_id, ProductRequest.tenant_id == tenant_id).first()
    if req is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return req


def _resolve_notification(db: Session, req: ProductRequest) -> None:
    for n in db.query(models.Notification).filter(models.Notification.tenant_id == req.tenant_id,
                                                  models.Notification.type == "product_request").all():
        if isinstance(n.data, dict) and n.data.get("request_id") == req.id:
            n.is_read = True


def _require(req: ProductRequest, *statuses: str) -> None:
    if req.status not in statuses:
        raise HTTPException(status_code=409, detail="La solicitud ya fue gestionada")


def _find_or_create_customer(db: Session, tenant_id: int, name: str | None, phone: str | None) -> int | None:
    d = _digits(phone)
    if len(d) < 8:
        return None
    tail = d[-8:]
    for c in db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id,
                                              models.Customer.phone.isnot(None)).all():
        if _digits(c.phone).endswith(tail):
            return c.id
    c = models.Customer(tenant_id=tenant_id, name=name or "Cliente", phone=phone)
    db.add(c)
    db.flush()
    return c.id


# --- Líneas: se agregan o descartan una por una (o todas juntas) ---------------
# Cada ítem guarda `state`: pending | added | discarded. Solicitudes antiguas sin
# `state` toman el de la solicitud (aceptada/entregada = agregadas).

def line_state(req: ProductRequest, it: dict) -> str:
    st = it.get("state")
    if st in ("pending", "added", "discarded"):
        return st
    if req.status in ("accepted", "delivered", "cancelled"):
        return "added"
    if req.status == "rejected":
        return "discarded"
    return "pending"


def _set_items(req: ProductRequest, items: list[dict]) -> None:
    req.items = [dict(it) for it in items]  # lista nueva: SQLAlchemy detecta el cambio del JSON
    flag_modified(req, "items")


def _order_of(db: Session, req: ProductRequest):
    if req.kind != "order":
        return None
    _link_order(db, req)
    cremation = db.query(models.Cremation).filter(models.Cremation.id == req.cremation_id).first() if req.cremation_id else None
    if cremation is None:
        raise HTTPException(status_code=409, detail="Aún no hay orden para esta mascota: procesa primero el registro")
    if _is_closed(cremation):
        raise HTTPException(status_code=409, detail="La orden ya está entregada o cancelada")
    return cremation


def _finish_if_done(db: Session, req: ProductRequest, user_id: int | None, reason: str | None = None) -> None:
    """Sin líneas pendientes: aceptada si se agregó alguna, rechazada si se descartaron todas."""
    states = [line_state(req, it) for it in req.items or []]
    if "pending" in states:
        return
    req.status = "accepted" if "added" in states else "rejected"
    if req.status == "rejected" and not req.reject_reason:
        req.reject_reason = (reason or "").strip()[:300] or None
    req.decided_at = tz.get_now()
    req.decided_by = user_id
    _resolve_notification(db, req)


def _add_lines(db: Session, tenant_id: int, request_id: int, user_id: int | None, index: int | None) -> ProductRequest:
    req = get(db, tenant_id, request_id)
    _require(req, "pending")
    items = [dict(it, state=line_state(req, it)) for it in req.items or []]
    targets = [i for i, it in enumerate(items) if it["state"] == "pending" and (index is None or i == index)]
    if index is not None and (index < 0 or index >= len(items)):
        raise HTTPException(status_code=404, detail="Producto no encontrado en la solicitud")
    if not targets:
        raise HTTPException(status_code=409, detail="Ese producto ya fue gestionado")
    cremation = _order_of(db, req)

    lines = []
    for i in targets:
        it = items[i]
        prod = stock.take(db, tenant_id, int(it["product_id"]), int(it["qty"]))
        if prod is None:
            raise HTTPException(status_code=409, detail=f"«{it.get('name')}» ya no existe en tu inventario")
        it["state"] = "added"
        lines.append((prod, it))
    _set_items(req, items)
    _finish_if_done(db, req, user_id)

    if cremation is not None:
        from app.api.internal.operations import models as ops_models
        for prod, it in lines:
            db.add(ops_models.ProductoOC(tenant_id=tenant_id, cremation_id=cremation.id, product_id=prod.id,
                                         cantidad=int(it["qty"]), precio_costo=float(prod.cost_price or 0),
                                         precio_venta=float(it["price"])))
        db.flush()
        # Total, convenio y comisión de la veterinaria con las nuevas líneas (hace commit)
        from app.api.internal.operations.services import CremationService
        CremationService(db).update_discounts(tenant_id, cremation.id, set_agreement=False, agreement_id=None, discount=None)
    else:
        req.customer_id = req.customer_id or _find_or_create_customer(db, tenant_id, req.contact_name, req.contact_phone)
        db.commit()
    db.refresh(req)
    return req


def accept(db: Session, tenant_id: int, request_id: int, user_id: int | None) -> ProductRequest:
    """Agrega todas las líneas pendientes (si a una le falta stock, no se agrega ninguna)."""
    return _add_lines(db, tenant_id, request_id, user_id, None)


def accept_line(db: Session, tenant_id: int, request_id: int, index: int, user_id: int | None) -> ProductRequest:
    return _add_lines(db, tenant_id, request_id, user_id, index)


def discard_line(db: Session, tenant_id: int, request_id: int, index: int, user_id: int | None) -> ProductRequest:
    req = get(db, tenant_id, request_id)
    _require(req, "pending")
    items = [dict(it, state=line_state(req, it)) for it in req.items or []]
    if index < 0 or index >= len(items):
        raise HTTPException(status_code=404, detail="Producto no encontrado en la solicitud")
    if items[index]["state"] != "pending":
        raise HTTPException(status_code=409, detail="Ese producto ya fue gestionado")
    items[index]["state"] = "discarded"
    _set_items(req, items)
    _finish_if_done(db, req, user_id, "Productos no disponibles")
    db.commit()
    db.refresh(req)
    return req


def reject(db: Session, tenant_id: int, request_id: int, user_id: int | None, reason: str | None) -> ProductRequest:
    """Descarta lo que queda pendiente. Si ya se había agregado algo, queda aceptada con eso."""
    req = get(db, tenant_id, request_id)
    _require(req, "pending")
    items = [dict(it, state=line_state(req, it)) for it in req.items or []]
    for it in items:
        if it["state"] == "pending":
            it["state"] = "discarded"
    _set_items(req, items)
    req.reject_reason = (reason or "").strip()[:300] or None
    _finish_if_done(db, req, user_id)
    db.commit()
    db.refresh(req)
    return req


def deliver(db: Session, tenant_id: int, request_id: int) -> ProductRequest:
    req = get(db, tenant_id, request_id)
    if req.kind != "external":
        raise HTTPException(status_code=400, detail="Las solicitudes de una orden se entregan con la orden")
    _require(req, "accepted")
    req.status = "delivered"
    req.delivered_at = tz.get_now()
    db.commit()
    db.refresh(req)
    return req


def cancel(db: Session, tenant_id: int, request_id: int, user_id: int | None) -> ProductRequest:
    """Compra externa aceptada → cancelada (devuelve el stock)."""
    req = get(db, tenant_id, request_id)
    if req.kind != "external":
        raise HTTPException(status_code=400, detail="Para quitar productos de una orden, edita la orden")
    _require(req, "accepted")
    for it in req.items or []:
        if line_state(req, it) == "added":
            stock.give_back(db, tenant_id, int(it["product_id"]), int(it["qty"]))
    req.status = "cancelled"
    req.decided_at = tz.get_now()
    req.decided_by = user_id
    db.commit()
    db.refresh(req)
    return req


def list_requests(db: Session, tenant_id: int, status: str | None = None, kind: str | None = None) -> list[ProductRequest]:
    q = db.query(ProductRequest).filter(ProductRequest.tenant_id == tenant_id)
    if status:
        q = q.filter(ProductRequest.status == status)
    if kind:
        q = q.filter(ProductRequest.kind == kind)
    rows = q.order_by(ProductRequest.created_at.desc()).limit(300).all()
    changed = False
    for r in rows:
        before = r.cremation_id
        _link_order(db, r)
        changed = changed or r.cremation_id != before
    if changed:
        db.commit()
    return rows


def counts(db: Session, tenant_id: int) -> dict:
    rows = dict(db.query(ProductRequest.status, func.count(ProductRequest.id))
                .filter(ProductRequest.tenant_id == tenant_id).group_by(ProductRequest.status).all())
    return {s: int(rows.get(s, 0)) for s in STATUSES}


def external_sold(db: Session, tenant_id: int) -> dict[int, int]:
    """Unidades vendidas en compras externas aceptadas o entregadas («Comprado N veces»)."""
    out: dict[int, int] = {}
    for r in db.query(ProductRequest).filter(ProductRequest.tenant_id == tenant_id,
                                             ProductRequest.kind == "external",
                                             ProductRequest.status.in_(("accepted", "delivered"))).all():
        for it in r.items or []:
            if line_state(r, it) != "added":
                continue
            try:
                pid = int(it["product_id"])
                out[pid] = out.get(pid, 0) + int(it.get("qty") or 0)
            except (KeyError, TypeError, ValueError):
                continue
    return out

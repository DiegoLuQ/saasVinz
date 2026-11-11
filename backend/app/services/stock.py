"""Stock de productos (ánforas, insumos) usado por las órdenes.

Un solo camino para descontar: todo lo que mueve stock en una orden queda como
línea en oc_products (incluida la ánfora del plan, con plan_id), y cancelar o
eliminar la orden lo devuelve recorriendo esas líneas.
"""
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.internal.catalog.models import Product


def _set_availability(prod: Product) -> None:
    if getattr(prod, "made_to_order", False):
        prod.availability_status = "A pedido"
        return
    prod.availability_status = "Disponible" if (prod.stock or 0) > 0 else "Agotado"


def take(db: Session, tenant_id: int, product_id: int, qty: int, allowance: Optional[dict] = None,
         backorder: Optional[list] = None) -> Optional[Product]:
    """Descuenta `qty` del producto. Falla con 409 si no alcanza.

    `allowance` ({product_id: unidades}) = lo que la orden ya tenía antes de
    editarla (ya devuelto al stock): esas unidades se aceptan aunque el stock
    haya quedado negativo por movimientos antiguos, para no bloquear la edición
    de una orden que no pide más de lo que ya tenía.

    `backorder` (lista): en vez de fallar, deja el producto «pendiente de stock»:
    lo descuenta igual (el stock queda negativo = unidades por reponer) y anota
    {product_id, name, missing} en la lista. Se usa al procesar un registro web,
    para que falta de stock no detenga la orden.
    """
    prod = db.query(Product).filter(Product.id == product_id, Product.tenant_id == tenant_id).with_for_update().first()
    if not prod:
        return None
    qty = int(qty or 0)
    remaining = (allowance or {}).get(product_id, 0)
    # Producto «a pedido»: se encarga al proveedor, no se bloquea por stock.
    if qty > remaining and (prod.stock or 0) < qty and not prod.made_to_order:
        if backorder is not None:
            backorder.append({"product_id": prod.id, "name": prod.name, "missing": qty - max(prod.stock or 0, 0)})
            prod.stock = (prod.stock or 0) - qty
            _set_availability(prod)
            return prod
        raise HTTPException(
            status_code=409,
            detail=f'Stock insuficiente para "{prod.name}": quedan {max(prod.stock or 0, 0)} y se necesitan {qty}.',
        )
    if allowance is not None:
        allowance[product_id] = max(remaining - qty, 0)
    prod.stock = (prod.stock or 0) - qty
    _set_availability(prod)
    return prod


def give_back(db: Session, tenant_id: int, product_id: int, qty: int) -> None:
    prod = db.query(Product).filter(Product.id == product_id, Product.tenant_id == tenant_id).first()
    if prod:
        prod.stock = (prod.stock or 0) + int(qty or 0)
        _set_availability(prod)

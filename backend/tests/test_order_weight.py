"""Corregir el rango de peso de una orden desde el detalle (services/order_weight.py):
el servidor recalcula el recargo (modo por tramo) o el precio del plan (modo tabla),
el total y la comisión; `dry_run` no guarda nada."""
from app import models
import pytest

from tests.test_plan_weight_prices import _modo, tabla  # noqa: F401  (fixture)

_CREATED: list[int] = []


@pytest.fixture(autouse=True)
def _cleanup(client, auth, tabla):  # noqa: F811  (depende de tabla: se limpia antes)
    yield
    while _CREATED:  # antes de que `tabla` borre el plan
        client.delete(f"/api/internal/cremations/{_CREATED.pop()}", headers=auth("a"))


def _orden(client, h, plan_id, weight=None, weight_price=0):
    c = client.post("/api/internal/customers", headers=h, json={"name": "Fam Peso", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": "Toby", "species": "Canino", "customer_id": c["id"]}).json()
    body = {"pet_id": p["id"], "status": "pendiente", "weight": weight, "weight_price": weight_price,
            "planes": [{"plan_id": plan_id, "cantidad": 1, "precio_venta": 87000, "precio_costo": 0}]}
    r = client.post("/api/internal/cremations", headers=h, json=body)
    assert r.status_code in (200, 201), r.text
    _CREATED.append(r.json()["id"])
    return r.json()["id"]


def test_corregir_rango_en_modo_recargo(client, db, tabla):
    h, t = tabla["h"], tabla["tiers"]
    _modo(db, tabla["tid"], "surcharge")
    oid = _orden(client, h, tabla["plan_id"], weight_price=5000)

    opts = client.get(f"/api/internal/cremations/{oid}/weight", headers=h).json()
    assert opts["mode"] == "surcharge" and [x["id"] for x in opts["tiers"]] == t

    # Vista previa: no guarda
    prev = client.patch(f"/api/internal/cremations/{oid}/weight", headers=h, json={"tier_id": t[2], "dry_run": True}).json()
    assert prev["weight_price"] == 12000 and prev["total"] == 99000 and prev["applied"] is False
    db.expire_all()
    assert db.get(models.CremationFinancial, oid).weight_price == 5000

    r = client.patch(f"/api/internal/cremations/{oid}/weight", headers=h, json={"tier_id": t[1]})
    assert r.status_code == 200, r.text
    assert r.json()["total"] == 95000
    db.expire_all()
    fin = db.get(models.CremationFinancial, oid)
    assert fin.weight_price == 8000 and fin.total_price == 95000
    oc = db.get(models.CremationOC, oid)
    assert oc.pet.size.startswith("Mediano")
    assert client.get(f"/api/internal/cremations/{oid}/weight", headers=h).json()["current_tier_id"] == t[1]

    # Con kg: elige el tramo que lo cubre
    r = client.patch(f"/api/internal/cremations/{oid}/weight", headers=h, json={"weight": 3})
    assert r.json()["weight_price"] == 5000 and r.json()["weight"] == 3
    # Rango que no corresponde = 400
    assert client.patch(f"/api/internal/cremations/{oid}/weight", headers=h, json={"tier_id": 999999}).status_code == 400


def test_corregir_rango_en_modo_tabla(client, db, tabla):
    h, t = tabla["h"], tabla["tiers"]
    _modo(db, tabla["tid"], "table")
    plan = db.get(models.Plan, tabla["plan_id"])
    plan.weight_prices = {str(t[0]): 70000, str(t[1]): 90000}
    db.commit()
    oid = _orden(client, h, tabla["plan_id"])

    r = client.patch(f"/api/internal/cremations/{oid}/weight", headers=h, json={"tier_id": t[1]})
    assert r.status_code == 200, r.text
    assert r.json()["weight_price"] == 0 and r.json()["plans"][0]["price"] == 90000 and r.json()["total"] == 90000
    # Celda vacía = precio base del plan
    assert client.patch(f"/api/internal/cremations/{oid}/weight", headers=h, json={"tier_id": t[2]}).json()["total"] == 87000


def test_orden_cancelada_no_se_corrige(client, db, tabla):
    h, t = tabla["h"], tabla["tiers"]
    oid = _orden(client, h, tabla["plan_id"])
    oc = db.get(models.CremationOC, oid)
    oc.status = "cancelado"
    db.commit()
    assert client.patch(f"/api/internal/cremations/{oid}/weight", headers=h, json={"tier_id": t[0]}).status_code == 400


def test_cambiar_plan_cambia_anforas_y_stock(client, db, tabla):
    """Fase 2: el plan nuevo reemplaza al anterior; su ánfora incluida se toma del
    stock y la del plan anterior vuelve."""
    h, tid = tabla["h"], tabla["tid"]
    _modo(db, tid, "surcharge")
    urn_a = models.Product(tenant_id=tid, code=f"UA{tid}{oid_tag()}", name="Ánfora A", sale_price=1, cost_price=100, stock=5)
    urn_b = models.Product(tenant_id=tid, code=f"UB{tid}{oid_tag()}", name="Ánfora B", sale_price=1, cost_price=200, stock=0)
    db.add_all([urn_a, urn_b])
    db.flush()
    plan_b = models.Plan(tenant_id=tid, name=f"Plan B {oid_tag()}", price=120000, cost=0, is_active=True)
    db.add(plan_b)
    db.flush()
    db.add(models.PlanProduct(tenant_id=tid, plan_id=tabla["plan_id"], product_id=urn_a.id))
    db.add(models.PlanProduct(tenant_id=tid, plan_id=plan_b.id, product_id=urn_b.id))
    db.commit()
    try:
        oid = _orden(client, h, tabla["plan_id"], weight_price=5000)
        db.add(models.ProductoOC(tenant_id=tid, cremation_id=oid, product_id=urn_a.id, cantidad=1,
                                 precio_venta=0, plan_id=tabla["plan_id"]))
        urn_a.stock = 4
        db.commit()

        opts = client.get(f"/api/internal/cremations/{oid}/weight", headers=h).json()
        line = opts["order_plans"][0]
        assert line["plan_id"] == tabla["plan_id"] and any(p["id"] == plan_b.id for p in opts["plans"])

        prev = client.patch(f"/api/internal/cremations/{oid}/weight", headers=h,
                            json={"plan_id": plan_b.id, "replace_line_id": line["line_id"], "dry_run": True}).json()
        assert prev["total"] == 125000 and prev["plan_changed"] and any("Pendiente de stock" in w for w in prev["warnings"])
        db.expire_all()
        assert db.get(models.Product, urn_a.id).stock == 4  # la vista previa no toca el stock

        r = client.patch(f"/api/internal/cremations/{oid}/weight", headers=h,
                         json={"plan_id": plan_b.id, "replace_line_id": line["line_id"]})
        assert r.status_code == 200, r.text
        db.expire_all()
        assert db.get(models.Product, urn_a.id).stock == 5 and db.get(models.Product, urn_b.id).stock == -1
        plans = db.query(models.PlanOC).filter(models.PlanOC.cremation_id == oid).all()
        assert [p.plan_id for p in plans] == [plan_b.id] and plans[0].plan_name == plan_b.name
        prods = db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id == oid).all()
        assert [(p.product_id, p.plan_id, p.precio_venta) for p in prods] == [(urn_b.id, plan_b.id, 0)]
        assert db.get(models.CremationFinancial, oid).total_price == 125000

        # Mismo plan otra vez = sin cambios
        again = client.patch(f"/api/internal/cremations/{oid}/weight", headers=h, json={"plan_id": plan_b.id}).json()
        assert again["plan_changed"] is False
    finally:
        while _CREATED:
            client.delete(f"/api/internal/cremations/{_CREATED.pop()}", headers=h)
        db.expire_all()
        db.query(models.PlanProduct).filter(models.PlanProduct.plan_id.in_([tabla["plan_id"], plan_b.id])).delete()
        db.query(models.Plan).filter(models.Plan.id == plan_b.id).delete()
        db.query(models.Product).filter(models.Product.id.in_([urn_a.id, urn_b.id])).delete()
        db.commit()


def oid_tag():
    import uuid
    return uuid.uuid4().hex[:5]

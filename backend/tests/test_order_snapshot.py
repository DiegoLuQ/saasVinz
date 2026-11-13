"""Copia de lo vendido en cada orden (services/order_snapshot.py): editar un plan o un
servicio del catálogo no altera las órdenes ya creadas, y los indicadores separan
servicios especiales de los normales vendidos sueltos."""
import uuid
from datetime import datetime

from app import models


def _order(client, h, tag, planes=None, servicios=None, status="pendiente"):
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Kira {tag}", "species": "Canino", "customer_id": c["id"]}).json()
    r = client.post("/api/internal/cremations", headers=h, json={
        "pet_id": p["id"], "status": status, "planes": planes or [], "servicios": servicios or []})
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


def _plan_item(client, h, oid):
    items = client.get(f"/api/internal/cremations/{oid}/expediente", headers=h).json()["items"]
    return next(i for i in items if i["tipo"] == "plan")


def test_editar_el_plan_no_cambia_lo_contratado(client, auth, db):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    s1 = client.post("/api/internal/services", headers=h, json={"name": f"Retiro {tag}", "price": 1000}).json()
    s2 = client.post("/api/internal/services", headers=h, json={"name": f"Velatorio {tag}", "price": 2000}).json()
    s3 = client.post("/api/internal/services", headers=h, json={"name": f"Ceremonia {tag}", "price": 3000}).json()
    plan = client.post("/api/internal/plans", headers=h, json={
        "name": f"Plan Sereno {tag}", "price": 50000,
        "service_ids": [s1["id"], s2["id"]], "optional_service_ids": [s2["id"]]}).json()
    line = {"plan_id": plan["id"], "cantidad": 1, "precio_venta": 50000, "precio_costo": 0}
    oid = _order(client, h, tag, planes=[line])

    row = db.query(models.PlanOC).filter(models.PlanOC.cremation_id == oid).one()
    assert row.snapshot_source == "order" and row.plan_name == f"Plan Sereno {tag}"
    assert [(s["service_id"], s["optional"]) for s in row.included_services] == [(s1["id"], False), (s2["id"], True)]
    # Lo opcional no se muestra como incluido
    assert _plan_item(client, h, oid)["incluye"] == [f"Retiro {tag}"]

    # Se edita el plan: nombre y servicios
    r = client.patch(f"/api/internal/plans/{plan['id']}", headers=h,
                     json={"name": f"Plan Nuevo {tag}", "service_ids": [s3["id"]], "optional_service_ids": []})
    assert r.status_code == 200, r.text
    item = _plan_item(client, h, oid)
    assert item["nombre"] == f"Plan Sereno {tag}" and item["incluye"] == [f"Retiro {tag}"]

    # Editar la orden con el mismo plan conserva lo contratado
    r = client.patch(f"/api/internal/cremations/{oid}", headers=h, json={"planes": [{**line, "precio_venta": 45000}]})
    assert r.status_code == 200, r.text
    assert _plan_item(client, h, oid)["incluye"] == [f"Retiro {tag}"]

    # Cambiar a otro plan copia el contenido actual de ese plan
    other = client.post("/api/internal/plans", headers=h, json={
        "name": f"Plan Otro {tag}", "price": 1, "service_ids": [s3["id"]]}).json()
    client.patch(f"/api/internal/cremations/{oid}", headers=h,
                 json={"planes": [{**line, "plan_id": other["id"]}]})
    item = _plan_item(client, h, oid)
    assert item["nombre"] == f"Plan Otro {tag}" and item["incluye"] == [f"Ceremonia {tag}"]


def test_indicador_servicios_especiales_y_sueltos(client, auth):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    esp = client.post("/api/internal/services", headers=h, json={
        "name": f"Huella {tag}", "price": 0, "is_special": True, "price_on_request": True}).json()
    normal = client.post("/api/internal/services", headers=h, json={"name": f"Retiro {tag}", "price": 5000}).json()
    _order(client, h, tag, status="entregado", servicios=[
        {"service_id": esp["id"], "cantidad": 1, "precio_venta": 0, "precio_costo": 0},
        {"service_id": normal["id"], "cantidad": 1, "precio_venta": 5000, "precio_costo": 0},
    ])
    # Después deja de ser especial: lo vendido sigue contando como especial
    assert client.patch(f"/api/internal/services/{esp['id']}", headers=h,
                        json={"is_special": False, "price_on_request": False}).status_code == 200

    now = datetime.now()
    k = client.get("/api/internal/kpis", headers=h, params={"year": now.year, "month": now.month}).json()
    special = next(r for r in k["by_special_service"] if r["label"].startswith(f"Huella {tag}"))
    assert special["count"] == 1 and special["pending"] == 1  # «a cotizar» aún en $0
    extra = next(r for r in k["by_extra_service"] if r["label"].startswith(f"Retiro {tag}"))
    assert extra["count"] == 1 and extra["revenue"] == 5000
    assert not any(r["label"].startswith(f"Retiro {tag}") for r in k["by_special_service"])
    assert not any(r["label"].startswith(f"Huella {tag}") for r in k["by_extra_service"])

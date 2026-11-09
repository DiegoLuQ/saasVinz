"""Embudo del catálogo de planes: eventos por sesión anónima, formulario ligado al
enlace, resumen por enlace (tenant) y reporte del SuperAdmin."""
import json
import secrets
import uuid

import pytest

from app import models
from app.api.internal.catalog.models import CatalogEvent, CatalogShareToken


@pytest.fixture
def plans_link(db, world):
    link = CatalogShareToken(tenant_id=world["tenant_a"], token=secrets.token_urlsafe(16),
                             catalog_type="plans", is_active=True, views_count=0)
    db.add(link)
    db.commit()
    return {"id": link.id, "token": link.token}


def _event(client, token, kind, sid, slug="crematorio-a", **extra):
    return client.post(f"/api/public/catalog/{slug}/{token}/events",
                       json={"kind": kind, "session_id": sid, **extra})


def _events(db, link_id, kind=None):
    q = db.query(CatalogEvent).filter(CatalogEvent.catalog_token_id == link_id)
    return q.filter(CatalogEvent.kind == kind).count() if kind else q.count()


def test_una_fila_por_sesion_y_evento(client, db, plans_link):
    sid = uuid.uuid4().hex
    for _ in range(3):  # recargar no infla
        assert _event(client, plans_link["token"], "view", sid).status_code == 204
    _event(client, plans_link["token"], "plan_request", sid, plan_id=1, weight_tier="Pequeño (1 a 10 kg)")
    _event(client, plans_link["token"], "plan_request", sid, plan_id=2, weight_tier="Pequeño (1 a 10 kg)")
    _event(client, plans_link["token"], "view", uuid.uuid4().hex)
    db.expire_all()
    assert _events(db, plans_link["id"], "view") == 2
    assert _events(db, plans_link["id"], "plan_request") == 2


def test_eventos_invalidos_se_ignoran(client, db, plans_link):
    assert _event(client, plans_link["token"], "view", "corto").status_code == 204  # sesión inválida
    assert _event(client, "token-que-no-existe", "view", uuid.uuid4().hex).status_code == 204
    assert _event(client, plans_link["token"], "view", uuid.uuid4().hex, slug="crematorio-b").status_code == 204
    assert _event(client, plans_link["token"], "otro", uuid.uuid4().hex).status_code == 422
    db.expire_all()
    assert _events(db, plans_link["id"]) == 0


def test_formulario_queda_ligado_y_se_resume_por_enlace(client, db, world, plans_link, auth):
    sid = uuid.uuid4().hex
    _event(client, plans_link["token"], "view", sid)
    _event(client, plans_link["token"], "plan_request", sid, plan_id=5)
    r = client.post("/api/public/submit-form", data={
        "tenant_id": world["tenant_a"], "token": plans_link["token"], "recaptcha_token": "x",
        "owner_data": json.dumps({"fullName": "Familia Catálogo", "phone": "+56912345678",
                                  "veterinary": "Domicilio", "address": "Av. Siempre Viva 742"}),
        "pet_data": json.dumps({"name": "Nube", "type": "Canino", "species": "Canino", "size": "Pequeño", "age": "5"}),
    })
    assert r.status_code == 200, r.text
    db.expire_all()
    assert db.query(models.FormSubmission).filter(
        models.FormSubmission.catalog_token_id == plans_link["id"]).count() == 1

    links = client.get("/api/internal/catalog/links?type=plans", headers=auth("a")).json()
    mine = next(l for l in links if l["id"] == plans_link["id"])
    assert (mine["visitors"], mine["plan_requests"], mine["forms_submitted"]) == (1, 1, 1)

    # Procesar el registro hasta la orden: se conserva como «processed» (fuera de la lista) y cuenta la orden
    sub = db.query(models.FormSubmission).filter(models.FormSubmission.catalog_token_id == plans_link["id"]).one()
    h = auth("a")
    cust = client.post(f"/api/internal/submissions/{sub.id}/create-customer", headers=h).json()["customer_id"]
    pet = client.post(f"/api/internal/submissions/{sub.id}/create-pet?customer_id={cust}", headers=h).json()["pet_id"]
    r = client.post(f"/api/internal/submissions/{sub.id}/create-services?pet_id={pet}", headers=h)
    assert r.status_code == 200, r.text
    db.expire_all()
    assert db.query(models.FormSubmission).get(sub.id).status == "processed"
    assert all(s["id"] != sub.id for s in client.get("/api/internal/submissions", headers=h).json())
    mine = next(l for l in client.get("/api/internal/catalog/links?type=plans", headers=h).json() if l["id"] == plans_link["id"])
    assert (mine["forms_submitted"], mine["orders"]) == (1, 1)
    # Reintentar «Procesar» no duplica la orden
    again = client.post(f"/api/internal/submissions/{sub.id}/create-services?pet_id={pet}", headers=h).json()
    assert again["status"] == "exists"

    # El otro crematorio no ve los enlaces ni los eventos de A
    other = client.get("/api/internal/catalog/links?type=plans", headers=auth("b")).json()
    assert all(l["id"] != plans_link["id"] for l in other)


def test_reporte_superadmin(client, plans_link, world, auth):
    _event(client, plans_link["token"], "view", uuid.uuid4().hex)
    assert client.get("/api/internal/creator/catalog-funnel", headers=auth("a")).status_code in (401, 403)
    r = client.get(f"/api/internal/creator/catalog-funnel?tenant_id={world['tenant_a']}", headers=auth("creator"))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["totals"]["visitors"] >= 1
    row = next(t for t in data["by_tenant"] if t["tenant_id"] == world["tenant_a"])
    assert row["links_total"] >= 1


from tests.test_public_form import form_token  # noqa: E402,F401  (fixture)


def test_reporte_cuenta_todos_los_formularios_y_tamanos_por_crematorio(client, db, world, plans_link, form_token, auth):
    """«OC formulario» incluye el formulario directo (sin catálogo); el catálogo solo cuenta lo suyo.
    Los tamaños más pedidos se agrupan por crematorio."""
    url = f"/api/internal/creator/catalog-funnel?tenant_id={world['tenant_a']}"
    before = next(t for t in client.get(url, headers=auth("creator")).json()["by_tenant"] if t["tenant_id"] == world["tenant_a"])

    r = client.post("/api/public/submit-form", data={
        "tenant_id": world["tenant_a"], "token": form_token, "recaptcha_token": "x",
        "owner_data": json.dumps({"fullName": "Familia Directa", "phone": "+56912345679",
                                  "veterinary": "Domicilio", "address": "Calle 1"}),
        "pet_data": json.dumps({"name": "Directo", "type": "Canino", "species": "Canino", "size": "Pequeño", "age": "3"}),
    })
    assert r.status_code == 200, r.text
    db.expire_all()
    sub = (db.query(models.FormSubmission)
           .filter(models.FormSubmission.tenant_id == world["tenant_a"], models.FormSubmission.catalog_token_id.is_(None))
           .order_by(models.FormSubmission.id.desc()).first())
    h = auth("a")
    cust = client.post(f"/api/internal/submissions/{sub.id}/create-customer", headers=h).json()["customer_id"]
    pet = client.post(f"/api/internal/submissions/{sub.id}/create-pet?customer_id={cust}", headers=h).json()["pet_id"]
    assert client.post(f"/api/internal/submissions/{sub.id}/create-services?pet_id={pet}", headers=h).status_code == 200

    _event(client, plans_link["token"], "plan_request", uuid.uuid4().hex, plan_id=5, weight_tier="Mediano")
    data = client.get(url, headers=auth("creator")).json()
    row = next(t for t in data["by_tenant"] if t["tenant_id"] == world["tenant_a"])
    assert row["forms_all"] == before["forms_all"] + 1
    assert row["orders_all"] == before["orders_all"] + 1
    assert row["order"] == before["order"]          # el catálogo no se atribuye el formulario directo
    assert data["totals"]["orders_all"] >= row["orders_all"]
    # Tamaños más pedidos = órdenes en proceso/entregadas (no los clics del catálogo)
    assert not any(s["weight_tier"] == "Mediano" for s in data["top_sizes"])
    oc = db.query(models.CremationOC).filter(models.CremationOC.pet_id == pet).first()
    oc.status = "en_proceso"
    db.commit()
    data = client.get(url, headers=auth("creator")).json()
    size = next(s for s in data["top_sizes"] if s["weight_tier"] == "Pequeño")
    assert size["tenant_id"] == world["tenant_a"] and size["tenant_name"] and size["count"] >= 1
    assert sum(s["count"] for s in data["top_sizes"]) == data["top_sizes_orders"]


def test_vistas_de_links_publicos_no_rompen_el_reporte(client, db, world, auth):
    """Regresión: la tabla de vistas la crea la migración; registrar guarda la huella (no el token)
    y el reporte responde 200 aunque esa consulta falle (antes abortaba la transacción → 500)."""
    import hashlib
    from unittest import mock
    from sqlalchemy import text
    from app.services import catalog_funnel

    token = "tok-" + hashlib.md5(str(world["tenant_a"]).encode()).hexdigest()
    catalog_funnel.record_link_view(db, world["tenant_a"], "tracking", token)
    key = hashlib.sha256(token.encode()).hexdigest()
    n = db.execute(text("SELECT count(*) FROM sys_public_link_views WHERE resource_key = :k"), {"k": key}).scalar()
    assert n >= 1
    assert db.execute(text("SELECT count(*) FROM sys_public_link_views WHERE resource_key = :k"), {"k": token}).scalar() == 0

    url = f"/api/internal/creator/catalog-funnel?tenant_id={world['tenant_a']}"
    assert client.get(url, headers=auth("creator")).status_code == 200

    # Si la consulta de vistas falla, el resto del reporte sigue (savepoint)
    real_execute = None

    def broken(self, statement, *a, **k):
        if "sys_public_link_views" in str(statement):
            raise RuntimeError("tabla no disponible")
        return real_execute(self, statement, *a, **k)

    from sqlalchemy.orm import Session
    real_execute = Session.execute
    with mock.patch.object(Session, "execute", broken):
        r = client.get(url, headers=auth("creator"))
    assert r.status_code == 200, r.text


def test_detalle_de_tracking_por_crematorio(client, db, world, auth):
    """Detalle de un crematorio: la apertura del seguimiento de su orden se reconoce por la huella."""
    from app.services import catalog_funnel
    tid = world["tenant_a"]
    oc = db.query(models.CremationOC).filter(models.CremationOC.tenant_id == tid).first()
    if oc is None or not oc.details:
        pytest.skip("sin órdenes en el escenario")
    catalog_funnel.record_link_view(db, tid, "tracking", oc.details.tracking_token)
    url = f"/api/internal/creator/catalog-funnel/tenant/{tid}"
    assert client.get(url, headers=auth("a")).status_code in (401, 403)
    assert client.get("/api/internal/creator/catalog-funnel/tenant/999999", headers=auth("creator")).status_code == 404
    r = client.get(url, headers=auth("creator"))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["tenant"]["id"] == tid and d["views"]["tracking"] >= 1
    assert any(o["id"] == oc.id and o["views"] >= 1 for o in d["top_orders"])
    assert d["views"]["daily"] and "notices" in d and "links" in d

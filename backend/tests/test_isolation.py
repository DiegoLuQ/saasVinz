"""Aislamiento entre crematorios: por API y por RLS en la base."""
import uuid

from sqlalchemy import text

from app import models
from app.core.tenant_context import apply_tenant_rls
from app.database import SessionLocal


def _customer(client, headers, name):
    r = client.post("/api/internal/customers", headers=headers, json={"name": name, "phone": "+56922222222"})
    assert r.status_code == 200, r.text
    return r.json()


def test_crematorio_no_ve_clientes_de_otro(client, auth):
    name = f"Cliente A {uuid.uuid4().hex[:6]}"
    created = _customer(client, auth("a"), name)

    lista_b = client.get("/api/internal/customers", headers=auth("b")).json()
    assert all(c["id"] != created["id"] for c in lista_b)

    # Leer, editar y borrar el cliente de A con la sesión de B: como si no existiera.
    assert client.get(f"/api/internal/customers/{created['id']}", headers=auth("b")).status_code == 404
    assert client.patch(f"/api/internal/customers/{created['id']}", headers=auth("b"), json={"name": "Hackeado"}).status_code == 404
    client.delete(f"/api/internal/customers/{created['id']}", headers=auth("b"))
    assert client.get(f"/api/internal/customers/{created['id']}", headers=auth("a")).json()["name"] == name


def test_mascota_no_se_asigna_a_cliente_de_otro(client, auth):
    cliente_a = _customer(client, auth("a"), "Dueño A")
    r = client.post("/api/internal/pets", headers=auth("b"), json={"name": "Intrusa", "species": "Canino", "customer_id": cliente_a["id"]})
    assert r.status_code in (400, 403, 404, 422), r.text


def test_rls_en_la_base_sin_filtros_de_la_app(world):
    """Aunque una consulta olvide filtrar por tenant, PostgreSQL solo devuelve las filas
    del crematorio de la sesión (rol de la app sin BYPASSRLS)."""
    s = SessionLocal()
    try:
        apply_tenant_rls(s, world["tenant_a"])
        s.add(models.Customer(tenant_id=world["tenant_a"], name="Solo de A RLS"))
        s.commit()

        apply_tenant_rls(s, world["tenant_b"])
        tenants_visibles = {row[0] for row in s.execute(text("SELECT DISTINCT tenant_id FROM crm_customers")).fetchall()}
        assert tenants_visibles <= {world["tenant_b"]}

        # Insertar a nombre de otro crematorio también se rechaza.
        try:
            s.add(models.Customer(tenant_id=world["tenant_a"], name="Escrito por B"))
            s.commit()
            inserted = True
        except Exception:
            s.rollback()
            inserted = False
        assert not inserted
    finally:
        s.close()


def test_sin_contexto_de_tenant_no_se_ve_nada(world):
    s = SessionLocal()
    try:
        s.execute(text("SELECT set_config('app.current_tenant_id', '', false)"))
        s.execute(text("SELECT set_config('app.bypass_rls', 'false', false)"))
        assert s.execute(text("SELECT count(*) FROM crm_customers")).scalar() == 0
        assert s.execute(text("SELECT count(*) FROM oc_cremations")).scalar() == 0
    finally:
        s.close()


def test_rls_activo_en_tablas_base(world):
    """Las tablas con datos de los crematorios tienen RLS forzado (migración rls_baseline)."""
    s = SessionLocal()
    try:
        rows = dict(s.execute(text(
            "SELECT relname, relforcerowsecurity FROM pg_class WHERE relname = ANY(:t)"
        ), {"t": ["crm_customers", "crm_pets", "oc_cremations", "oc_financial", "sys_notifications",
                  "web_form_submissions", "ops_service_feedback", "sys_template_exports"]}).fetchall())
        assert rows and all(rows.values()), rows
    finally:
        s.close()

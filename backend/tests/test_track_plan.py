"""Plan TRACK: todas las funciones definidas (migración e2b4d6f8a136) y las
exclusiones validadas en el backend, no solo ocultas en el frontend."""
import importlib.util
import pathlib
import uuid

import pytest

from app import models
from app.api.internal.agreements.models import Agreement
from app.auth import get_password_hash
from app.services.plan_features import show_vinzer_brand
from app.services.tenant_provisioning import provision_tenant
from tests.conftest import MODULES, PASSWORD, token_for

_MIG = pathlib.Path(__file__).resolve().parents[1] / "alembic" / "versions" / "e2b4d6f8a136_track_plan_explicit.py"
_spec = importlib.util.spec_from_file_location("track_mig", _MIG)
track_mig = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(track_mig)
TRACK_FEATURES = track_mig.TRACK_FEATURES


@pytest.fixture
def track(db, world):
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == "Track").first()
    if not plan:
        plan = models.SubscriptionPlan(
            name="Track", price=29900, is_active=True, features=dict(TRACK_FEATURES), can_delete=False, can_export=False,
            allowed_modules=[m for m in MODULES if m not in ("veterinarios", "configuracion", "perfil", "productos")],
            max_orders=25, max_users=2, max_pets=25, max_customers=25, max_services=10, max_products=15,
            max_plans=5, max_partners=0, ai_monthly_credits=0,
        )
        db.add(plan)
        db.flush()
    slug = f"track-{uuid.uuid4().hex[:6]}"
    tenant, admin = provision_tenant(db, subscription_plan=plan, admin_password_hash=get_password_hash(PASSWORD),
                                     name="Crematorio Track", slug=slug, email=f"admin-{slug}@vinzer-pruebas.cl", phone="912345678")
    db.commit()
    return {"tenant": tenant.id, "h": {"Authorization": f"Bearer {token_for(admin.id)}"}}


def test_track_no_deja_funciones_sin_definir():
    assert all(isinstance(v, bool) for v in TRACK_FEATURES.values())
    for key in ("mascotas:memorial", "certificados:generar_todo", "clientes:convenios", "configuracion:sin_marca_vinzer",
                "inventario:productos:catalogo", "inventario:productos:descargar_pdf", "integraciones:widget",
                "integraciones:video_bienvenida", "integraciones:formulario_incrustable", "configuracion:usuarios",
                "configuracion:roles", "veterinarios:gestionar"):
        assert TRACK_FEATURES[key] is False, key
    for key in ("operaciones:avisos_familia", "certificados:generar_pdf", "certificados:diseno", "certificados:redes",
                "configuracion:formulario", "configuracion:flujo", "configuracion:creditos_ia"):
        assert TRACK_FEATURES[key] is True, key


def test_track_muestra_la_marca_vinzer(db, track):
    assert show_vinzer_brand(db.query(models.Tenant).get(track["tenant"])) is True


def test_catalogo_de_productos_bloqueado_en_backend(client, track):
    r = client.post("/api/internal/catalog/links", headers=track["h"], json={"catalog_type": "products"})
    assert r.status_code == 403
    r = client.post("/api/internal/catalog/links", headers=track["h"], json={"catalog_type": "plans"})
    assert r.status_code == 201, r.text


def test_convenios_bloqueados_en_backend(client, db, track):
    h = track["h"]
    assert client.post("/api/internal/agreements", headers=h, json={"name": "Sindicato"}).status_code == 403
    # Convenio creado antes (p. ej. cuando tenía otro plan): no se ofrece ni se puede asignar
    ag = Agreement(tenant_id=track["tenant"], name="Antiguo", plans_discount_pct=10, is_active=True)
    db.add(ag)
    db.commit()
    assert client.get("/api/internal/agreements/active-options", headers=h).json() == []
    c = client.post("/api/internal/customers", headers=h, json={"name": "Fam Track", "phone": "912345678"}).json()
    pet = client.post("/api/internal/pets", headers=h, json={"name": "Luna", "species": "Felino", "customer_id": c["id"]}).json()
    r = client.post("/api/internal/cremations", headers=h, json={"pet_id": pet["id"], "status": "pendiente", "agreement_id": ag.id})
    assert r.status_code == 403
    assert "convenios" in r.json()["detail"]


def test_generar_todo_y_eliminar_bloqueados(client, track):
    h = track["h"]
    assert client.put("/api/internal/auto-documents", headers=h, json={}).status_code == 403
    c = client.post("/api/internal/customers", headers=h, json={"name": "Fam Borrar", "phone": "912345678"}).json()
    assert client.delete(f"/api/internal/customers/{c['id']}", headers=h).status_code == 403


def test_mascotas_y_clientes_sin_limite(client, track):
    h = track["h"]
    limits = client.get("/api/internal/dashboard/summary", headers=h).json()["limits"]
    assert limits["pets"]["max"] == 0 and limits["customers"]["max"] == 0
    assert limits["orders"]["max"] == 25 and limits["users"]["max"] == 2

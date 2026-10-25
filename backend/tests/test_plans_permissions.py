"""Límites del plan, módulos por plan, Configuración siempre disponible y permisos por rol."""
import uuid

from app import models
from app.auth import create_access_token_for_user, get_password_hash
from tests.conftest import PASSWORD


def _pet(client, headers, name):
    c = client.post("/api/internal/customers", headers=headers, json={"name": f"Familia {name}"}).json()
    r = client.post("/api/internal/pets", headers=headers, json={"name": name, "species": "Canino", "customer_id": c["id"]})
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_limite_de_ordenes_del_plan(client, auth, db, world):
    """FREE de prueba: 3 órdenes al mes. La cuarta responde 402 con el detalle del límite."""
    h = auth("free")
    tid = world["tenant_free"]
    usadas = db.query(models.Cremation).filter(models.Cremation.tenant_id == tid).count()
    for i in range(max(0, 3 - usadas)):
        r = client.post("/api/internal/cremations", headers=h, json={"pet_id": _pet(client, h, f"Limite {i}"), "status": "pendiente"})
        assert r.status_code == 200, r.text
    r = client.post("/api/internal/cremations", headers=h, json={"pet_id": _pet(client, h, "Sobre el límite"), "status": "pendiente"})
    assert r.status_code == 402, r.text
    detail = r.json()["detail"]
    assert detail.get("limit") == 3 and detail.get("usage") == 3


def test_modulo_fuera_del_plan_se_bloquea(client, auth):
    # El FREE de prueba no incluye «veterinarios».
    r = client.get("/api/internal/partners", headers=auth("free"))
    assert r.status_code in (402, 403), r.text


def test_configuracion_disponible_en_todos_los_planes(client, auth):
    """«configuracion» no está en el FREE de prueba, pero es módulo exento: el
    bootstrap la activa y sus endpoints responden (General / Facturación)."""
    boot = client.get("/api/internal/auth/bootstrap", headers=auth("free")).json()
    activos = {m["module_key"] for m in boot["rbac"]["modules"] if m["is_active"]}
    assert "configuracion" in activos
    assert client.get("/api/internal/maintenance/form-config", headers=auth("free")).status_code == 200


def test_rol_sin_permiso_no_configura_el_flujo(client, db, world):
    """Un operador no puede crear fases del flujo (solo el administrador)."""
    op = models.User(tenant_id=world["tenant_a"], name="Operador", email=f"operador-{uuid.uuid4().hex[:8]}@vinzer-pruebas.cl",
                     password_hash=get_password_hash(PASSWORD), role=models.UserRole.operator, is_active=True)
    db.add(op)
    db.commit()
    h = {"Authorization": f"Bearer {create_access_token_for_user(op)}"}
    r = client.post("/api/internal/operations/steps", headers=h, json={"name": "Fase pirata", "order_index": 99})
    assert r.status_code == 403


def test_marca_vinzer_solo_en_free_y_configurable(client, db, world):
    """FREE muestra «con tecnología de Vinzer»; los pagados no. La casilla del plan manda."""
    from sqlalchemy.orm.attributes import flag_modified

    def brand(slug):
        return client.get(f"/api/public/tenant/{slug}").json()["show_vinzer_brand"]

    assert brand("crematorio-free") is True
    assert brand("crematorio-a") is False

    free = db.query(models.SubscriptionPlan).get(world["free_plan_id"])
    free.features = {**(free.features or {}), "configuracion:sin_marca_vinzer": True}
    flag_modified(free, "features")
    db.commit()
    try:
        assert brand("crematorio-free") is False
    finally:
        free.features = {k: v for k, v in free.features.items() if k != "configuracion:sin_marca_vinzer"}
        flag_modified(free, "features")
        db.commit()

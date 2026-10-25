"""Pruebas automáticas (pytest) contra una base PostgreSQL de prueba.

Cómo correr (desde backend/):

    venv/Scripts/python.exe -m pytest            # Windows
    python -m pytest                             # CI / Linux

La base `v3_saas_test` se crea desde cero en cada corrida con `alembic upgrade
head` (así también se prueba que las migraciones arman la base completa, RLS
incluido). La app se conecta con el rol de la app, sin privilegios, para que
RLS se aplique igual que en producción.

Conexión: TEST_DATABASE_URL (rol de la app) y TEST_ADMIN_DATABASE_URL
(superusuario, crea la base y corre las migraciones). Sin ellas se derivan de
backend/.env (SQLALCHEMY_DATABASE_URL y DB_ADMIN_USER/DB_ADMIN_PASS) con la base
`v3_saas_test`. TEST_DB_REUSE=1 reutiliza la base ya creada (más rápido).
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest
from dotenv import dotenv_values
from sqlalchemy.engine.url import make_url

BACKEND = Path(__file__).resolve().parents[1]
TEST_DB = "v3_saas_test"


def _urls() -> tuple[str, str]:
    env = dotenv_values(BACKEND / ".env")
    app_url = os.environ.get("TEST_DATABASE_URL")
    admin_url = os.environ.get("TEST_ADMIN_DATABASE_URL")
    if not app_url:
        base = make_url(env.get("SQLALCHEMY_DATABASE_URL") or "postgresql://vincer_app:vincer_app@127.0.0.1:5432/v3_saas")
        app_url = base.set(database=TEST_DB).render_as_string(hide_password=False)
    if not admin_url:
        u = make_url(app_url)
        admin_url = u.set(username=env.get("DB_ADMIN_USER") or os.environ.get("DB_ADMIN_USER") or "postgres",
                          password=env.get("DB_ADMIN_PASS") or os.environ.get("DB_ADMIN_PASS") or "postgres").render_as_string(hide_password=False)
    return app_url, admin_url


APP_URL, ADMIN_URL = _urls()
_app = make_url(APP_URL)
_admin = make_url(ADMIN_URL)

# La configuración se lee al importar `app`: todo esto va ANTES de cualquier import de la app.
os.environ.update({
    "SQLALCHEMY_DATABASE_URL": APP_URL,
    "DB_ADMIN_USER": _admin.username or "",
    "DB_ADMIN_PASS": _admin.password or "",
    "ENVIRONMENT": "test",
    "REDIS_URL": "memory://",
    "RATE_LIMIT_API": "100000/minute",
    "RATE_LIMIT_LOGIN": "100000/minute",
    "SENTRY_DSN": "",
    # Nunca subir archivos al bucket real: las imágenes quedan en static/ local.
    "USE_R2": "false",
    "RECAPTCHA_SECRET_KEY": "",
    "MAIL_USERNAME": "", "MAIL_PASSWORD": "",
    "TENANT_APP_URL": "http://app.test.local",
    "TRACKING_BASE_URL": "http://track.test.local",
})


def _create_database() -> None:
    import psycopg2
    conn = psycopg2.connect(host=_admin.host, port=_admin.port or 5432, dbname="postgres",
                            user=_admin.username, password=_admin.password)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB,))
    if cur.fetchone():
        if os.environ.get("TEST_DB_REUSE") == "1":
            conn.close()
            return
        cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()", (TEST_DB,))
        cur.execute(f'DROP DATABASE "{TEST_DB}"')
    cur.execute(f'CREATE DATABASE "{TEST_DB}" OWNER "{_admin.username}"')
    # Rol de la app (como en provision_db.sh): sin superusuario ni BYPASSRLS.
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (_app.username,))
    if not cur.fetchone():
        cur.execute(f'CREATE ROLE "{_app.username}" LOGIN PASSWORD %s NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS',
                    (_app.password,))
    cur.execute(f'GRANT CONNECT ON DATABASE "{TEST_DB}" TO "{_app.username}"')
    conn.close()

    # Migraciones (como superusuario, igual que entrypoint.sh).
    env = {**os.environ, "SQLALCHEMY_DATABASE_URL": APP_URL}
    result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND, env=env,
                            capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"alembic upgrade head falló:\n{result.stdout}\n{result.stderr}")

    conn = psycopg2.connect(host=_admin.host, port=_admin.port or 5432, dbname=TEST_DB,
                            user=_admin.username, password=_admin.password)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(f'''
        GRANT USAGE ON SCHEMA public TO "{_app.username}";
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "{_app.username}";
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "{_app.username}";
    ''')
    conn.close()


_create_database()

# --- Recién ahora la app ------------------------------------------------------
from app import models  # noqa: E402
from app.auth import create_access_token_for_user, get_password_hash  # noqa: E402
from app.core.rate_limiter import limiter  # noqa: E402
from app.core.tenant_context import apply_bypass_rls  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402

limiter.enabled = False

MODULES = ["dashboard", "perfil", "clientes", "mascotas", "servicios", "ordenes", "productos", "inventario",
           "certificados", "pagos", "veterinarios", "operaciones", "configuracion"]
PASSWORD = "Prueba1234"


@pytest.fixture(autouse=True)
def _no_emails(monkeypatch):
    """Ningún correo sale de las pruebas: se guardan en `sent_emails`."""
    from fastapi_mail import FastMail
    sent = []

    async def fake_send(self, message, *args, **kwargs):
        sent.append(message)

    monkeypatch.setattr(FastMail, "send_message", fake_send)
    return sent


@pytest.fixture
def sent_emails(_no_emails):
    return _no_emails


@pytest.fixture
def db():
    session = SessionLocal()
    apply_bypass_rls(session)
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _plan(db, name, price, modules, **limits):
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == name).first()
    if plan:
        return plan
    plan = models.SubscriptionPlan(name=name, price=price, allowed_modules=modules, is_active=True,
                                   can_delete=True, can_export=False, features={}, **limits)
    db.add(plan)
    db.flush()
    return plan


@pytest.fixture(scope="session")
def world():
    """Datos base: módulos, planes FREE y PRO, dos crematorios con su admin y un SuperAdmin."""
    from app.services.tenant_provisioning import provision_tenant

    s = SessionLocal()
    apply_bypass_rls(s)
    try:
        for key in MODULES:
            if not s.query(models.Module).filter(models.Module.key == key).first():
                s.add(models.Module(key=key, name=key.capitalize()))
        s.flush()
        free = _plan(s, "FREE", 0, [m for m in MODULES if m not in ("veterinarios", "configuracion")],
                     max_orders=3, max_users=2, max_pets=999, max_customers=999, max_services=10,
                     max_products=10, max_plans=4, max_partners=0)
        pro = _plan(s, "PRO", 59990, MODULES, max_orders=60, max_users=4, max_pets=999, max_customers=999,
                    max_services=50, max_products=50, max_plans=20, max_partners=30)

        if not s.query(models.SaaSConfig).first():
            s.add(models.SaaSConfig(name="Vinzer", correo="info@vinzer-pruebas.cl"))
            s.flush()

        out = {"free_plan_id": free.id, "pro_plan_id": pro.id}
        for key, plan, slug in (("a", pro, "crematorio-a"), ("b", pro, "crematorio-b"), ("free", free, "crematorio-free")):
            t = s.query(models.Tenant).filter(models.Tenant.slug == slug).first()
            if not t:
                t, _ = provision_tenant(
                    s, subscription_plan=plan, admin_password_hash=get_password_hash(PASSWORD), seed_workflow=True,
                    name=f"Crematorio {key.upper()}", slug=slug, email=f"admin-{slug}@vinzer-pruebas.cl", phone="+56911111111",
                )
            out[f"tenant_{key}"] = t.id
            out[f"admin_{key}"] = s.query(models.User).filter(models.User.tenant_id == t.id).first().id

        creator = s.query(models.User).filter(models.User.role == models.UserRole.creator).first()
        if not creator:
            creator = models.User(tenant_id=out["tenant_a"], name="Creator", email="creator@vinzer-pruebas.cl",
                                  password_hash=get_password_hash(PASSWORD), role=models.UserRole.creator, is_active=True)
            s.add(creator)
            s.flush()
        out["creator"] = creator.id
        s.commit()
        return out
    finally:
        s.close()


def token_for(user_id: int) -> str:
    s = SessionLocal()
    apply_bypass_rls(s)
    try:
        return create_access_token_for_user(s.query(models.User).get(user_id))
    finally:
        s.close()


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    # Sin `with`: no corren los eventos de inicio (scheduler de backups, aviso de saldo IA).
    return TestClient(app)


@pytest.fixture
def auth(world):
    """auth('a') → headers del admin del crematorio A (también 'b', 'free', 'creator')."""
    def _headers(who: str) -> dict:
        user_id = world["creator"] if who == "creator" else world[f"admin_{who}"]
        return {"Authorization": f"Bearer {token_for(user_id)}"}
    return _headers

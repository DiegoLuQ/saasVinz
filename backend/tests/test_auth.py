"""Inicio de sesión, refresh tokens, restablecer contraseña y tokens ajenos al panel."""
from datetime import timedelta

from fastapi.testclient import TestClient

from app import models
from app.api.internal.auth.router import RESET_ROLE, _password_fingerprint
from app.auth import REFRESH_COOKIE_NAME, _hash_refresh_token, create_access_token, get_password_hash
from app.main import app
from app.utils import tz
from tests.conftest import PASSWORD


def _new_user(db, world, email, role=models.UserRole.recepcion):
    # Si la base se reutiliza (TEST_DB_REUSE=1), el usuario de una corrida anterior se quita.
    old = db.query(models.User).filter(models.User.email == email).first()
    if old:
        db.query(models.RefreshToken).filter(models.RefreshToken.user_id == old.id).delete()
        db.delete(old)
        db.commit()
    user = models.User(tenant_id=world["tenant_a"], name="Usuario Prueba", email=email,
                       password_hash=get_password_hash(PASSWORD), role=role, is_active=True)
    db.add(user)
    db.commit()
    return user


def _login(client, email, password=PASSWORD):
    return client.post("/api/internal/auth/login", data={"username": email, "password": password})


def test_login_correcto_e_incorrecto(client, db, world):
    _new_user(db, world, "login@vinzer-pruebas.cl")
    assert _login(client, "login@vinzer-pruebas.cl").status_code == 200
    bad = _login(client, "login@vinzer-pruebas.cl", "otra-clave")
    assert bad.status_code == 401 and bad.json()["detail"] == "Credenciales incorrectas"
    # Mismo mensaje si el correo no existe (no revela cuentas).
    assert _login(client, "no-existe@vinzer-pruebas.cl").json()["detail"] == "Credenciales incorrectas"


def test_refresh_rota_y_el_reuso_fuera_de_plazo_revoca_todo(db, world):
    _new_user(db, world, "refresh@vinzer-pruebas.cl")
    c = TestClient(app)
    assert _login(c, "refresh@vinzer-pruebas.cl").status_code == 200
    first = c.cookies.get(REFRESH_COOKIE_NAME)

    r = c.post("/api/internal/auth/refresh")
    assert r.status_code == 200
    second = c.cookies.get(REFRESH_COOKIE_NAME)
    assert second and second != first

    # El token viejo vuelve a usarse pasada la ventana de gracia: se asume robo.
    old = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == _hash_refresh_token(first)).first()
    old.revoked_at = tz.get_now() - timedelta(minutes=10)
    db.commit()
    thief = TestClient(app)
    thief.cookies.set(REFRESH_COOKIE_NAME, first)
    assert thief.post("/api/internal/auth/refresh").status_code == 401
    # …y también quedó revocado el token legítimo.
    assert c.post("/api/internal/auth/refresh").status_code == 401


def test_restablecer_contrasena(client, db, world, sent_emails):
    user = _new_user(db, world, "olvido@vinzer-pruebas.cl")
    r = client.post("/api/internal/auth/forgot-password", json={"email": "olvido@vinzer-pruebas.cl"})
    assert r.status_code == 200 and len(sent_emails) == 1
    # Respuesta idéntica para un correo que no existe (y sin correo).
    assert client.post("/api/internal/auth/forgot-password", json={"email": "nadie@vinzer-pruebas.cl"}).json() == r.json()
    assert len(sent_emails) == 1

    token = create_access_token({"sub": str(user.id), "role": RESET_ROLE, "pwh": _password_fingerprint(user.password_hash)},
                                timedelta(minutes=30))
    assert client.post("/api/internal/auth/reset-password", json={"token": token, "new_password": "corta"}).status_code == 422
    assert client.post("/api/internal/auth/reset-password", json={"token": token, "new_password": "NuevaClave99"}).status_code == 200
    # Uso único: el mismo enlace ya no sirve.
    assert client.post("/api/internal/auth/reset-password", json={"token": token, "new_password": "OtraClave99"}).status_code == 400
    assert _login(client, "olvido@vinzer-pruebas.cl", "NuevaClave99").status_code == 200
    assert _login(client, "olvido@vinzer-pruebas.cl").status_code == 401


def test_superadmin_no_se_recupera_por_correo(client, world, sent_emails):
    client.post("/api/internal/auth/forgot-password", json={"email": "creator@vinzer-pruebas.cl"})
    assert sent_emails == []


def test_token_ajeno_no_sirve_como_sesion(client, world):
    """Regresión: un token del portal veterinario (o de restablecer contraseña) cuyo
    `sub` coincide con el id del SuperAdmin daba acceso total al admin."""
    creator_id = world["creator"]
    tokens = {
        "veterinaria": create_access_token({"sub": str(creator_id), "role": "veterinary_global", "slug": "x", "ver": 0}, timedelta(minutes=5)),
        "reset vet": create_access_token({"sub": str(creator_id), "role": "vet_password_reset", "pwh": "x"}, timedelta(minutes=5)),
        "reset panel": create_access_token({"sub": str(creator_id), "role": RESET_ROLE, "pwh": "x"}, timedelta(minutes=5)),
        "rol admin con tenant nulo": create_access_token({"sub": str(creator_id), "role": "admin", "tenant_id": None, "ver": 0}, timedelta(minutes=5)),
    }
    for name, tok in tokens.items():
        r = client.get("/api/internal/creator/tenants", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 401, f"{name}: {r.status_code}"


def test_sesion_real_del_superadmin_funciona(client, auth):
    assert client.get("/api/internal/creator/tenants", headers=auth("creator")).status_code == 200

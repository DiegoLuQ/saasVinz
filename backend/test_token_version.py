"""
Test de invalidación de sesión por token_version (Fase 3.1.a, M-2).

Verifica que get_current_user:
  1. Acepta un token cuyo claim "ver" coincide con user.token_version.
  2. Rechaza (401) un token con "ver" obsoleto (simula cambio de contraseña).
  3. Acepta un token SIN "ver" (compatibilidad con tokens antiguos de 7 días).

Uso:  python test_token_version.py
"""
import sys
sys.path.append(r"c:\SISTEMAS-PRUEBA\SaaSCrematorio_V2\backend")

from fastapi import HTTPException

from app import auth, models
from app.database import SessionLocal
from app.core.tenant_context import set_tenant_id

results = []


def _make_token(user, ver):
    data = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id) if user.tenant_id is not None else None,
        "role": user.role,
    }
    if ver is not None:
        data["ver"] = ver
    return auth.create_access_token(data=data)


def main():
    # Bypass para poder leer el usuario sin contexto de tenant.
    set_tenant_id("bypass")
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(
            models.User.role == models.UserRole.admin,
            models.User.is_active == True,
        ).first()
        if not user:
            print("[SKIP] No hay usuario admin activo para la prueba.")
            return 1
        current_ver = user.token_version or 0
        print(f"Usuario: {user.email} (tenant={user.tenant_id}, ver={current_ver})\n")
    finally:
        db.close()

    # 1. Token con ver correcto -> aceptado
    set_tenant_id("bypass")
    db = SessionLocal()
    try:
        u = auth.get_current_user(db, _make_token(user, current_ver))
        results.append(("Token con ver correcto -> aceptado", u is not None and u.id == user.id))
    except HTTPException as e:
        results.append((f"Token con ver correcto -> aceptado (got {e.status_code})", False))
    finally:
        db.close()

    # 2. Token con ver obsoleto -> 401
    set_tenant_id("bypass")
    db = SessionLocal()
    try:
        auth.get_current_user(db, _make_token(user, current_ver + 5))
        results.append(("Token con ver obsoleto -> 401", False))
    except HTTPException as e:
        results.append((f"Token con ver obsoleto -> 401 (got {e.status_code})", e.status_code == 401))
    finally:
        db.close()

    # 3. Token sin ver (antiguo) -> aceptado (compat)
    set_tenant_id("bypass")
    db = SessionLocal()
    try:
        u = auth.get_current_user(db, _make_token(user, None))
        results.append(("Token sin ver (compat) -> aceptado", u is not None and u.id == user.id))
    except HTTPException as e:
        results.append((f"Token sin ver (compat) -> aceptado (got {e.status_code})", False))
    finally:
        db.close()

    all_ok = True
    for name, ok in results:
        print(f"{'[PASS]' if ok else '[FAIL]'}  {name}")
        all_ok = all_ok and ok
    print("\n" + ("TODO OK" if all_ok else "HAY FALLAS"))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())

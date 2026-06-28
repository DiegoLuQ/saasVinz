"""
Test de aislamiento multi-tenant (Fase 2.3 del Plan de Remediación).

Verifica dos garantías:
  1. RLS filtra por tenant: con el contexto del Tenant A, una tabla
     tenant-scoped solo deja ver filas del Tenant A (nunca del Tenant B).
  2. No hay fuga de contexto en el pool: tras usar (y cerrar) una conexión
     con bypass o con un tenant —incluso si hubo una excepción— la siguiente
     sesión arranca en deny-all (bypass='false', current_tenant_id='').

Uso:  python test_rls_isolation.py
Requiere: BD con políticas RLS aplicadas y >= 2 tenants con datos.
"""
import sys
sys.path.append(r"c:\SISTEMAS-PRUEBA\SaaSCrematorio_V2\backend")

from sqlalchemy import func, text
from app.database import SessionLocal
from app import models
from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls

# Tabla tenant-scoped que usamos para medir el filtrado de RLS.
SCOPED_MODEL = models.Customer

PASS, FAIL = "[PASS]", "[FAIL]"
results = []


def _rls_state(db):
    """Lee los GUCs de RLS actuales de la sesión."""
    bypass = db.execute(text("SELECT current_setting('app.bypass_rls', true)")).scalar()
    tid = db.execute(text("SELECT current_setting('app.current_tenant_id', true)")).scalar()
    return bypass, tid


def _count_per_tenant(tenant_a, tenant_b):
    """Conteo real (en bypass) de filas por tenant para la tabla scoped."""
    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        total_a = db.query(func.count(SCOPED_MODEL.id)).filter(
            SCOPED_MODEL.tenant_id == tenant_a
        ).scalar()
        total_b = db.query(func.count(SCOPED_MODEL.id)).filter(
            SCOPED_MODEL.tenant_id == tenant_b
        ).scalar()
        return total_a, total_b
    finally:
        db.close()


def test_tenant_filtering(viewer, other, total_viewer, total_other):
    """Con el contexto de `viewer`, solo se ven sus propias filas; cero del `other`."""
    db = SessionLocal()
    try:
        apply_tenant_rls(db, viewer)
        visible_total = db.query(func.count(SCOPED_MODEL.id)).scalar()
        visible_other = db.query(func.count(SCOPED_MODEL.id)).filter(
            SCOPED_MODEL.tenant_id == other
        ).scalar()
    finally:
        db.close()

    # Concluyente solo si el otro tenant realmente tiene filas que ocultar.
    meaningful = total_other > 0
    ok = (visible_total == total_viewer) and (visible_other == 0)
    note = "" if meaningful else "  (advertencia: el otro tenant no tiene filas; comprobación débil)"
    results.append((
        f"Como tenant {viewer}: ve {visible_total} (propias={total_viewer}); "
        f"filas del tenant {other} visibles={visible_other} (debería 0){note}",
        ok,
    ))


def test_no_bypass_leak():
    """Una sesión con bypass, ya cerrada, no contamina la siguiente."""
    db = SessionLocal()
    try:
        apply_bypass_rls(db)
    finally:
        db.close()

    db2 = SessionLocal()
    try:
        bypass, tid = _rls_state(db2)
        ok = (bypass == "false" and (tid == "" or tid is None))
        results.append((f"Sin fuga de bypass al reciclar conexión (bypass={bypass!r}, tid={tid!r})", ok))
    finally:
        db2.close()


def test_no_tenant_leak_after_exception(other_tenant):
    """Tras una excepción con un tenant activo, la próxima sesión es deny-all."""
    db = SessionLocal()
    try:
        apply_tenant_rls(db, other_tenant)
        raise RuntimeError("fallo simulado a mitad de request")
    except RuntimeError:
        pass
    finally:
        db.close()

    db2 = SessionLocal()
    try:
        bypass, tid = _rls_state(db2)
        ok = (bypass == "false" and (tid == "" or tid is None))
        results.append((f"Sin fuga de tenant tras excepción (bypass={bypass!r}, tid={tid!r})", ok))
    finally:
        db2.close()


def main():
    bootstrap = SessionLocal()
    try:
        apply_bypass_rls(bootstrap)
        tenant_ids = [t[0] for t in bootstrap.query(models.Tenant.id).order_by(models.Tenant.id).all()]
    finally:
        bootstrap.close()

    if len(tenant_ids) < 2:
        print("[SKIP] Se necesitan >= 2 tenants para el test de filtrado. Encontrados:", tenant_ids)
        return 1

    tenant_a, tenant_b = tenant_ids[0], tenant_ids[1]
    total_a, total_b = _count_per_tenant(tenant_a, tenant_b)
    print(f"Tenants de prueba: A={tenant_a} ({total_a} filas), B={tenant_b} ({total_b} filas)\n")

    # Probamos en ambos sentidos. El sentido concluyente es el del tenant SIN
    # filas mirando al tenant CON filas: si RLS fallara, vería filas ajenas.
    test_tenant_filtering(tenant_a, tenant_b, total_a, total_b)
    test_tenant_filtering(tenant_b, tenant_a, total_b, total_a)
    test_no_bypass_leak()
    test_no_tenant_leak_after_exception(tenant_b)

    all_ok = True
    for name, ok in results:
        print(f"{PASS if ok else FAIL}  {name}")
        all_ok = all_ok and ok

    print("\n" + ("TODO OK" if all_ok else "HAY FALLAS"))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())

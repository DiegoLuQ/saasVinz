"""Créditos IA: un crédito por diseño, intentos reservados y devueltos, y sin doble gasto."""
import threading

import pytest
from fastapi import HTTPException

from app import models
from app.core.tenant_context import apply_bypass_rls
from app.database import SessionLocal
from app.services import ai_credits


@pytest.fixture
def template(db):
    t = models.ImageTemplate(name="Plantilla prueba créditos", supported_ratios=["1:1"], definition={"layers": []},
                             usage_count=0, is_active=True)
    db.add(t)
    db.commit()
    return t.id


def _tenant_with_extra(db, tenant_id, amount):
    tenant = db.query(models.Tenant).get(tenant_id)
    bal = ai_credits.get_balance(db, tenant, lock=True)
    bal.monthly_remaining = 0
    bal.extra_remaining = amount
    db.commit()
    return tenant


def test_un_credito_da_n_intentos_y_el_fallo_se_devuelve(db, world, template):
    tenant = _tenant_with_extra(db, world["tenant_a"], 1)
    s = ai_credits.open_session(db, tenant, template_id=template, pet_id=None, user_id=None)
    assert s.max_attempts >= 1
    assert ai_credits.get_balance(db, tenant).extra_remaining == 0

    ai_credits.reserve_attempt(db, tenant.id, s.id, template_id=template, pet_id=None)
    ai_credits.release_attempt(db, s.id)  # la generación falló: el intento vuelve
    db.refresh(s)
    assert s.attempts_used == 0

    for _ in range(s.max_attempts):
        ai_credits.reserve_attempt(db, tenant.id, s.id, template_id=template, pet_id=None)
    with pytest.raises(HTTPException) as exc:
        ai_credits.reserve_attempt(db, tenant.id, s.id, template_id=template, pet_id=None)
    assert exc.value.status_code == 409 and exc.value.detail["code"] == "credit_required"

    # El crédito es de ese diseño: otra plantilla/mascota exige uno nuevo.
    with pytest.raises(HTTPException):
        ai_credits.reserve_attempt(db, tenant.id, s.id, template_id=template, pet_id=999999)


def test_sin_creditos_responde_409(db, world, template):
    tenant = _tenant_with_extra(db, world["tenant_b"], 0)
    with pytest.raises(HTTPException) as exc:
        ai_credits.open_session(db, tenant, template_id=template, pet_id=None, user_id=None)
    assert exc.value.status_code == 409 and exc.value.detail["code"] == "no_ai_credits"


def test_dos_diseños_a_la_vez_no_gastan_doble(db, world, template):
    """Con 1 crédito y dos pedidos simultáneos, solo uno lo obtiene (bloqueo de fila)."""
    _tenant_with_extra(db, world["tenant_a"], 1)
    results = []
    barrier = threading.Barrier(2)

    def worker():
        s = SessionLocal()
        apply_bypass_rls(s)
        try:
            tenant = s.query(models.Tenant).get(world["tenant_a"])
            barrier.wait()
            ai_credits.open_session(s, tenant, template_id=template, pet_id=None, user_id=None)
            results.append("ok")
        except HTTPException as e:
            results.append(e.status_code)
        finally:
            s.close()

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)
    assert sorted(map(str, results)) == ["409", "ok"], results
    db.expire_all()
    assert ai_credits.get_balance(db, db.query(models.Tenant).get(world["tenant_a"])).extra_remaining == 0

"""Métricas del formulario oficial: solo se registra el formulario elegido como oficial,
una fila por sesión + evento, y el reporte del SuperAdmin muestra hasta dónde llegan."""
import uuid

from sqlalchemy import text

from app import models


def _set_official(db, tid, form):
    t = db.get(models.Tenant, tid)
    t.official_links = {"form": form} if form else None
    db.commit()


def _ev(client, sid, kind, detail=None, form=None):
    return client.post("/api/public/tenant/crematorio-a/form-events",
                       json={"session_id": sid, "kind": kind, "detail": detail, "form": form})


def _count(db, tid, sid=None):
    q = "SELECT count(*) FROM web_form_events WHERE tenant_id = :t" + (" AND session_id = :s" if sid else "")
    return db.execute(text(q), {"t": tid, "s": sid}).scalar()


def test_solo_el_formulario_oficial(client, db, world):
    tid = world["tenant_a"]
    sid = uuid.uuid4().hex
    _set_official(db, tid, None)
    assert client.get("/api/public/tenant/crematorio-a").json()["track_form"] is False
    assert _ev(client, sid, "open").status_code == 204
    assert _count(db, tid, sid) == 0                       # sin formulario oficial no se mide

    _set_official(db, tid, "main")
    assert client.get("/api/public/tenant/crematorio-a").json()["track_form"] is True
    assert client.get("/api/public/tenant/crematorio-a?form=otro-que-no-existe").json()["track_form"] is True  # cae al principal
    _ev(client, sid, "open")
    _ev(client, sid, "open")                               # recargar no duplica
    _ev(client, sid, "step_view", "familia")
    _ev(client, sid, "step_view", "inventado")             # paso inválido → ignorado
    _ev(client, sid, "hack")                               # evento inválido → ignorado
    _ev(client, "corto", "open")                           # sesión inválida → ignorada
    assert _count(db, tid, sid) == 2


def test_reporte_hasta_donde_llegan(client, db, world, auth):
    tid = world["tenant_a"]
    _set_official(db, tid, "main")
    a, b, c = (uuid.uuid4().hex for _ in range(3))
    for sid in (a, b, c):
        _ev(client, sid, "open")
        _ev(client, sid, "step_view", "familia")
    _ev(client, a, "field_error", "phone")
    for sid in (a, b):
        _ev(client, sid, "step_view", "angel")
        _ev(client, sid, "size_select")
    _ev(client, a, "step_view", "resumen")
    _ev(client, a, "submit_click")
    _ev(client, a, "submitted")

    url = f"/api/internal/creator/catalog-funnel/form?tenant_id={tid}"
    assert client.get(url, headers=auth("a")).status_code in (401, 403)
    r = client.get(url, headers=auth("creator"))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["sessions"] >= 3 and d["submitted"] >= 1
    steps = {s["key"]: s for s in d["steps"]}
    assert steps["familia"]["sessions"] >= 3 and steps["angel"]["sessions"] >= 2
    assert "camino" not in steps                           # paso que no se usó no aparece
    assert any(x["key"] == "familia" for x in d["abandon"])  # c se quedó en Familia
    assert any(e["field"] == "phone" and e["label"] == "Teléfono" for e in d["field_errors"])
    assert next(x for x in d["clicks"] if x["kind"] == "size_select")["sessions"] >= 2
    row = next(t for t in d["by_tenant"] if t["tenant_id"] == tid)
    assert row["form_name"] == "Formulario principal"

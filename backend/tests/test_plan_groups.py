"""Grupos de planes (srv_plans.group_name) y grupos que muestra cada enlace del
catálogo de planes (inv_catalog_tokens.plan_groups)."""
import uuid

import pytest

from app import models
from app.api.internal.catalog.models import CatalogShareToken


@pytest.fixture
def planes(client, auth, db, world):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    ids = {}
    for key, group in (("perro", f"Perros {tag}"), ("gato", f"Gatos {tag}"), ("suelto", None)):
        r = client.post("/api/internal/plans", headers=h, json={
            "name": f"Plan {key} {tag}", "price": 50000, "group_name": group,
        })
        assert r.status_code == 200, r.text
        ids[key] = r.json()["id"]
    yield {"h": h, "tag": tag, "ids": ids}
    db.rollback()
    db.query(CatalogShareToken).filter(CatalogShareToken.name == f"t{tag}").delete()
    db.query(models.Plan).filter(models.Plan.id.in_(ids.values())).delete(synchronize_session=False)
    db.commit()


def _catalogo(client, h, tag, plan_groups):
    link = client.post("/api/internal/catalog/links", headers=h,
                       json={"catalog_type": "plans", "name": f"t{tag}", "plan_groups": plan_groups})
    assert link.status_code == 201, link.text
    return link.json()


def _planes_publicos(client, token, tag):
    body = client.get(f"/api/public/catalog/crematorio-a/{token}").json()
    return sorted(p["name"].split()[1] for p in body["plans"] if p["name"].endswith(tag))


def test_enlace_filtra_por_grupo(client, planes):
    h, tag = planes["h"], planes["tag"]
    todos = _catalogo(client, h, tag, None)
    assert todos["plan_groups"] is None
    assert _planes_publicos(client, todos["token"], tag) == ["gato", "perro", "suelto"]

    perros = _catalogo(client, h, tag, [f"perros {tag}", ""])  # sin mayúsculas + «Sin grupo»
    assert _planes_publicos(client, perros["token"], tag) == ["perro", "suelto"]

    r = client.patch(f"/api/internal/catalog/links/{perros['id']}/plan-groups", headers=h,
                     json={"plan_groups": [f"Gatos {tag}"]})
    assert r.status_code == 200, r.text
    assert _planes_publicos(client, perros["token"], tag) == ["gato"]

    r = client.patch(f"/api/internal/catalog/links/{perros['id']}/plan-groups", headers=h, json={"plan_groups": []})
    assert r.json()["plan_groups"] is None  # vacío = todos


def test_renombrar_grupo_actualiza_planes_y_enlaces(client, planes, db):
    h, tag = planes["h"], planes["tag"]
    link = _catalogo(client, h, tag, [f"Perros {tag}"])
    assert f"Perros {tag}" in client.get("/api/internal/plans/groups", headers=h).json()
    r = client.put("/api/internal/plans/groups/rename", headers=h,
                   json={"old_name": f"Perros {tag}", "new_name": f"Caninos {tag}"})
    assert r.status_code == 200, r.text
    plan = client.get(f"/api/internal/plans/{planes['ids']['perro']}", headers=h).json()
    assert plan["group_name"] == f"Caninos {tag}"
    assert _planes_publicos(client, link["token"], tag) == ["perro"]


def test_otro_crematorio_no_toca_el_enlace(client, auth, planes):
    link = _catalogo(client, planes["h"], planes["tag"], None)
    r = client.patch(f"/api/internal/catalog/links/{link['id']}/plan-groups", headers=auth("b"),
                     json={"plan_groups": ["X"]})
    assert r.status_code == 404

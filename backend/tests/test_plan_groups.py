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


def test_enlace_filtra_por_grupo(client, planes, db):
    h, tag = planes["h"], planes["tag"]
    # Enlace antiguo sin grupos (NULL) = muestra todos
    todos = _catalogo(client, h, tag, [f"Perros {tag}"])
    db.query(CatalogShareToken).filter(CatalogShareToken.id == todos["id"]).update({CatalogShareToken.plan_groups: None})
    db.commit()
    assert _planes_publicos(client, todos["token"], tag) == ["gato", "perro", "suelto"]

    perros = _catalogo(client, h, tag, [f"perros {tag}", ""])  # sin mayúsculas + «Sin grupo»
    assert _planes_publicos(client, perros["token"], tag) == ["perro", "suelto"]

    r = client.patch(f"/api/internal/catalog/links/{perros['id']}/plan-groups", headers=h,
                     json={"plan_groups": [f"Gatos {tag}"]})
    assert r.status_code == 200, r.text
    assert _planes_publicos(client, perros["token"], tag) == ["gato"]



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
    link = _catalogo(client, planes["h"], planes["tag"], [f"Perros {planes['tag']}"])
    r = client.patch(f"/api/internal/catalog/links/{link['id']}/plan-groups", headers=auth("b"),
                     json={"plan_groups": ["X"]})
    assert r.status_code == 404


def test_nombre_repetido_en_otro_grupo_y_destacado_por_grupo(client, planes, db):
    h, tag = planes["h"], planes["tag"]
    # Mismo nombre que «Plan perro» pero en el grupo Gatos: permitido
    r = client.post("/api/internal/plans", headers=h, json={
        "name": f"Plan perro {tag}", "price": 1, "group_name": f"Gatos {tag}", "is_featured": True})
    assert r.status_code == 200, r.text
    otro = r.json()["id"]
    planes["ids"]["copia"] = otro
    # Mismo nombre y grupo (sin mayúsculas): rechazado
    r = client.post("/api/internal/plans", headers=h, json={
        "name": f"PLAN PERRO {tag}", "price": 1, "group_name": f"perros {tag}"})
    assert r.status_code == 400
    # Destacar el plan de Perros no desmarca el destacado de Gatos
    r = client.patch(f"/api/internal/plans/{planes['ids']['perro']}", headers=h, json={"is_featured": True})
    assert r.status_code == 200, r.text
    db.expire_all()
    assert db.query(models.Plan).get(otro).is_featured is True
    # Pero otro destacado en Gatos sí lo desmarca
    client.patch(f"/api/internal/plans/{planes['ids']['gato']}", headers=h, json={"is_featured": True})
    db.expire_all()
    assert db.query(models.Plan).get(otro).is_featured is False


def test_enlace_nuevo_exige_grupo_si_hay_grupos(client, planes):
    h, tag = planes["h"], planes["tag"]
    r = client.post("/api/internal/catalog/links", headers=h, json={"catalog_type": "plans", "name": f"t{tag}"})
    assert r.status_code == 400
    link = _catalogo(client, h, tag, [f"Perros {tag}"])
    r = client.patch(f"/api/internal/catalog/links/{link['id']}/plan-groups", headers=h, json={"plan_groups": []})
    assert r.status_code == 400


def test_imagenes_reutilizables(client, auth, planes, db, world):
    from app.api.internal.common.models import MediaLibrary
    h = planes["h"]
    url = f"https://example.test/plan_{planes['tag']}.webp"
    media = MediaLibrary(tenant_id=world["tenant_a"], url=url, media_type="image", category="plans", ratio="1:1")
    db.add(media)
    db.commit()
    try:
        client.patch(f"/api/internal/plans/{planes['ids']['perro']}", headers=h, json={"image_url": url})
        client.patch(f"/api/internal/plans/{planes['ids']['gato']}", headers=h, json={"image_url": url})
        imgs = {i["id"]: i for i in client.get("/api/internal/plans/images", headers=h).json()}
        assert len(imgs[media.id]["used_by_plans"]) == 2
        # Cambiar la imagen de un plan no borra la que sigue usando el otro
        client.patch(f"/api/internal/plans/{planes['ids']['perro']}", headers=h, json={"image_url": None})
        assert media.id in {i["id"] for i in client.get("/api/internal/plans/images", headers=h).json()}
        # En uso: no se puede eliminar; otro crematorio no la ve
        assert client.delete(f"/api/internal/plans/images/{media.id}", headers=h).status_code == 409
        assert client.delete(f"/api/internal/plans/images/{media.id}", headers=auth("b")).status_code == 404
        assert media.id not in {i["id"] for i in client.get("/api/internal/plans/images", headers=auth("b")).json()}
    finally:
        db.rollback()
        db.query(models.Plan).filter(models.Plan.image_url == url).update({models.Plan.image_url: None})
        db.query(MediaLibrary).filter(MediaLibrary.id == media.id).delete()
        db.commit()

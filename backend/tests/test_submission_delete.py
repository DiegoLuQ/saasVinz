"""Eliminar una solicitud web la manda a Eliminados (datos y fotos intactos,
fuera de la bandeja y de la campana) y se puede restaurar. El borrado
definitivo, solo desde Eliminados, borra el registro y las fotos que nadie
más usa (la mascota creada al procesarla conserva las suyas)."""
import uuid

import pytest

from app import models
from app.api.internal.common.media_service import MediaService


@pytest.fixture
def deleted_urls(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(MediaService, "delete_media_by_url", classmethod(lambda cls, db, url: calls.append(url) or True))
    return calls


def _sub(db, tenant_id, images, **kw):
    sub = models.FormSubmission(
        tenant_id=tenant_id, slug="crematorio-a",
        owner_data={"name": "Familia Test", "phone": "+56900000000"},
        pet_data={"name": "Tobi", "species": "Canino"}, selected_services=[], images=images, **kw,
    )
    db.add(sub)
    db.flush()
    return sub


def _bell(db, sid):
    return [n for n in db.query(models.Notification).filter(models.Notification.type == "new_submission").all()
            if isinstance(n.data, dict) and n.data.get("submission_id") == sid]


def _ids(client, h, **params):
    r = client.get("/api/internal/submissions", headers=h, params=params)
    assert r.status_code == 200, r.text
    return {s["id"] for s in r.json()}


def test_eliminar_va_a_eliminados_y_se_restaura(client, auth, db, world, deleted_urls):
    h = auth("a")
    tag = uuid.uuid4().hex[:8]
    urls = [f"https://cdn.test/sub-{tag}/a.webp", f"https://cdn.test/sub-{tag}/b.webp"]
    sub = _sub(db, world["tenant_a"], urls)
    db.add(models.Notification(tenant_id=world["tenant_a"], type="new_submission", title="Nuevo registro",
                               message="x", data={"submission_id": sub.id}))
    db.commit()
    sid = sub.id
    assert sid in _ids(client, h)

    r = client.delete(f"/api/internal/submissions/{sid}", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "deleted", r.text
    assert deleted_urls == []                       # las fotos no se tocan
    db.expire_all()
    got = db.query(models.FormSubmission).get(sid)
    assert got.status == "deleted" and got.deleted_at and got.deleted_by == world["admin_a"]
    assert got.images == urls and got.pet_data["name"] == "Tobi"
    assert not _bell(db, sid)
    assert sid not in _ids(client, h) and sid in _ids(client, h, status="deleted")

    # En Eliminados no se procesa ni aparece en el detalle como pendiente
    assert client.post(f"/api/internal/submissions/{sid}/create-customer", headers=h).status_code == 409
    assert client.get(f"/api/internal/submissions/{sid}", headers=h).json()["status"] == "deleted"

    r = client.post(f"/api/internal/submissions/{sid}/restore", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "pending", r.text
    assert sid in _ids(client, h) and sid not in _ids(client, h, status="deleted")
    assert client.post(f"/api/internal/submissions/{sid}/restore", headers=h).status_code == 409


def test_borrado_definitivo_solo_desde_eliminados(client, auth, db, world, deleted_urls):
    h = auth("a")
    tag = uuid.uuid4().hex[:8]
    urls = [f"https://cdn.test/sub-{tag}/a.webp", f"https://cdn.test/sub-{tag}/b.webp"]
    sub = _sub(db, world["tenant_a"], urls)
    db.commit()
    sid = sub.id

    assert client.delete(f"/api/internal/submissions/{sid}?permanent=true", headers=h).status_code == 409
    client.delete(f"/api/internal/submissions/{sid}", headers=h)
    r = client.delete(f"/api/internal/submissions/{sid}?permanent=true", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["photos_deleted"] == 2 and sorted(deleted_urls) == sorted(urls)
    db.expire_all()
    assert db.query(models.FormSubmission).get(sid) is None


def test_procesado_restaurado_vuelve_a_procesado(client, auth, db, world, deleted_urls):
    h = auth("a")
    tag = uuid.uuid4().hex[:8]
    shared, own = f"https://cdn.test/sub-{tag}/foto-mascota.webp", f"https://cdn.test/sub-{tag}/extra.webp"
    customer = models.Customer(tenant_id=world["tenant_a"], name="Familia Test", phone="+56900000000")
    db.add(customer)
    db.flush()
    pet = models.Pet(tenant_id=world["tenant_a"], customer_id=customer.id, name="Tobi", species="Canino",
                     image_url=shared, images=[shared])
    db.add(pet)
    db.flush()
    db.add(models.Cremation(tenant_id=world["tenant_a"], pet_id=pet.id, status="pendiente"))
    sub = _sub(db, world["tenant_a"], [shared, own], pet_id=pet.id, customer_id=customer.id, status="processed")
    db.commit()
    sid, pid = sub.id, pet.id

    client.delete(f"/api/internal/submissions/{sid}", headers=h)
    assert client.post(f"/api/internal/submissions/{sid}/restore", headers=h).json()["status"] == "processed"

    # Borrado definitivo: la foto que usa la mascota se conserva
    client.delete(f"/api/internal/submissions/{sid}", headers=h)
    r = client.delete(f"/api/internal/submissions/{sid}?permanent=true", headers=h)
    assert r.status_code == 200 and r.json()["photos_kept_shared"] == 1, r.text
    assert deleted_urls == [own]
    db.expire_all()
    assert db.query(models.Pet).get(pid) is not None


def test_borrar_desde_la_campana_tambien_va_a_eliminados(client, auth, db, world, deleted_urls):
    sub = _sub(db, world["tenant_a"], ["https://cdn.test/campana.webp"])
    n = models.Notification(tenant_id=world["tenant_a"], type="new_submission", title="Nuevo registro",
                            message="x", data={"submission_id": sub.id})
    db.add(n)
    db.commit()
    sid, nid = sub.id, n.id
    r = client.delete(f"/api/internal/notifications/{nid}", headers=auth("a"))
    assert r.status_code == 200, r.text
    db.expire_all()
    assert db.query(models.FormSubmission).get(sid).status == "deleted"
    assert deleted_urls == []


def test_otro_crematorio_no_puede_eliminar(client, auth, db, world, deleted_urls):
    sub = _sub(db, world["tenant_a"], ["https://cdn.test/ajeno.webp"])
    db.commit()
    assert client.delete(f"/api/internal/submissions/{sub.id}", headers=auth("b")).status_code == 404
    assert client.post(f"/api/internal/submissions/{sub.id}/restore", headers=auth("b")).status_code == 404
    db.expire_all()
    assert db.query(models.FormSubmission).get(sub.id).status == "pending"

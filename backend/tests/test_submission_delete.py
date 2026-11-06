"""Eliminar una solicitud web borra el registro, su aviso y sus fotos en la nube,
salvo las que ya usa otra cosa (la mascota creada al procesarla)."""
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


def test_eliminar_registro_borra_fotos_y_aviso(client, auth, db, world, deleted_urls):
    tag = uuid.uuid4().hex[:8]
    urls = [f"https://cdn.test/sub-{tag}/a.webp", f"https://cdn.test/sub-{tag}/b.webp"]
    sub = _sub(db, world["tenant_a"], urls)
    db.add(models.Notification(tenant_id=world["tenant_a"], type="new_submission", title="Nuevo registro",
                               message="x", data={"submission_id": sub.id}))
    db.commit()
    sid = sub.id

    r = client.delete(f"/api/internal/submissions/{sid}", headers=auth("a"))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["photos"] == 2 and body["photos_deleted"] == 2
    assert sorted(deleted_urls) == sorted(urls)

    db.expire_all()
    assert db.query(models.FormSubmission).get(sid) is None
    assert not [n for n in db.query(models.Notification).filter(models.Notification.type == "new_submission").all()
                if isinstance(n.data, dict) and n.data.get("submission_id") == sid]


def test_registro_procesado_conserva_fotos_de_la_mascota(client, auth, db, world, deleted_urls):
    tag = uuid.uuid4().hex[:8]
    shared, own = f"https://cdn.test/sub-{tag}/foto-mascota.webp", f"https://cdn.test/sub-{tag}/extra.webp"
    customer = models.Customer(tenant_id=world["tenant_a"], name="Familia Test", phone="+56900000000")
    db.add(customer)
    db.flush()
    pet = models.Pet(tenant_id=world["tenant_a"], customer_id=customer.id, name="Tobi", species="Canino",
                     image_url=shared, images=[shared])
    db.add(pet)
    db.flush()
    sub = _sub(db, world["tenant_a"], [shared, own], pet_id=pet.id, customer_id=customer.id, status="processed")
    db.commit()
    sid, pid = sub.id, pet.id

    r = client.delete(f"/api/internal/submissions/{sid}", headers=auth("a"))
    assert r.status_code == 200, r.text
    assert r.json()["photos_kept_shared"] == 1
    assert deleted_urls == [own]

    db.expire_all()
    assert db.query(models.FormSubmission).get(sid) is None
    assert db.query(models.Pet).get(pid) is not None


def test_otro_crematorio_no_puede_eliminar(client, auth, db, world, deleted_urls):
    sub = _sub(db, world["tenant_a"], ["https://cdn.test/ajeno.webp"])
    db.commit()
    r = client.delete(f"/api/internal/submissions/{sub.id}", headers=auth("b"))
    assert r.status_code == 404
    assert deleted_urls == []

"""Servicio especial con «Precio a cotizar» y nota importante: se guarda sin precio,
se publica en el formulario, queda como constancia en la solicitud y va en el correo."""
import asyncio
import uuid

from app import models


NOTE = "Lo realiza un tercero; el valor se informa antes de realizarlo."


def _create(client, auth, **extra):
    body = {"name": f"Exhumación {uuid.uuid4().hex[:6]}", "price": 45000, "cost": 0, "is_special": True,
            "price_on_request": True, "important_note": f"  {NOTE}  ", **extra}
    r = client.post("/api/internal/services", json=body, headers=auth("a"))
    assert r.status_code == 200, r.text
    return r.json()


def test_se_guarda_sin_precio_y_con_nota(client, auth):
    s = _create(client, auth)
    assert s["price_on_request"] is True and s["price"] == 0
    assert s["important_note"] == NOTE

    # Quitar «a cotizar» permite volver a poner precio
    r = client.patch(f"/api/internal/services/{s['id']}", json={"price_on_request": False, "price": 30000}, headers=auth("a"))
    assert r.status_code == 200 and r.json()["price"] == 30000


def test_formulario_publico_recibe_la_marca_y_la_nota(client, auth, db, world):
    s = _create(client, auth)
    slug = db.query(models.Tenant).get(world["tenant_a"]).slug
    items = client.get(f"/api/public/tenant/{slug}/services").json()
    item = next(i for i in items if i["id"] == f"svc_{s['id']}")
    assert item["price_on_request"] is True and item["important_note"] == NOTE and item["price"] == 0


def test_correo_a_la_familia_lleva_la_nota(sent_emails, world):
    from app.services.form_submission_notifications import send_submission_notifications

    asyncio.run(send_submission_notifications(
        tenant_id=world["tenant_a"], submission_id=1, submission_code="TEST123",
        owner_dict={"fullName": "Familia Nota", "email": "familia@vinzer-pruebas.cl"},
        pet_dict={"name": "Copito"},
        enriched_services=[{"type": "service", "id": 1, "name": "Exhumación", "price": 0.0,
                            "price_on_request": True, "important_note": NOTE}],
    ))
    family = next(m for m in sent_emails if "familia@vinzer-pruebas.cl" in str(m.recipients))
    html = str(family.body)
    assert NOTE in html and "precio a cotizar" in html

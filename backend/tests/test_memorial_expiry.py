"""Fase 3 de planes de memorial: vencimiento.
- Vencido: sigue en línea con vista reducida (pocas fotos y mensajes), sin mensajes nuevos; nada se borra.
- Aviso por correo 1 mes antes, una sola vez por vigencia.
- Renovación desde Admin: +1 año al precio congelado; vuelve todo."""
import asyncio
from datetime import datetime, timedelta

from app.api.internal.memorials import models as mem_models
from app.services import memorial_expiry, memorial_plans
from tests.test_memorial_phase2 import _vinzer_memorial


def _fill(db, m, n_img=6, n_ded=8):
    m.lista_imagenes = [f"https://cdn.test/foto-{i}.webp" for i in range(n_img)]
    m.main_image_url = m.lista_imagenes[2]
    for i in range(n_ded):
        db.add(mem_models.Dedication(id_recuerdo=m.id, mensajero=f"Persona {i}", mensaje=f"Mensaje {i}",
                                     estado=mem_models.DedicationStatus.aprobado,
                                     fecha=datetime.now() - timedelta(days=n_ded - i)))
    db.commit()


def test_vencido_muestra_vista_reducida_y_no_recibe_mensajes(client, world, auth, db):
    m, pin = _vinzer_memorial(client, auth, db, plan="recuerdo", pet="Vence")
    _fill(db, m)
    url = f"/api/internal/memorials/{m.id_recuerdo}"
    full = client.get(url).json()
    assert full["expired"] is False and len(full["lista_imagenes"]) == 6 and len(full["dedicatorias"]) == 8

    m.valid_until = datetime.now() - timedelta(days=1)
    db.commit()
    feats = memorial_plans.features_of(memorial_plans.plan_of(db, m))
    red = client.get(url).json()
    assert red["expired"] is True and red["status"] == "expired"
    assert len(red["lista_imagenes"]) == feats["expired_images"]
    assert red["lista_imagenes"][0] == m.main_image_url  # la foto principal siempre se ve
    assert len(red["dedicatorias"]) == feats["expired_dedications"]
    assert red["dedicatorias"][0]["mensaje"] == "Mensaje 7"  # los más recientes
    assert red["tenant_info"] or red.get("tenant")
    # sin mensajes nuevos mientras está vencido
    assert client.post(f"{url}/dedicatorias", json={"mensajero": "Ana", "mensaje": "hola"}).status_code == 400
    # nada se borró
    db.expire_all()
    assert db.query(mem_models.Dedication).filter(mem_models.Dedication.id_recuerdo == m.id).count() == 8
    # la gestión sabe que está vencido
    assert client.get(f"{url}/manage", headers={"access-key": pin}).json()["expired"] is True

    # renovar desde Admin: +1 año desde hoy, mismo precio congelado, vuelve todo
    assert client.post(f"/api/internal/creator/memorials/{m.id}/renew?notify=false").status_code in (401, 403)
    r = client.post(f"/api/internal/creator/memorials/{m.id}/renew?notify=false", headers=auth("creator"))
    assert r.status_code == 200, r.text
    assert r.json()["plan_price"] == 39
    db.expire_all()
    m = db.query(mem_models.Memorial).get(m.id)
    assert m.status == mem_models.MemorialStatus.active and m.valid_until > datetime.now() + timedelta(days=360)
    again = client.get(url).json()
    assert again["expired"] is False and len(again["lista_imagenes"]) == 6 and len(again["dedicatorias"]) == 8


def test_pago_unico_no_vence(client, world, auth, db):
    m, _ = _vinzer_memorial(client, auth, db, plan="infinito", pet="Siempre")
    assert m.valid_until is None and memorial_expiry.is_expired(m) is False
    r = client.post(f"/api/internal/creator/memorials/{m.id}/renew", headers=auth("creator"))
    assert r.status_code == 400


def test_aviso_un_mes_antes_una_sola_vez(client, world, auth, db, sent_emails):
    m, _ = _vinzer_memorial(client, auth, db, plan="eterno", pet="Avisame")
    m.valid_until = datetime.now() + timedelta(days=20)
    m.expiry_notice_for = None
    db.commit()
    sent_emails.clear()
    asyncio.run(memorial_expiry.send_expiry_notices(db))
    db.expire_all()
    m = db.query(mem_models.Memorial).get(m.id)
    assert m.expiry_notice_for == m.valid_until
    mine = [e for e in sent_emails if "Avisame" in (e.subject or "")]
    assert len(mine) == 1
    # segunda pasada: no repite
    asyncio.run(memorial_expiry.send_expiry_notices(db))
    assert len([e for e in sent_emails if "Avisame" in (e.subject or "")]) == 1
    # al renovar se limpia el aviso y la próxima vigencia vuelve a avisar
    r = client.post(f"/api/internal/creator/memorials/{m.id}/renew?notify=false", headers=auth("creator"))
    assert r.status_code == 200
    db.expire_all()
    m = db.query(mem_models.Memorial).get(m.id)
    assert m.expiry_notice_for is None and m.valid_until > datetime.now() + timedelta(days=380)

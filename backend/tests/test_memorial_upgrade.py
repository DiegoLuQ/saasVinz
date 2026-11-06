"""Fase 6 de planes de memorial: un memorial de cortesía (Partner) sube a un plan Vinzer."""
from datetime import datetime, timedelta

from app.api.internal.common.models import Notification
from app.api.internal.memorials import models as mem_models
from app.services import memorial_plans
from tests.test_memorial_phase2 import _vinzer_memorial


def _partner(client, auth, db, pet):
    m, pin = _vinzer_memorial(client, auth, db, plan="recuerdo", pet=pet)
    memorial_plans.assign(m, memorial_plans.partner_plan(db), start_period=False)
    m.valid_until = None
    db.commit()
    return m, pin


def test_partner_pide_mejora_y_admin_la_aplica(client, world, auth, db, sent_emails):
    m, pin = _partner(client, auth, db, "Cortesia")
    h = {"access-key": pin}
    man = client.get(f"/api/internal/memorials/{m.id_recuerdo}/manage", headers=h).json()
    assert man["is_vinzer_plan"] is False

    url = f"/api/internal/memorials/{m.id_recuerdo}/manage/upgrade-request"
    assert client.post(url, json={"plan": "eterno"}).status_code == 401
    assert client.post(url, json={"plan": "ultra"}, headers=h).status_code == 400
    r = client.post(url, json={"plan": "eterno"}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["plan"].lower() == "eterno" and r.json()["duplicated"] is False
    # repetir el mismo pedido no duplica el aviso
    assert client.post(url, json={"plan": "eterno"}, headers=h).json()["duplicated"] is True
    db.expire_all()
    notes = [n for n in db.query(Notification).filter(Notification.type == "memorial_upgrade").all()
             if (n.data or {}).get("memorial_id") == m.id]
    assert len(notes) == 1
    assert any("Mejora de memorial" in (e.subject or "") for e in sent_emails)

    # el SuperAdmin cambia el plan: precio congelado, vigencia desde hoy, correo a la familia
    sent_emails.clear()
    r = client.patch(f"/api/internal/creator/memorials/{m.id}", json={"plan": "eterno"}, headers=auth("creator"))
    assert r.status_code == 200, r.text
    db.expire_all()
    m = db.query(mem_models.Memorial).get(m.id)
    assert m.plan_price == 79 and m.plan_billing == "yearly"
    assert m.valid_until and m.valid_until > datetime.now() + timedelta(days=360)
    assert any("ahora es Plan" in (e.subject or "") for e in sent_emails)
    man = client.get(f"/api/internal/memorials/{m.id_recuerdo}/manage", headers=h).json()
    assert man["is_vinzer_plan"] is True and man["plan_features"]["timeline"] is True


def test_no_se_pide_un_plan_igual_o_menor(client, world, auth, db):
    m, pin = _vinzer_memorial(client, auth, db, plan="eterno", pet="YaEterno")
    url = f"/api/internal/memorials/{m.id_recuerdo}/manage/upgrade-request"
    assert client.post(url, json={"plan": "recuerdo"}, headers={"access-key": pin}).status_code == 400
    assert client.post(url, json={"plan": "infinito"}, headers={"access-key": pin}).status_code == 200

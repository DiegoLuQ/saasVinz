"""Gestos del memorial («beso al cielo», velas…): se registran y NO envían correo a la familia
(decisión 2026-11-05: un correo por gesto cargaba el servidor). Tampoco las dedicatorias nuevas."""
from app.api.internal.memorials import models as mem_models


def test_gestos_y_dedicatorias_sin_correo(client, auth, db, sent_emails):
    h = auth("a")
    c = client.post("/api/internal/customers", headers=h,
                    json={"name": "Familia Besos", "email": "besos@example.com"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": "Nube", "species": "Gato", "customer_id": c["id"]}).json()
    r = client.post("/api/internal/memorials", headers=h, json={"id_mascota": p["id"], "msg_despedida": "Vuela alto"})
    assert r.status_code == 200, r.text
    uuid = r.json()["id_recuerdo"]
    try:
        sent_emails.clear()
        for kind in ("beso", "beso", "vela"):
            res = client.post(f"/api/internal/memorials/{uuid}/rituals", json={"kind": kind})
            assert res.status_code == 200, res.text
        counts = res.json()["counts"]
        assert counts["beso"] == 2 and counts["vela"] == 1
        d = client.post(f"/api/internal/memorials/{uuid}/dedicatorias", json={"mensajero": "Ana", "mensaje": "Te queremos"})
        assert d.status_code == 200, d.text
        assert sent_emails == []
        n = db.query(mem_models.Ritual).join(mem_models.Memorial).filter(
            mem_models.Memorial.id_recuerdo == uuid).count()
        assert n == 3
    finally:
        client.delete(f"/api/internal/pets/{p['id']}", headers=h)

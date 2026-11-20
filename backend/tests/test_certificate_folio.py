"""Folio automático del certificado (services/cert_folio.py): uno por crematorio,
correlativo desde el número que fija el crematorio, se mantiene al volver a emitir,
la vista previa no lo consume y se puede corregir al emitir."""
import re
import uuid

from app import models

GEN = "/api/internal/ops-records/generate"


def _order(client, h, tag, n):
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Ana {tag}{n}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Toby {tag}{n}", "species": "Canino", "customer_id": c["id"]}).json()
    return client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente"}).json()["id"]


def _folio(client, h, oid, tpl, persist=True, overrides=None):
    r = client.post(GEN, headers=h, json={"cremation_id": oid, "template_id": tpl, "persist": persist,
                                          "image_overrides": overrides or {}})
    assert r.status_code == 200, r.text
    return r.json()["metadata"]["folio"]


def test_folio_correlativo_y_aleatorio(client, auth, db, world):
    h = auth("a")
    tid = world["tenant_a"]
    tag = uuid.uuid4().hex[:5]
    tenant = db.get(models.Tenant, tid)
    plan = tenant.effective_plan
    old_features, old_next = dict(plan.features or {}), tenant.cert_folio_next
    plan.features = {**old_features, "certificados:generar_pdf": True}
    seq = models.CertificateTemplate(tenant_id=tid, name=f"Folio {tag}", category="certificadoImg", theme="Clásico",
                                     sections_config={"aspect_ratio": "16:9", "fields": [
                                         {"id": "fo", "type": "folio", "folio_mode": "sequence",
                                          "folio_format": "{n}/{año}", "x": 80, "y": 20}]})
    rnd = models.CertificateTemplate(tenant_id=tid, name=f"Folio R {tag}", category="certificadoImg", theme="Clásico",
                                     sections_config={"aspect_ratio": "16:9", "fields": [
                                         {"id": "fr", "type": "folio", "folio_mode": "random", "folio_length": 6, "x": 80, "y": 20}]})
    db.add_all([seq, rnd])
    db.commit()
    try:
        # El crematorio fija su número de partida (solo admin)
        assert client.put("/api/internal/ops-records/folio", headers=h, json={"next": 250}).status_code == 200
        assert client.get("/api/internal/ops-records/folio", headers=h).json()["next"] == 250
        assert client.put("/api/internal/ops-records/folio", headers=h, json={"next": 0}).status_code == 422

        o1, o2, o3 = (_order(client, h, tag, i) for i in range(3))
        year = str(__import__("datetime").date.today().year)
        # Vista previa: muestra el próximo sin consumirlo
        assert _folio(client, h, o1, seq.id, persist=False) == f"250/{year}"
        assert _folio(client, h, o1, seq.id, persist=False) == f"250/{year}"
        assert _folio(client, h, o1, seq.id) == f"250/{year}"
        assert _folio(client, h, o2, seq.id) == f"251/{year}"
        # Volver a emitir la misma orden mantiene su folio
        assert _folio(client, h, o1, seq.id) == f"250/{year}"
        assert client.get("/api/internal/ops-records/folio", headers=h).json()["next"] == 252
        # Corregido al emitir: se guarda ese texto y no consume número
        assert _folio(client, h, o2, seq.id, overrides={"fo": {"value": "  300/2026 "}}) == "300/2026"
        assert _folio(client, h, o2, seq.id) == "300/2026"
        assert client.get("/api/internal/ops-records/folio", headers=h).json()["next"] == 252
        # Otro crematorio tiene su propio contador
        tb = db.get(models.Tenant, world["tenant_b"])
        db.refresh(tb)
        assert client.get("/api/internal/ops-records/folio", headers=auth("b")).json()["next"] == (tb.cert_folio_next or 1)

        # Aleatorio: 6 caracteres sin los que se confunden, se mantiene al reemitir
        f3 = _folio(client, h, o3, rnd.id)
        assert re.fullmatch(r"[A-HJKMNP-Z2-9]{6}", f3)
        assert _folio(client, h, o3, rnd.id) == f3

        # Buscable en el Repositorio y visible en «Ver datos»
        m = client.get("/api/internal/ops-records/certificates/search", headers=h, params={"q": "300/2026"}).json()["matches"]
        assert m
        cert = db.query(models.Certificate).filter(models.Certificate.cremation_id == o1).first()
        d = client.get(f"/api/internal/ops-records/certificates/{cert.id}/data", headers=h).json()
        assert d["folio"] == f"250/{year}" and any(f["type"] == "folio" for f in d["data"]["fields"])
    finally:
        db.rollback()
        db.query(models.Certificate).filter(models.Certificate.tenant_id == tid,
                                            models.Certificate.folio.isnot(None)).delete(synchronize_session=False)
        db.query(models.CertificateTemplate).filter(models.CertificateTemplate.id.in_([seq.id, rnd.id])).delete(synchronize_session=False)
        t = db.get(models.Tenant, tid)
        t.cert_folio_next = old_next
        db.get(models.SubscriptionPlan, plan.id).features = old_features
        db.commit()

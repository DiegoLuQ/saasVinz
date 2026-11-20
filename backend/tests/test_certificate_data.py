"""«Ver datos» del Repositorio: el certificado guarda con qué se emitió
(diseño, mascota, dueño y cada campo impreso, con el origen de los textos con código)."""
import uuid

from app import models


def test_certificado_guarda_sus_datos(client, auth, db, world):
    h = auth("a")
    tid = world["tenant_a"]
    tag = uuid.uuid4().hex[:6]
    plan = db.get(models.Tenant, tid).effective_plan
    old_features = dict(plan.features or {})
    plan.features = {**old_features, "certificados:generar_pdf": True}
    tenant = db.get(models.Tenant, tid)
    old_texts = tenant.cert_text_values
    tenant.cert_text_values = {"FRASE": "Siempre contigo"}
    tpl = models.CertificateTemplate(
        tenant_id=tid, name=f"Diseño {tag}", category="certificadoImg", theme="Clásico",
        sections_config={"aspect_ratio": "16:9", "fields": [
            {"id": "f1", "type": "nombre_mascota", "x": 50, "y": 20},
            {"id": "f2", "type": "texto_fijo", "code": "FRASE", "value": "Texto del diseño", "x": 50, "y": 50},
            {"id": "f3", "type": "texto_fijo", "value": "Sin código", "x": 50, "y": 70},
            {"id": "f4", "type": "nombre_dueno", "x": 50, "y": 80},
        ]},
    )
    db.add(tpl)
    db.commit()
    try:
        c = client.post("/api/internal/customers", headers=h, json={"name": f"Ana {tag}", "phone": "912345678"}).json()
        p = client.post("/api/internal/pets", headers=h, json={"name": f"Toby {tag}", "species": "Canino", "customer_id": c["id"]}).json()
        oid = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente"}).json()["id"]

        r = client.post("/api/internal/ops-records/generate", headers=h, json={
            "cremation_id": oid, "template_id": tpl.id, "persist": True,
            "image_overrides": {"f3": {"value": "Escrito al emitir"}},
        })
        assert r.status_code == 200, r.text
        assert "printed" not in r.json()

        docs = client.get("/api/internal/ops-records", headers=h).json()["documents"]
        cert = next(d for d in docs if d["is_generated"] and d["cremation_id"] == oid)
        d = client.get(f"/api/internal/ops-records/certificates/{cert['id']}/data", headers=h)
        assert d.status_code == 200, d.text
        body = d.json()
        assert body["order"]["id"] == oid and body["number"]
        data = body["data"]
        assert data["template"]["name"] == f"Diseño {tag}"
        assert data["pet"]["name"].lower() == f"toby {tag}" and data["owner"]["name"].lower() == f"ana {tag}".lower()
        by = {(f["type"], f.get("code")): f for f in data["fields"]}
        assert by[("texto_fijo", "FRASE")]["value"] == "Siempre contigo"
        assert by[("texto_fijo", "FRASE")]["source"] == "guardado"
        assert by[("texto_fijo", None)]["source"] == "emision" and by[("texto_fijo", None)]["value"] == "Escrito al emitir"
        assert by[("nombre_mascota", None)]["value"].lower() == f"toby {tag}"

        # Buscador del Repositorio: por texto libre (sin importar tildes ni mayúsculas)
        m = client.get("/api/internal/ops-records/certificates/search", headers=h, params={"q": "SIEMPRE contigo"}).json()["matches"]
        assert str(cert["id"]) in m and "Siempre contigo" in m[str(cert["id"])]
        assert str(cert["id"]) not in client.get("/api/internal/ops-records/certificates/search", headers=h,
                                                 params={"q": "no-existe-xyz"}).json()["matches"]
        assert str(cert["id"]) not in client.get("/api/internal/ops-records/certificates/search", headers=auth("b"),
                                                 params={"q": "contigo"}).json()["matches"]

        # Otro crematorio no lo ve
        assert client.get(f"/api/internal/ops-records/certificates/{cert['id']}/data", headers=auth("b")).status_code == 404
    finally:
        db.rollback()
        db.query(models.Certificate).filter(models.Certificate.tenant_id == tid,
                                            models.Certificate.cremation_id.isnot(None)).filter(
            models.Certificate.data.isnot(None)).delete(synchronize_session=False)
        t = db.get(models.Tenant, tid)
        t.cert_text_values = old_texts
        db.get(models.SubscriptionPlan, plan.id).features = old_features
        db.query(models.CertificateTemplate).filter(models.CertificateTemplate.id == tpl.id).delete()
        db.commit()

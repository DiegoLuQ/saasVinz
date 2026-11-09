"""recepcion-pedidos: la lista de órdenes indica si están en la última fase (botón «Finalizar»)."""
import uuid


def test_lista_indica_ultima_fase(client, auth, db):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Luna {tag}", "species": "Perro", "customer_id": c["id"]}).json()
    o = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "en_proceso"})
    assert o.status_code in (200, 201), o.text

    steps = client.get("/api/internal/operations/steps", headers=h).json()
    rows = client.get("/api/internal/cremations", headers=h).json()
    row = next(r for r in rows if r["id"] == o.json()["id"])
    # Sin fase asignada: solo se puede finalizar si el crematorio no tiene flujo
    assert row["at_last_step"] is (len(steps) == 0)

    if steps:
        from app.api.internal.operations import models as m
        tech = db.query(m.CremationTechnical).filter_by(cremation_id=row["id"]).first()
        if tech:
            tech.step_id = steps[-1]["id"]
        else:
            db.add(m.CremationTechnical(cremation_id=row["id"], tenant_id=row["tenant_id"], step_id=steps[-1]["id"]))
        db.commit()
        rows = client.get("/api/internal/cremations", headers=h).json()
        assert next(x for x in rows if x["id"] == row["id"])["at_last_step"] is True

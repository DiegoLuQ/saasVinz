"""Badge «Panel de Trabajo» del Sidebar: bootstrap.metadata.ops_in_progress = órdenes
activas con fase (misma regla que la pestaña «En proceso» del panel)."""
from app import models


def _count(client, h):
    return client.get("/api/internal/auth/bootstrap", headers=h).json()["metadata"]["ops_in_progress"]


def test_cuenta_las_ordenes_en_proceso(client, auth, db, world):
    h = auth("a")
    before = _count(client, h)
    board = client.get("/api/internal/operations/ops/board", headers=h, params={"tab": "in_progress"}).json()
    assert before == board["counts"]["in_progress"]

    c = client.post("/api/internal/customers", headers=h, json={"name": "Fam Badge", "phone": "912345678"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": "Badge", "species": "Canino", "customer_id": c["id"]}).json()
    oid = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente"}).json()["id"]
    try:
        assert _count(client, h) == before  # sin fase = por iniciar
        step = db.query(models.WorkflowStep).filter(models.WorkflowStep.tenant_id == world["tenant_a"]).first()
        tech = db.query(models.CremationTechnical).filter(models.CremationTechnical.cremation_id == oid).first()
        if tech is None:
            tech = models.CremationTechnical(cremation_id=oid)
            db.add(tech)
        tech.step_id = step.id
        db.commit()
        assert _count(client, h) == before + 1
    finally:
        client.delete(f"/api/internal/cremations/{oid}", headers=h)

"""Indicadores (KPIs) del crematorio: /api/internal/kpis?year=&month=."""
import uuid
from datetime import datetime


def _kpis(client, h, **params):
    r = client.get("/api/internal/kpis", headers=h, params=params)
    assert r.status_code == 200, r.text
    return r.json()


def _find(rows, label):
    return next((r for r in rows if r["label"] == label), None)


def test_kpis_cuentan_ordenes_por_ciudad_y_especie(client, auth):
    h = auth("a")
    tag = uuid.uuid4().hex[:6]
    city = f"Ciudad{tag}"
    species = f"Especie{tag}"
    now = datetime.now()
    before = _kpis(client, h, year=now.year, month=now.month)

    c = client.post("/api/internal/customers", headers=h, json={"name": f"Fam {tag}", "phone": "912345678", "city": city.lower()}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": f"Toby {tag}", "species": species, "customer_id": c["id"]}).json()
    o = client.post("/api/internal/cremations", headers=h, json={"pet_id": p["id"], "status": "pendiente"})
    assert o.status_code in (200, 201), o.text

    after = _kpis(client, h, year=now.year, month=now.month)
    assert after["totals"]["orders"] == before["totals"]["orders"] + 1
    assert _find(after["by_city"], city)["count"] == 1  # initcap
    assert _find(after["by_species"], species)["count"] == 1
    assert sum(m["orders"] for m in after["monthly"]) >= after["totals"]["orders"]
    assert now.year in after["years"] and len(after["monthly"]) == 12

    # Año completo incluye el mes; otro crematorio no lo ve
    year = _kpis(client, h, year=now.year)
    assert year["month"] is None and _find(year["by_city"], city)
    other = _kpis(client, auth("b"), year=now.year, month=now.month)
    assert _find(other["by_city"], city) is None


def test_kpis_validan_mes(client, auth):
    assert client.get("/api/internal/kpis", headers=auth("a"), params={"month": 13}).status_code == 422

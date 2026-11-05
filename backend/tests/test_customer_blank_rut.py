"""Varios clientes sin RUT en el mismo crematorio: '' se guarda como NULL y no choca con el índice único."""
from app import models


def test_clientes_sin_rut_no_chocan(client, auth):
    h = auth("a")
    ids = []
    for nombre in ("Sin RUT Uno", "Sin RUT Dos"):
        r = client.post("/api/internal/customers", headers=h, json={"name": nombre, "rut": "  "})
        assert r.status_code in (200, 201), r.text
        assert r.json()["rut"] is None
        ids.append(r.json()["id"])
    for i in ids:
        client.delete(f"/api/internal/customers/{i}", headers=h)


def test_modelo_normaliza_rut_vacio():
    assert models.Customer(rut="").rut is None
    assert models.Customer(rut=" 12.345.678-9 ").rut == "12.345.678-9"

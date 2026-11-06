"""Enlace corto del memorial: memorial.<dominio>/<crematorio>/<mascota>-<código>.
Cada memorial nace con `short_code` (7 caracteres, con al menos un dígito) y
GET /api/internal/memorials/code/{code} lo resuelve al UUID."""
import re

from app.api.internal.memorials import models as mem_models
from app.utils.generators import generate_memorial_code

CODE_RE = re.compile(r"^(?=[a-z2-9]*[2-9])[abcdefghjkmnpqrstuvwxyz23456789]{7}$")


def test_generador_siempre_con_digito():
    for _ in range(500):
        assert CODE_RE.match(generate_memorial_code())


def test_memorial_con_codigo_corto_y_resolucion(client, auth, db):
    h = auth("a")
    c = client.post("/api/internal/customers", headers=h, json={"name": "Familia Corta"}).json()
    p = client.post("/api/internal/pets", headers=h, json={"name": "Chloe", "species": "Perro", "customer_id": c["id"]}).json()
    r = client.post("/api/internal/memorials", headers=h, json={"id_mascota": p["id"], "msg_despedida": "Siempre"})
    assert r.status_code == 200, r.text
    body = r.json()
    code, uuid = body["short_code"], body["id_recuerdo"]
    try:
        assert CODE_RE.match(code)
        res = client.get(f"/api/internal/memorials/code/{code}")
        assert res.status_code == 200, res.text
        assert res.json()["id_recuerdo"] == uuid
        # mayúsculas también resuelven
        assert client.get(f"/api/internal/memorials/code/{code.upper()}").json()["id_recuerdo"] == uuid
        assert client.get("/api/internal/memorials/code/zzzz999").status_code == 404
        pub = client.get(f"/api/internal/memorials/{uuid}")
        assert pub.status_code == 200 and pub.json()["short_code"] == code
        mem = db.query(mem_models.Memorial).filter(mem_models.Memorial.id_recuerdo == uuid).one()
        assert mem.short_code == code
    finally:
        client.delete(f"/api/internal/pets/{p['id']}", headers=h)

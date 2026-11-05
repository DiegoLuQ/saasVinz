"""Grupos de servicios (srv_services.group_name) y carga masiva desde Excel."""
import uuid
from io import BytesIO

import pytest
from openpyxl import Workbook

from app import models
from app.services.service_import import COLUMNS


@pytest.fixture
def limpiar(db, world):
    """Borra los servicios que crea cada test (marcados con un sufijo único)."""
    tag = uuid.uuid4().hex[:6]
    yield tag
    db.rollback()
    db.query(models.Service).filter(models.Service.name.like(f"%{tag}%")).delete(synchronize_session=False)
    db.commit()


def _xlsx(rows):
    wb = Workbook()
    ws = wb.active
    ws.title = "Servicios"
    ws.append([f"{c[0]} *" if c[2] else c[0] for c in COLUMNS])
    for r in rows:
        ws.append(r)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _subir(client, h, content, dry_run):
    return client.post(
        f"/api/internal/services/import?dry_run={'true' if dry_run else 'false'}",
        headers=h,
        files={"file": ("s.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )


def test_mismo_nombre_en_grupos_distintos(client, auth, limpiar):
    h = auth("a")
    name = f"Traslado {limpiar}"
    r1 = client.post("/api/internal/services", headers=h, json={"name": name, "price": 10000, "group_name": "Traslados"})
    assert r1.status_code == 200, r1.text
    assert r1.json()["group_name"] == "Traslados"
    r2 = client.post("/api/internal/services", headers=h, json={"name": name, "price": 15000, "group_name": "Urgencias"})
    assert r2.status_code == 200, r2.text
    # Mismo nombre y grupo (sin distinguir mayúsculas) => duplicado
    r3 = client.post("/api/internal/services", headers=h, json={"name": name.upper(), "price": 1, "group_name": "traslados"})
    assert r3.status_code == 400
    # Mover el segundo al grupo del primero también choca
    r4 = client.patch(f"/api/internal/services/{r2.json()['id']}", headers=h, json={"group_name": "Traslados"})
    assert r4.status_code == 400
    assert "Traslados" in client.get("/api/internal/services/groups", headers=h).json()


def test_renombrar_grupo(client, auth, limpiar):
    h = auth("a")
    grupo = f"Grupo {limpiar}"
    ids = [client.post("/api/internal/services", headers=h,
                       json={"name": f"S{i} {limpiar}", "price": 1000, "group_name": grupo}).json()["id"] for i in range(2)]
    r = client.put("/api/internal/services/groups/rename", headers=h, json={"old_name": grupo, "new_name": f"Nuevo {limpiar}"})
    assert r.status_code == 200, r.text
    assert r.json()["updated"] == 2
    lista = {s["id"]: s for s in client.get("/api/internal/services", headers=h).json()}
    assert all(lista[i]["group_name"] == f"Nuevo {limpiar}" for i in ids)
    # Otro crematorio no ve ni renombra ese grupo
    rb = client.put("/api/internal/services/groups/rename", headers=auth("b"),
                    json={"old_name": f"Nuevo {limpiar}", "new_name": "X"})
    assert rb.status_code == 404


def test_importar_vista_previa_y_confirmar(client, auth, db, world, limpiar):
    h = auth("a")
    existente = f"Velatorio {limpiar}"
    client.post("/api/internal/services", headers=h, json={"name": existente, "price": 5000, "group_name": "Ceremonias"})
    content = _xlsx([
        ["Cremación individual (ejemplo)", "", 85000, 30000, "Activo", "Sí", "Cremaciones", "No"],
        [f"Eutanasia {limpiar}", "Domicilio", "45.000", 10000, "Activo", "No", "Especiales", "Sí"],
        [existente, "", 7000, 0, "", "", "ceremonias", ""],                # ya existe en ese grupo
        [existente, "", 7000, 0, "Inactivo", "", "Otro grupo", ""],       # mismo nombre, otro grupo
        [f"Malo {limpiar}", "", "abc", 0, "Quizás", "", "", ""],           # errores
        [f"Eutanasia {limpiar}", "", 1, 0, "", "", "especiales", ""],     # repetido en el archivo
    ])
    r = _subir(client, h, content, dry_run=True)
    assert r.status_code == 200, r.text
    body = r.json()
    assert [row["status"] for row in body["rows"]] == ["example", "new", "exists", "new", "error", "error"]
    assert body["counts"] == {"new": 2, "exists": 1, "error": 2, "example": 1}
    assert body["active_new"] == 1
    assert not body["applied"]
    assert db.query(models.Service).filter(models.Service.name == f"Eutanasia {limpiar}").count() == 0

    r = _subir(client, h, content, dry_run=False)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 2
    db.expire_all()
    eut = db.query(models.Service).filter(models.Service.name == f"Eutanasia {limpiar}").one()
    assert (eut.price, eut.cost, eut.is_special, eut.show_in_form, eut.group_name, eut.description) == \
        (45000, 10000, True, False, "Especiales", "Domicilio")
    otro = db.query(models.Service).filter(models.Service.name == existente, models.Service.group_name == "Otro grupo").one()
    assert otro.is_active is False


def test_importar_respeta_limite_del_plan(client, auth, db, world, limpiar):
    h = auth("free")  # FREE: 10 servicios
    usados = db.query(models.Service).filter(models.Service.tenant_id == world["tenant_free"],
                                              models.Service.is_active.is_(True)).count()
    filas = [[f"S{i} {limpiar}", "", 1000, 0, "Activo", "", "", ""] for i in range(10 - usados + 1)]
    r = _subir(client, h, _xlsx(filas), dry_run=True)
    assert r.status_code == 200, r.text
    assert r.json()["over_limit"] is True
    r = _subir(client, h, _xlsx(filas), dry_run=False)
    assert r.status_code == 400
    assert "plan" in r.json()["detail"]
    # Los inactivos no ocupan cupo
    filas_inactivas = [[f"I{i} {limpiar}", "", 1000, 0, "Inactivo", "", "", ""] for i in range(3)]
    r = _subir(client, h, _xlsx(filas_inactivas), dry_run=False)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 3


def test_plantilla_y_archivo_invalido(client, auth):
    h = auth("a")
    r = client.get("/api/internal/services/import/template", headers=h)
    assert r.status_code == 200
    assert r.content[:2] == b"PK"
    r = _subir(client, h, b"no es excel", dry_run=True)
    assert r.status_code == 400

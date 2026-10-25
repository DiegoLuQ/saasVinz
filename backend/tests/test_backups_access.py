"""Respaldos: solo el SuperAdmin. Un respaldo trae los datos de TODOS los crematorios."""


def test_admin_de_crematorio_no_accede_a_respaldos(client, auth):
    h = auth("a")
    assert client.get("/api/internal/maintenance/backups/status", headers=h).status_code == 403
    assert client.get("/api/internal/maintenance/backups/config", headers=h).status_code == 403
    assert client.post("/api/internal/maintenance/backups/config", headers=h, json={"backup_enabled": False}).status_code == 403
    assert client.post("/api/internal/maintenance/backups/trigger", headers=h).status_code == 403
    assert client.get("/api/internal/maintenance/backups/download", headers=h).status_code == 403
    assert client.post("/api/internal/maintenance/backups/restore-check", headers=h).status_code == 403


def test_superadmin_ve_el_estado(client, auth):
    assert client.get("/api/internal/maintenance/backups/status", headers=auth("creator")).status_code == 200

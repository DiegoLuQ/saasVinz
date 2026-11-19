"""Plantillas de formulario que diseña el SuperAdmin (sys_saas_config.form_templates)."""
URL = "/api/internal/creator/config/form-templates"
TENANT_URL = "/api/internal/maintenance/form-templates"


def test_plantillas_editables_por_superadmin(client, auth):
    h = auth("creator")
    try:
        # Original: «Formulario Huella», visible para el crematorio
        d = client.get(URL, headers=h).json()
        assert d["is_default"] is True and [t["id"] for t in d["templates"]] == ["huella"]
        assert any(f["key"] == "email" and f["phase"] == "familia" for f in d["fields"])
        tenant = client.get(TENANT_URL, headers=auth("a"))
        assert tenant.status_code == 200 and tenant.json()["templates"][0]["phase_order"] == ["angel", "recuerdos", "camino", "familia"]

        # Un crematorio no puede editarlas
        assert client.put(URL, headers=auth("a"), json={"templates": []}).status_code in (401, 403)

        body = {"templates": [
            {"name": "  Rápido  ", "active": True, "phase_order": ["camino", "angel", "familia", "recuerdos"],
             "phases": {"recuerdos": False}, "phase_labels": {"angel": {"name": "Tu mascota"}},
             "fields": {"email": {"visible": False, "required": True}, "age": {"visible": True, "required": True}}},
            {"id": "rapido", "name": "Borrador", "active": False},
        ]}
        r = client.put(URL, headers=h, json=body)
        assert r.status_code == 200, r.text
        a, b = r.json()["templates"]
        assert a["name"] == "Rápido" and a["id"] == "rapido" and b["id"] == "rapido-2"
        assert a["phase_order"] == ["angel", "camino", "familia", "recuerdos"]  # Camino tras Ángel
        assert a["phases"]["recuerdos"] is False and a["phase_labels"] == {"angel": {"name": "Tu mascota"}}
        assert a["fields"]["email"] == {"visible": False, "required": False}  # oculto nunca obligatorio
        assert a["fields"]["age"]["required"] is False  # la edad nunca es obligatoria
        # El crematorio solo ve las activas
        assert [t["name"] for t in client.get(TENANT_URL, headers=auth("a")).json()["templates"]] == ["Rápido"]

        # Validaciones
        assert client.put(URL, headers=h, json={"templates": [{"name": ""}]}).status_code == 400
        no_phase = {"templates": [{"name": "X", "phases": {k: False for k in ("familia", "angel", "camino", "recuerdos")}}]}
        assert client.put(URL, headers=h, json=no_phase).status_code == 400
        assert client.put(URL, headers=h, json={"templates": [{"name": f"T{i}"} for i in range(9)]}).status_code == 400
    finally:
        r = client.put(URL, headers=h, json={"templates": None})
        assert r.status_code == 200 and r.json()["is_default"] is True

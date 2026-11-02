"""Diagnóstico 360° (SuperAdmin): banco sembrado, cálculo con «No aplica», copia de
respuestas, plan sugerido, acceso solo creator y envío del PDF por correo."""

BASE = "/api/internal/creator/diagnostics"
PDF = b"%PDF-1.4\n% prueba\n"


def _questions(client, auth, mode):
    r = client.get(f"{BASE}/questions?mode={mode}", headers=auth("creator"))
    assert r.status_code == 200, r.text
    return r.json()


def _create(client, auth, mode=10, pick=0, na_ids=(), **extra):
    qs = _questions(client, auth, mode)["questions"]
    answers = {str(q["id"]): ("na" if q["id"] in na_ids else pick) for q in qs}
    body = {"business_name": "Crematorio Prospecto", "contact_name": "Ana Pérez", "city": "Talca",
            "email": "ana@prospecto-pruebas.cl", "mode": mode, "answers": answers, **extra}
    return client.post(BASE, json=body, headers=auth("creator"))


def test_solo_superadmin(client, auth):
    assert client.get(BASE, headers=auth("a")).status_code in (401, 403)
    assert client.get(f"{BASE}/questions", headers=auth("a")).status_code in (401, 403)


def test_banco_sembrado_con_modalidades(client, auth):
    data = _questions(client, auth, 20)
    assert data["mode_counts"] == {"10": 10, "15": 15, "20": 20}
    assert len(data["categories"]) == 10
    assert sum(c["weight"] for c in data["categories"]) == 100


def test_todo_al_maximo_da_100_y_alto_nivel(client, auth):
    r = _create(client, auth, mode=10, pick=0)
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["total_pct"] == 100 and d["level"] == "Alto nivel"
    assert all(a["recommendation"] is None for a in d["answers"])


def test_respuestas_bajas_traen_recomendaciones_y_plan(client, auth):
    d = _create(client, auth, mode=15, pick=3).json()  # sin volumen: manda lo que necesita
    assert d["total_pct"] == 0 and d["level"] == "Inicial"
    assert any(a["recommendation"] for a in d["answers"])
    assert d["suggested_plan"]["plan"] == "NORMAL" and d["suggested_plan"]["start_free"] is True


def test_no_aplica_se_excluye(client, auth):
    qs = _questions(client, auth, 20)["questions"]
    na_q = next(q for q in qs if q["allows_na"])
    d = _create(client, auth, mode=20, pick=0, na_ids=(na_q["id"],)).json()
    assert d["total_pct"] == 100
    cat = next(c for c in d["category_scores"] if c["key"] == na_q["category_key"])
    assert cat["applicable"] == cat["questions"] - 1


def test_faltan_respuestas(client, auth):
    qs = _questions(client, auth, 10)["questions"]
    body = {"business_name": "X Crematorio", "contact_name": "Ana", "city": "Talca", "mode": 10,
            "answers": {str(qs[0]["id"]): 0}}
    assert client.post(BASE, json=body, headers=auth("creator")).status_code == 400


def test_editar_pregunta_no_cambia_informes_anteriores(client, auth):
    d = _create(client, auth, mode=10, pick=0).json()
    q = _questions(client, auth, 10)["questions"][0]
    original = q["text"]
    payload = {k: q[k] for k in ("category_id", "help", "options", "allows_na", "modes", "recommendation",
                                 "vinzer_feature", "sort_order", "is_active")}
    try:
        r = client.put(f"{BASE}/questions/{q['id']}", json={**payload, "text": "Texto editado"}, headers=auth("creator"))
        assert r.status_code == 200, r.text
        again = client.get(f"{BASE}/{d['id']}", headers=auth("creator")).json()
        assert again["answers"][0]["question"] == original
    finally:
        client.put(f"{BASE}/questions/{q['id']}", json={**payload, "text": original}, headers=auth("creator"))


def test_pesos_deben_sumar_100(client, auth):
    cats = _questions(client, auth, 10)["categories"]
    bad = [{"id": c["id"], "name": c["name"], "weight": 5} for c in cats]
    assert client.put(f"{BASE}/categories", json=bad, headers=auth("creator")).status_code == 400


def test_enviar_pdf_por_correo(client, auth, sent_emails):
    d = _create(client, auth, mode=10, pick=1).json()
    r = client.post(f"{BASE}/{d['id']}/send", files={"pdf": ("informe.pdf", PDF, "application/pdf")},
                    headers=auth("creator"))
    assert r.status_code == 200, r.text
    assert sent_emails and sent_emails[-1].recipients[0].email == "ana@prospecto-pruebas.cl"
    assert len(sent_emails[-1].attachments) == 1
    assert client.get(f"{BASE}/{d['id']}", headers=auth("creator")).json()["status"] == "contactado"
    # Un archivo que no es PDF se rechaza
    r = client.post(f"{BASE}/{d['id']}/send", files={"pdf": ("x.pdf", b"hola", "application/pdf")},
                    headers=auth("creator"))
    assert r.status_code == 400


def test_resumen(client, auth):
    _create(client, auth, mode=10, pick=2)
    s = client.get(f"{BASE}/summary", headers=auth("creator")).json()
    assert s["count"] >= 1 and len(s["categories"]) >= 1


# ===== Landing pública (vinzer.cl/diagnostico) =====

PUB = "/api/public/diagnostic"


def test_flujo_publico_completo(client, auth, sent_emails):
    cfg = client.get(PUB).json()
    assert cfg["mode"] == 10 and {m["value"]: m["count"] for m in cfg["modes"]} == {10: 10, 15: 15, 20: 20}
    assert len(cfg["questions"]) == 20
    assert isinstance(cfg["questions"][0]["options"][0], str)  # sin los %
    cfg["questions"] = [q for q in cfg["questions"] if 10 in q["modes"]]  # sin "mode" se usa la de la web (10)

    start = client.post(f"{PUB}/start", json={"business_name": "Crematorio Web", "email": "Dueno@CrematorioWeb.cl",
                                              "recaptcha_token": "x", "utm": {"utm_source": "instagram", "otro": "x"}})
    assert start.status_code == 200, start.text
    token = start.json()["token"]

    # Aún no terminado: queda como prospecto, el informe no existe todavía
    assert client.get(f"{PUB}/{token}").status_code == 409
    leads = client.get(f"{BASE}?source=web", headers=auth("creator")).json()
    lead = next(l for l in leads if l["business_name"] == "Crematorio Web")
    assert lead["completed_at"] is None and lead["utm"] == {"utm_source": "instagram"}
    assert lead["email"] == "dueno@crematorioweb.cl"

    answers = {str(q["id"]): 1 for q in cfg["questions"]}
    r = client.post(f"{PUB}/{token}/answers", json={"answers": answers})
    assert r.status_code == 200, r.text
    rep = r.json()
    assert rep["total_pct"] == 60 and rep["promo_pct"] == 45
    assert "notes" not in rep and "status" not in rep
    # Correo al crematorio con el enlace + aviso al SuperAdmin
    subjects = [m.subject for m in sent_emails]
    assert any("Tu Diagnóstico 360°" in s for s in subjects)
    assert any("Nuevo diagnóstico: Crematorio Web" in s for s in subjects)
    assert client.get(f"{PUB}/{token}").json()["total_pct"] == 60
    # Reenviar no lo recalcula
    other = {str(q["id"]): 0 for q in cfg["questions"]}
    assert client.post(f"{PUB}/{token}/answers", json={"answers": other}).json()["total_pct"] == 60


def test_token_invalido(client):
    assert client.get(f"{PUB}/no-existe").status_code == 404
    assert client.post(f"{PUB}/no-existe/answers", json={"answers": {}}).status_code == 404


def test_publico_elige_modalidad(client):
    cfg = client.get(PUB).json()
    bad = client.post(f"{PUB}/start", json={"business_name": "Crematorio X", "email": "x@crematoriox.cl", "mode": 12})
    assert bad.status_code == 400
    r = client.post(f"{PUB}/start", json={"business_name": "Crematorio Completo", "email": "c@crematoriocompleto.cl", "mode": 20})
    token = r.json()["token"]
    answers = {str(q["id"]): 0 for q in cfg["questions"]}  # las 20
    rep = client.post(f"{PUB}/{token}/answers", json={"answers": answers}).json()
    assert rep["mode"] == 20 and len(rep["answers"]) == 20


PLANES = [{"name": "Track", "max_orders": 25}, {"name": "NORMAL", "max_orders": 40},
          {"name": "PRO", "max_orders": 60}, {"name": "ULTRA", "max_orders": 250}]


def test_rangos_de_volumen_calzan_con_los_planes():
    from app.services import diagnostics as svc
    assert [r["label"] for r in svc.volume_ranges(PLANES)] == ["Hasta 25", "26 a 40", "41 a 60", "Más de 60"]
    cfg = svc.DEFAULT_CONFIG
    bajo_c3 = {"C1": 100, "C3": 20}   # le falta gestión → Track
    assert svc.suggest_plan(cfg, bajo_c3, 20, 70, PLANES)["plan"] == "Track"
    assert svc.suggest_plan(cfg, bajo_c3, 40, 70, PLANES)["plan"] == "NORMAL"  # no le cabe en Track
    alto = svc.suggest_plan(cfg, bajo_c3, 61, 30, PLANES)
    assert alto["plan"] == "ULTRA" and alto["by_volume"] and alto["needs_plan"] == "Track"
    assert alto["start_free"] is False
    # Lo que necesita manda si es mayor que lo que le cabe
    assert svc.suggest_plan(cfg, {"C1": 10}, 20, 70, PLANES)["plan"] == "NORMAL"


def test_publico_con_volumen_sugiere_por_capacidad(client):
    cfg = client.get(PUB).json()
    assert cfg["volume_ranges"]
    r = client.post(f"{PUB}/start", json={"business_name": "Crematorio Grande", "email": "g@crematoriogrande.cl",
                                          "monthly_cremations": 50})
    token = r.json()["token"]
    answers = {str(q["id"]): 0 for q in cfg["questions"] if 10 in q["modes"]}
    plan = client.post(f"{PUB}/{token}/answers", json={"answers": answers}).json()["suggested_plan"]
    assert plan["plan"] == "PRO" and plan["by_volume"] is True and plan["needs_plan"] == "NORMAL"

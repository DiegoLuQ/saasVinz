"""Orden y nombre de las fases en formularios personalizados (Formulario Huella).

El formulario principal (clásico) no cambia; un personalizado puede reordenar las
fases (ids fijos) y renombrarlas. El embudo usa el orden real de cada sesión.
"""
from datetime import datetime, timedelta

from app.services import form_funnel
from app.services.public_form_config import (
    PHASE_KEYS, clean_phase_labels, clean_phase_order, form_phase_layout, normalize_form_config,
)

HUELLA = ["angel", "recuerdos", "camino", "familia"]


def test_orden_clasico_queda_en_none():
    assert clean_phase_order(None) is None
    assert clean_phase_order(list(PHASE_KEYS)) is None
    assert clean_phase_order("x") is None


def test_orden_huella_y_saneo():
    assert clean_phase_order(HUELLA) == HUELLA
    # faltantes al final, duplicados y desconocidos fuera
    assert clean_phase_order(["recuerdos", "recuerdos", "zzz"]) == ["recuerdos", "familia", "angel", "camino"]
    # Camino nunca antes de Ángel
    assert clean_phase_order(["camino", "angel", "familia", "recuerdos"]) == ["angel", "camino", "familia", "recuerdos"]


def test_nombres_de_fase():
    labels = clean_phase_labels({"angel": {"name": "  Tu   compañero ", "phrase": ""}, "zzz": {"name": "x"},
                                 "familia": {"name": "x" * 50}})
    assert labels == {"angel": {"name": "Tu compañero"}, "familia": {"name": "x" * 24}}
    assert clean_phase_labels({}) is None


def test_normalizado_y_layout():
    raw = {"custom_forms": [{"id": "huella", "name": "Formulario Huella", "phase_order": HUELLA,
                             "phase_labels": {"familia": {"name": "Tus datos"}}}]}
    cf = normalize_form_config(raw)["custom_forms"][0]
    assert cf["phase_order"] == HUELLA
    assert cf["phase_labels"] == {"familia": {"name": "Tus datos"}}
    order, names = form_phase_layout(raw, "huella")
    assert order == HUELLA and names["familia"] == "Tus datos" and names["angel"] == "Ángel"
    assert form_phase_layout(raw, "main")[0] == list(PHASE_KEYS)


def _session(steps: list[str], submitted: bool = False) -> dict:
    t0 = datetime(2026, 11, 1, 12, 0, 0)
    ev = {("open", ""): t0}
    for i, st in enumerate(steps, start=1):
        ev[("step_view", st)] = t0 + timedelta(seconds=10 * i)
    if submitted:
        ev[("submitted", "")] = t0 + timedelta(seconds=10 * (len(steps) + 1))
    return {"form_id": "huella", "events": ev}


def test_embudo_con_fases_reordenadas():
    # Se quedó en Recuerdos (2.ª fase de Huella): no debe contarse como «Ángel»
    s1 = _session(["angel", "recuerdos"])
    s2 = _session(["angel", "recuerdos", "camino", "familia", "resumen"], submitted=True)
    out = form_funnel._summary([s1, s2], step_order=HUELLA, step_labels={"familia": "Tus datos"})
    assert [s["key"] for s in out["steps"]][:5] == [*HUELLA, "resumen"]
    assert out["abandon"][0]["key"] == "recuerdos"
    fam = next(s for s in out["steps"] if s["key"] == "familia")
    assert fam["label"] == "Tus datos" and fam["median_seconds"] == 10
    assert all(p["median_seconds"] in (None, 10) for p in out["phases"] if p["key"] not in ("inicio",))

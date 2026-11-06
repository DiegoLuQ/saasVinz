"""Fotos máximas del memorial: crematorio = 3 (sea cual sea su plan); plan vendido por Vinzer:
Mensual 3, Anual 5, Eterno 8."""
from app.api.internal.memorials import models as mem_models
from app.api.internal.memorials.router import _get_memorial_img_limit


def test_limite_de_fotos_por_tipo_de_memorial(db):
    from app.core.tenant_context import apply_bypass_rls
    apply_bypass_rls(db)
    casos = {"ULTRA": 3, "PRO": 3, "": 3, "mensual": 3, "anual": 5, "Eterno": 8}
    for plan, esperado in casos.items():
        assert _get_memorial_img_limit(mem_models.Memorial(plan=plan or None), db) == esperado, plan

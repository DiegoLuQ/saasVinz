"""Fotos máximas del memorial: Partner (crematorio) = 3; planes Vinzer Recuerdo 10, Eterno 30, Infinito 150.
Mensual/Anual antiguos ya no son planes Vinzer (se migraron a Recuerdo)."""
from app.api.internal.memorials import models as mem_models
from app.api.internal.memorials.router import _get_memorial_img_limit


def test_limite_de_fotos_por_tipo_de_memorial(db):
    from app.core.tenant_context import apply_bypass_rls
    apply_bypass_rls(db)
    casos = {"ULTRA": 3, "PRO": 3, "": 3, "mensual": 3, "recuerdo": 10, "Eterno": 30, "infinito": 150}
    for plan, esperado in casos.items():
        assert _get_memorial_img_limit(mem_models.Memorial(plan=plan or None), db) == esperado, plan

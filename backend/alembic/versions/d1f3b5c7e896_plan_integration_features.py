"""plan_integration_features

Widget web, formulario incrustable y video de bienvenida pasan de depender del
NOMBRE del plan a ser casillas de "Configurar Características" (Configuración →
Integraciones). Se guarda en cada plan el valor que tenía por la regla anterior
(widget y video: PRO y ULTRA; formulario incrustable: solo ULTRA), así nada cambia
hasta que el SuperAdmin las modifique. No toca casillas ya guardadas.

Las demás casillas nuevas (certificados:redes, certificados:generar_todo,
configuracion:formulario/flujo/creditos_ia) no necesitan datos: sin valor
guardado se permiten, igual que hoy.

Revision ID: d1f3b5c7e896
Revises: c9e1a3b5d674
Create Date: 2026-10-20 18:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd1f3b5c7e896'
down_revision: Union[str, Sequence[str], None] = 'c9e1a3b5d674'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RULES = {
    "integraciones:widget": {"PRO", "ULTRA"},
    "integraciones:formulario_incrustable": {"ULTRA"},
    "integraciones:video_bienvenida": {"PRO", "ULTRA"},
}


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, name, features FROM sys_subscription_plans")).fetchall()
    for plan_id, name, features in rows:
        if isinstance(features, str):
            features = json.loads(features or "{}")
        features = dict(features) if isinstance(features, dict) else {}
        upper = (name or "").strip().upper()
        changed = False
        for key, plans in RULES.items():
            if key not in features:
                features[key] = upper in plans
                changed = True
        if changed:
            conn.execute(
                sa.text("UPDATE sys_subscription_plans SET features = CAST(:f AS json) WHERE id = :id"),
                {"f": json.dumps(features), "id": plan_id},
            )


def downgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, features FROM sys_subscription_plans")).fetchall()
    for plan_id, features in rows:
        if isinstance(features, str):
            features = json.loads(features or "{}")
        if not isinstance(features, dict):
            continue
        for key in RULES:
            features.pop(key, None)
        conn.execute(
            sa.text("UPDATE sys_subscription_plans SET features = CAST(:f AS json) WHERE id = :id"),
            {"f": json.dumps(features), "id": plan_id},
        )

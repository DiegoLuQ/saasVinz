"""order_products_plan (ánfora incluida en el plan)

oc_products.plan_id: la línea de producto viene incluida en ese plan de la orden
(precio 0 por defecto; el crematorio puede cobrar una diferencia si la familia
cambia el ánfora por otra). Así el stock del ánfora del plan se descuenta y se
devuelve por el mismo camino que cualquier producto de la orden (crear, editar,
cancelar, eliminar). NULL = producto vendido aparte.

Revision ID: d0f2b4c6e813
Revises: c8e0a2b4d691
Create Date: 2026-11-02 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'd0f2b4c6e813'
down_revision: Union[str, Sequence[str], None] = 'c8e0a2b4d691'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE oc_products ADD COLUMN IF NOT EXISTS plan_id INTEGER
            REFERENCES srv_plans(id) ON DELETE SET NULL;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE oc_products DROP COLUMN IF EXISTS plan_id;")

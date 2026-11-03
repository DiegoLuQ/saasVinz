"""plan_weight_prices (precio de cada plan por tramo de peso)

Algunos crematorios no cobran un recargo único por tramo: cada plan tiene su
propio precio según el peso (ej. Plan Recuerdo 87.000 hasta 4 kg, 90.000 hasta
9 kg…). srv_plans.weight_prices = {"<id del tramo>": precio}. Solo se usa con
form_config.weight_pricing_mode = "table"; vacío o sin el tramo = precio base.

Revision ID: f4c6e8a0b247
Revises: e2b4d6f8a136
Create Date: 2026-11-03 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f4c6e8a0b247'
down_revision: Union[str, Sequence[str], None] = 'e2b4d6f8a136'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('srv_plans', sa.Column('weight_prices', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('srv_plans', 'weight_prices')

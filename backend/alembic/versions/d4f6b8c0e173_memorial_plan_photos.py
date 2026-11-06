"""Fotos por plan de memorial vendido por Vinzer: Mensual 3, Anual 5, Eterno 8
(antes 3 / 10 / 25). Los memoriales de crematorio sin plan vendido quedan en 3 (código).

Revision ID: d4f6b8c0e173
Revises: c2e4a6b8d951
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd4f6b8c0e173'
down_revision: Union[str, Sequence[str], None] = 'c2e4a6b8d951'
branch_labels = None
depends_on = None

_SET = """
    UPDATE rec_plans
    SET features = jsonb_set(COALESCE(features::jsonb, '{}'::jsonb), '{max_images}', to_jsonb(:n))::json
    WHERE name_db = :plan
"""


def upgrade() -> None:
    for plan, n in (("mensual", 3), ("anual", 5), ("eterno", 8)):
        op.execute(sa.text(_SET).bindparams(plan=plan, n=n))


def downgrade() -> None:
    for plan, n in (("mensual", 3), ("anual", 10), ("eterno", 25)):
        op.execute(sa.text(_SET).bindparams(plan=plan, n=n))

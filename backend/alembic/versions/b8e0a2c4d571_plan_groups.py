"""plan_groups (grupo de cada plan + grupos que muestra cada enlace de catálogo)

- srv_plans.group_name: texto libre (≤ 60), NULL = «Sin grupo».
- inv_catalog_tokens.plan_groups: lista JSON de grupos de planes que muestra ese
  enlace del catálogo de planes; NULL = todos los planes activos. Un nombre
  vacío ("") en la lista representa «Sin grupo».

Revision ID: b8e0a2c4d571
Revises: a6c8e0b2d359
Create Date: 2026-11-04 15:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b8e0a2c4d571'
down_revision: Union[str, Sequence[str], None] = 'a6c8e0b2d359'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('srv_plans', sa.Column('group_name', sa.String(60), nullable=True))
    op.add_column('inv_catalog_tokens', sa.Column('plan_groups', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('inv_catalog_tokens', 'plan_groups')
    op.drop_column('srv_plans', 'group_name')

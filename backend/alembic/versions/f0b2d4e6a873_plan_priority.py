"""plan_priority

srv_plans.is_priority: las órdenes con un plan prioritario se marcan y van
primero en el Panel de Trabajo y en el Dashboard.

Revision ID: f0b2d4e6a873
Revises: e8a0c2d4f651
Create Date: 2026-11-07 10:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f0b2d4e6a873'
down_revision: Union[str, Sequence[str], None] = 'e8a0c2d4f651'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('srv_plans', sa.Column('is_priority', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('srv_plans', 'is_priority')

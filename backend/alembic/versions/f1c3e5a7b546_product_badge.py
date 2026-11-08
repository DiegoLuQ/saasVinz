"""product_badge

- inv_products.badge: etiqueta destacada del producto en el catálogo público
  («Popular», «Más vendido», «Nuevo»… o texto propio, ≤ 24).

Revision ID: f1c3e5a7b546
Revises: e9b1d3f5a432
Create Date: 2026-11-08 16:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f1c3e5a7b546'
down_revision: Union[str, Sequence[str], None] = 'e9b1d3f5a432'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('inv_products', sa.Column('badge', sa.String(24), nullable=True))


def downgrade() -> None:
    op.drop_column('inv_products', 'badge')

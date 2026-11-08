"""product_show_purchases

- inv_products.show_purchases: muestra «Comprado N veces» (número real) en el
  catálogo online. Por defecto sí.

Revision ID: a2d4f6b8c657
Revises: f1c3e5a7b546
Create Date: 2026-11-08 18:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a2d4f6b8c657'
down_revision: Union[str, Sequence[str], None] = 'f1c3e5a7b546'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('inv_products', sa.Column('show_purchases', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    op.drop_column('inv_products', 'show_purchases')

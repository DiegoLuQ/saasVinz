"""product_note_made_to_order

- inv_products.note: nota corta del producto (≤ 300), visible en el catálogo.
- inv_products.made_to_order: producto «a pedido» (se encarga al proveedor):
  no se bloquea por stock en las órdenes y se muestra como «A pedido».

Revision ID: c5e7a9b1d208
Revises: b3d5f7a9c106
Create Date: 2026-11-08 10:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c5e7a9b1d208'
down_revision: Union[str, Sequence[str], None] = 'b3d5f7a9c106'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('inv_products', sa.Column('note', sa.String(300), nullable=True))
    op.add_column('inv_products', sa.Column('made_to_order', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('inv_products', 'made_to_order')
    op.drop_column('inv_products', 'note')

"""product_special

- inv_products.is_special: producto especial (máx. 4 activos por crematorio),
  ofrecido a la familia como adicional en el formulario, igual que los servicios
  especiales. Su nota especial es inv_products.note.

Revision ID: e9b1d3f5a432
Revises: d7f9b1c3e320
Create Date: 2026-11-08 14:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e9b1d3f5a432'
down_revision: Union[str, Sequence[str], None] = 'd7f9b1c3e320'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('inv_products', sa.Column('is_special', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('inv_products', 'is_special')

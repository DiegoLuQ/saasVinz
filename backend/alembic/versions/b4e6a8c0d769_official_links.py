"""official_links

- sys_tenants.official_links: formulario, catálogo de planes y catálogo de
  productos oficiales del crematorio ({"form", "plans_token_id",
  "products_token_id"}). Con los tres se activa la «tiendita de recuerdos».

Revision ID: b4e6a8c0d769
Revises: a2d4f6b8c657
Create Date: 2026-11-08 20:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b4e6a8c0d769'
down_revision: Union[str, Sequence[str], None] = 'a2d4f6b8c657'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sys_tenants', sa.Column('official_links', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('sys_tenants', 'official_links')

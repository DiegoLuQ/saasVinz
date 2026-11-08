"""service_image

- srv_services.image_url: imagen (WebP 1:1 optimizada) de los servicios especiales,
  mostrada a la familia al elegirlos en el formulario público.

Revision ID: d7f9b1c3e320
Revises: c5e7a9b1d208
Create Date: 2026-11-08 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd7f9b1c3e320'
down_revision: Union[str, Sequence[str], None] = 'c5e7a9b1d208'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('srv_services', sa.Column('image_url', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('srv_services', 'image_url')

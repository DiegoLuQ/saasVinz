"""dedication_length

rec_dedicatoria.mensaje pasa de 300 a 2000 caracteres: el largo permitido lo fija cada
plan de memorial (features.max_dedication_chars, 500 por defecto).

Revision ID: b1d3f5a7c829
Revises: a9c1e3f5b708
Create Date: 2026-11-06 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b1d3f5a7c829'
down_revision: Union[str, Sequence[str], None] = 'a9c1e3f5b708'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('rec_dedicatoria', 'mensaje', type_=sa.String(2000), existing_type=sa.String(300))


def downgrade() -> None:
    op.execute("UPDATE rec_dedicatoria SET mensaje = left(mensaje, 300) WHERE length(mensaje) > 300")
    op.alter_column('rec_dedicatoria', 'mensaje', type_=sa.String(300), existing_type=sa.String(2000))

"""cert_text_values

Textos con código en los certificados con imagen:
- sys_tenants.cert_text_values: valores que el crematorio guardó para los
  campos "texto_fijo" que el admin marcó con un código ({código: texto}).
  Un mismo código vale para todos los diseños que lo usan. NULL / clave
  ausente = se usa el texto por defecto del diseño.

Revision ID: c4e7a9b1d356
Revises: a1c3e5f7b902
Create Date: 2026-10-03 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c4e7a9b1d356'
down_revision: Union[str, Sequence[str], None] = 'a1c3e5f7b902'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sys_tenants', sa.Column('cert_text_values', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('sys_tenants', 'cert_text_values')

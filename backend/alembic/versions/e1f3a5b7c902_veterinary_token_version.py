"""veterinary_token_version

Agrega sys_veterinaries.token_version: se incrementa al cambiar o restablecer
la contraseña e invalida las sesiones abiertas del portal veterinario (mismo
mecanismo que sys_users.token_version).

Revision ID: e1f3a5b7c902
Revises: c7d4e2f9a615
Create Date: 2026-09-27 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e1f3a5b7c902'
down_revision: Union[str, Sequence[str], None] = 'c7d4e2f9a615'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'sys_veterinaries',
        sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('sys_veterinaries', 'token_version')

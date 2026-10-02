"""catalog_token_message

Mensaje opcional del crematorio por enlace del catálogo de planes. Se muestra
en negrita en el catálogo público, entre el selector de tamaño de la mascota y
los planes.

Revision ID: f4c6e8a0b235
Revises: e3b5d7f9a124
Create Date: 2026-10-02 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f4c6e8a0b235'
down_revision: Union[str, Sequence[str], None] = 'e3b5d7f9a124'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE inv_catalog_tokens ADD COLUMN IF NOT EXISTS message TEXT;")


def downgrade() -> None:
    op.execute("ALTER TABLE inv_catalog_tokens DROP COLUMN IF EXISTS message;")

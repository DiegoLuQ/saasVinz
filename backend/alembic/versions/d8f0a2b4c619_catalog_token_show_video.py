"""catalog_token_show_video

Agrega el campo show_video (BOOLEAN DEFAULT TRUE) a inv_catalog_tokens para
permitir al usuario decidir si un enlace muestra o no el video de bienvenida.

Revision ID: d8f0a2b4c619
Revises: c7e9b1d3f508
Create Date: 2026-11-10 13:35:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'd8f0a2b4c619'
down_revision: Union[str, Sequence[str], None] = 'c7e9b1d3f508'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE inv_catalog_tokens ADD COLUMN IF NOT EXISTS show_video BOOLEAN NOT NULL DEFAULT TRUE;")


def downgrade() -> None:
    op.execute("ALTER TABLE inv_catalog_tokens DROP COLUMN IF EXISTS show_video;")


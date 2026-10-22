"""template_export_recipe

Diseños para redes sin archivo: de cada diseño solo se guarda la ilustración IA
(su propia fila, kind 'illustration'); el diseño final (plantilla + logos +
textos) se guarda como receta JSON en sys_template_exports.meta y se dibuja al
verlo o descargarlo. Por eso media_url pasa a ser opcional.

Revision ID: a5c7e9b1d348
Revises: f3b5d7a9c814
Create Date: 2026-10-21 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a5c7e9b1d348'
down_revision: Union[str, Sequence[str], None] = 'f3b5d7a9c814'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_template_exports ALTER COLUMN media_url DROP NOT NULL;
        ALTER TABLE sys_template_exports ADD COLUMN IF NOT EXISTS meta JSON;
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM sys_template_exports WHERE media_url IS NULL;
        ALTER TABLE sys_template_exports DROP COLUMN IF EXISTS meta;
        ALTER TABLE sys_template_exports ALTER COLUMN media_url SET NOT NULL;
    """)

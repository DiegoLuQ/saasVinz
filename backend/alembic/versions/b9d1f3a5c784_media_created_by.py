"""media_created_by

web_media_library.created_by: usuario que subió el archivo (se toma de la
sesión de la petición en MediaService.upload_media). NULL en archivos antiguos
o creados por procesos sin usuario. Lo muestra el panel «i» de la Biblioteca
de Medios del SuperAdmin.

Revision ID: b9d1f3a5c784
Revises: a7c9e1b3d562
Create Date: 2026-10-21 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b9d1f3a5c784'
down_revision: Union[str, Sequence[str], None] = 'a7c9e1b3d562'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE web_media_library
            ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE web_media_library DROP COLUMN IF EXISTS created_by;")

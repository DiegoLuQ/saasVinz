"""template_exports_kind

sys_template_exports.kind: 'design' (diseño final exportado) | 'illustration'
(ilustración IA que el tenant guardó con "Guardar y usar"). Ambas se listan en
"Mis diseños generados". Incorpora las ilustraciones ya guardadas
(sys_ai_generations.media_url) con el título de su archivo en la biblioteca.

Revision ID: c7e9a1b3d458
Revises: b5d7f9a1c236
Create Date: 2026-10-20 00:30:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c7e9a1b3d458'
down_revision: Union[str, Sequence[str], None] = 'b5d7f9a1c236'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_template_exports ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'design';")
    op.execute("""
        INSERT INTO sys_template_exports (tenant_id, template_id, pet_id, title, media_url, created_by, created_at, kind)
        SELECT g.tenant_id, g.template_id, g.pet_id,
               COALESCE(m.description, 'Ilustración IA'),
               g.media_url, g.user_id, COALESCE(m.created_at, g.created_at), 'illustration'
        FROM sys_ai_generations g
        LEFT JOIN web_media_library m ON m.url = g.media_url
        WHERE g.kind = 'image' AND g.media_url IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM sys_template_exports e WHERE e.media_url = g.media_url);
    """)


def downgrade() -> None:
    op.execute("DELETE FROM sys_template_exports WHERE kind = 'illustration';")
    op.execute("ALTER TABLE sys_template_exports DROP COLUMN IF EXISTS kind;")

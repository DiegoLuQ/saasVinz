"""review_click

Clic en el botón «Dejar mi opinión en Google» del correo de reseña: el botón apunta
a /api/public/review/r/{slug}/{click_token}, que registra el clic y redirige al
enlace de Google del crematorio. `ops_family_notices.click_token` (único),
`clicked_at` (primer clic) y `click_count`.

Revision ID: c1e3f5a7b826
Revises: b9d1e3f5a604
Create Date: 2026-11-12 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c1e3f5a7b826'
down_revision: Union[str, Sequence[str], None] = 'b9d1e3f5a604'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE ops_family_notices ADD COLUMN IF NOT EXISTS click_token VARCHAR(40);")
    op.execute("ALTER TABLE ops_family_notices ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;")
    op.execute("ALTER TABLE ops_family_notices ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uix_family_notice_click_token "
               "ON ops_family_notices (click_token) WHERE click_token IS NOT NULL;")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uix_family_notice_click_token;")
    op.execute("ALTER TABLE ops_family_notices DROP COLUMN IF EXISTS click_count;")
    op.execute("ALTER TABLE ops_family_notices DROP COLUMN IF EXISTS clicked_at;")
    op.execute("ALTER TABLE ops_family_notices DROP COLUMN IF EXISTS click_token;")

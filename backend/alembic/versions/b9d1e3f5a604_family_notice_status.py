"""family_notice_status

Estado de cada aviso a la familia: `ops_family_notices.status` ('sent' = el
servidor de correo lo aceptó, 'failed' = lo rechazó o no respondió) y `error`
(motivo, ≤ 300). Así Configuración → Reseñas en Google lista las invitaciones
programadas, enviadas ✓ y con error (y la tarea reintenta hasta 3 veces).

Revision ID: b9d1e3f5a604
Revises: a7b9c1d3e582
Create Date: 2026-11-12 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'b9d1e3f5a604'
down_revision: Union[str, Sequence[str], None] = 'a7b9c1d3e582'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE ops_family_notices ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'sent';")
    op.execute("ALTER TABLE ops_family_notices ADD COLUMN IF NOT EXISTS error VARCHAR(300);")


def downgrade() -> None:
    op.execute("ALTER TABLE ops_family_notices DROP COLUMN IF EXISTS error;")
    op.execute("ALTER TABLE ops_family_notices DROP COLUMN IF EXISTS status;")

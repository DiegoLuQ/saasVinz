"""tour_content

sys_saas_config.tour_content: contenido editable de la página pública /tour
(video demo + módulos con fotos). Lo edita el SuperAdmin en Admin →
Configuración → «Tour del software». NULL = contenido original del frontend.
Ver app/services/tour_content.py.

Revision ID: e1a3c5f7b928
Revises: d8f0b2c4e917
Create Date: 2026-11-08 23:30:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'e1a3c5f7b928'
down_revision: Union[str, Sequence[str], None] = 'd8f0b2c4e917'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS tour_content JSON;")


def downgrade() -> None:
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS tour_content;")

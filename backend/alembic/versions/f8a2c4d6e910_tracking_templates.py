"""tracking_templates

Agrega configuración de plantillas de diseño para la página pública de seguimiento:
- `sys_saas_config.default_tracking_template` (plantilla por defecto global elegida por SuperAdmin).
- `sys_tenants.tracking_template` (plantilla elegida por el crematorio; NULL = hereda la global).

Revision ID: f8a2c4d6e910
Revises: e7b9d1f3a250
Create Date: 2026-11-16 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'f8a2c4d6e910'
down_revision: Union[str, Sequence[str], None] = 'e7b9d1f3a250'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS default_tracking_template VARCHAR(50) NOT NULL DEFAULT 'classic';"
    )
    op.execute(
        "ALTER TABLE sys_tenants ADD COLUMN IF NOT EXISTS tracking_template VARCHAR(50) NULL;"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE sys_tenants DROP COLUMN IF EXISTS tracking_template;")
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS default_tracking_template;")

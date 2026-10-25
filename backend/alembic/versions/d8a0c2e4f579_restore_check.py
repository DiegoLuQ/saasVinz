"""restore_check

Resultado de la prueba mensual de restauración de respaldos
(services/backup_restore_check.py): el último respaldo de R2 se restaura en una
base temporal, se cuentan registros clave y se borra.

- sys_saas_config.restore_check_at / restore_check_status / restore_check_detail.

Revision ID: d8a0c2e4f579
Revises: c6e8f0a2b468
Create Date: 2026-10-23 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd8a0c2e4f579'
down_revision: Union[str, Sequence[str], None] = 'c6e8f0a2b468'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_saas_config
            ADD COLUMN IF NOT EXISTS restore_check_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS restore_check_status VARCHAR(255),
            ADD COLUMN IF NOT EXISTS restore_check_detail JSON;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE sys_saas_config
            DROP COLUMN IF EXISTS restore_check_detail,
            DROP COLUMN IF EXISTS restore_check_status,
            DROP COLUMN IF EXISTS restore_check_at;
    """)

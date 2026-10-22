"""notification_email

sys_saas_config.notification_email: correo(s) donde llegan los mensajes de los
formularios públicos (demostración guiada, solicitud de memorial). Separados por
coma. Lo edita el SuperAdmin en Configuración → Datos del SaaS; vacío = MAIL_FROM.

Revision ID: d5f7b9c1e238
Revises: c3e5a7b9d126
Create Date: 2026-10-22 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd5f7b9c1e238'
down_revision: Union[str, Sequence[str], None] = 'c3e5a7b9d126'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_saas_config
            ADD COLUMN IF NOT EXISTS notification_email VARCHAR(500);
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS notification_email;")

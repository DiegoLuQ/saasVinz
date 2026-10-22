"""dashboard_slides

sys_saas_config.dashboard_slides: carrusel del banner del inicio de los
crematorios (/dashboard). Hasta 3 diapositivas con imagen, título, mensaje y
botón de WhatsApp. Lo edita el SuperAdmin en Configuración → «Banner del panel».
NULL o vacío = el banner fijo de siempre.

Revision ID: e7a9c1d3f350
Revises: d5f7b9c1e238
Create Date: 2026-10-22 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e7a9c1d3f350'
down_revision: Union[str, Sequence[str], None] = 'd5f7b9c1e238'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_saas_config
            ADD COLUMN IF NOT EXISTS dashboard_slides JSON;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS dashboard_slides;")

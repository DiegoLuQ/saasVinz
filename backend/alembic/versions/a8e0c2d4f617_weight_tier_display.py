"""weight_tier_display (ícono y ejemplos de cada rango de peso)

srv_weight_pricing.icon_url (imagen subida por el crematorio, sin emojis) y
examples (texto corto, ej. «Gatos, Chihuahuas»): se muestran en las tarjetas de
tamaño del catálogo de planes. Aplica a los rangos de la General y de cada tabla
de precios. Ambos opcionales.

Revision ID: a8e0c2d4f617
Revises: f6c8e0a2b419
Create Date: 2026-11-05 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'a8e0c2d4f617'
down_revision: Union[str, Sequence[str], None] = 'f6c8e0a2b419'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE srv_weight_pricing ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500);
        ALTER TABLE srv_weight_pricing ADD COLUMN IF NOT EXISTS examples VARCHAR(60);
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE srv_weight_pricing DROP COLUMN IF EXISTS icon_url;
        ALTER TABLE srv_weight_pricing DROP COLUMN IF EXISTS examples;
    """)

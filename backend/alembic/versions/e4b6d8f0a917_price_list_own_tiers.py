"""price_list_own_tiers (tablas de precios con rangos propios)

Servidores que ya aplicaron la primera versión de d2a4c6e8f795 (tablas que solo
cambiaban precios de los rangos de la General) no tienen las columnas nuevas.
Idempotente: en bases creadas con la versión actual de d2a4c6e8f795 no hace nada.
- srv_weight_pricing.price_list_id: rangos propios de cada tabla (NULL = General).
- oc_financial.price_list_id: la orden recuerda la tabla de su solicitud.
- srv_price_lists.tier_prices: ya no se usa (cada tabla trae sus rangos).

Revision ID: e4b6d8f0a917
Revises: d2a4c6e8f795
Create Date: 2026-11-05 03:30:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'e4b6d8f0a917'
down_revision: Union[str, Sequence[str], None] = 'd2a4c6e8f795'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE srv_weight_pricing ADD COLUMN IF NOT EXISTS price_list_id INTEGER
            REFERENCES srv_price_lists(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS ix_srv_weight_pricing_price_list ON srv_weight_pricing(price_list_id);
        ALTER TABLE oc_financial ADD COLUMN IF NOT EXISTS price_list_id INTEGER
            REFERENCES srv_price_lists(id) ON DELETE SET NULL;
        ALTER TABLE srv_price_lists DROP COLUMN IF EXISTS tier_prices;
    """)


def downgrade() -> None:
    # Las columnas pertenecen al esquema de d2a4c6e8f795 (versión actual); no se quitan aquí.
    pass

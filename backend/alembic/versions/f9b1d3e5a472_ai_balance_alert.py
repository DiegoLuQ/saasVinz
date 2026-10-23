"""ai_balance_alert

sys_saas_config.ai_balance_alert_usd: avisar al SuperAdmin cuando el saldo
disponible en OpenRouter (cuenta o tope de la clave) baja de este monto.
NULL o 0 = sin aviso. ai_balance_alert_state guarda el último estado por clave
({key_hint: "low"|"error"|"ok"}) para avisar una sola vez por cada cruce.

Revision ID: f9b1d3e5a472
Revises: e7a9c1d3f350
Create Date: 2026-10-23 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f9b1d3e5a472'
down_revision: Union[str, Sequence[str], None] = 'e7a9c1d3f350'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_saas_config
            ADD COLUMN IF NOT EXISTS ai_balance_alert_usd NUMERIC(10, 2) DEFAULT 2,
            ADD COLUMN IF NOT EXISTS ai_balance_alert_state JSON;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE sys_saas_config
            DROP COLUMN IF EXISTS ai_balance_alert_state,
            DROP COLUMN IF EXISTS ai_balance_alert_usd;
    """)

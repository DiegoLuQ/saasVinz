"""ai_credit_plan_prices

Precio del crédito IA extra según el plan del crematorio y conversión a CLP:
- sys_subscription_plans.ai_extra_credit_price_usd: precio de 1 crédito extra
  para los tenants de ese plan (FREE/Track 0,99 · NORMAL 0,89 · PRO 0,75 ·
  ULTRA 0,59). NULL = usa sys_saas_config.ai_credit_price_usd.
- sys_saas_config.usd_clp_rate: tipo de cambio fijo (CLP por 1 USD) que edita
  el SuperAdmin. Reemplaza al precio fijo en CLP (ai_credit_price_clp), que se
  convierte en tipo de cambio si estaba configurado; si no, parte en 950 (el
  SuperAdmin lo ajusta). Siempre hay tipo de cambio: se cobra en CLP y USD.
- sys_ai_credit_purchases.usd_clp_rate: tipo de cambio usado en la solicitud
  (el monto no cambia mientras se espera la transferencia).

Revision ID: a7c9e1b3d562
Revises: e5a7c9d1f238
Create Date: 2026-10-20 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a7c9e1b3d562'
down_revision: Union[str, Sequence[str], None] = 'e5a7c9d1f238'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_subscription_plans ADD COLUMN IF NOT EXISTS ai_extra_credit_price_usd NUMERIC(10, 2);")
    op.execute("""
        UPDATE sys_subscription_plans SET ai_extra_credit_price_usd = CASE UPPER(name)
            WHEN 'FREE' THEN 0.99 WHEN 'TRACK' THEN 0.99 WHEN 'NORMAL' THEN 0.89
            WHEN 'PRO' THEN 0.75 WHEN 'ULTRA' THEN 0.59 ELSE NULL END;
    """)

    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS usd_clp_rate INTEGER;")
    op.execute("""
        UPDATE sys_saas_config SET usd_clp_rate = ROUND(ai_credit_price_clp / ai_credit_price_usd)
        WHERE usd_clp_rate IS NULL AND ai_credit_price_clp IS NOT NULL AND ai_credit_price_usd > 0;
    """)
    op.execute("UPDATE sys_saas_config SET usd_clp_rate = 950 WHERE usd_clp_rate IS NULL;")
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS ai_credit_price_clp;")

    op.execute("ALTER TABLE sys_ai_credit_purchases ADD COLUMN IF NOT EXISTS usd_clp_rate INTEGER;")


def downgrade() -> None:
    op.execute("ALTER TABLE sys_ai_credit_purchases DROP COLUMN IF EXISTS usd_clp_rate;")
    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS ai_credit_price_clp INTEGER;")
    op.execute("""
        UPDATE sys_saas_config SET ai_credit_price_clp = ROUND(usd_clp_rate * ai_credit_price_usd)
        WHERE usd_clp_rate IS NOT NULL;
    """)
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS usd_clp_rate;")
    op.execute("ALTER TABLE sys_subscription_plans DROP COLUMN IF EXISTS ai_extra_credit_price_usd;")

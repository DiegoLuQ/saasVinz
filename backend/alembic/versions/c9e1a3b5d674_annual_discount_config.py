"""annual_discount_config

Descuento anual configurable por el SuperAdmin (uno para todos los planes) y
precio congelado por crematorio:

- sys_saas_config.annual_discount_pct (25) / annual_discount_launch (true =
  mostrarlo como "precio de lanzamiento para los primeros crematorios").
- sys_tenants.contracted_price: monto por ciclo que paga el crematorio. Se fija
  al aprobarse su contratación (o al sincronizar Polar) y no cambia si después
  cambian el descuento o el precio del plan. Se rellena para los crematorios con
  plan de pago con lo que pagan hoy (MRR de sys_tenant_billing_info × meses del
  ciclo; si no hay, el precio de lista de su plan).

Revision ID: c9e1a3b5d674
Revises: b7d9f1a3c562
Create Date: 2026-10-20 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c9e1a3b5d674'
down_revision: Union[str, Sequence[str], None] = 'b7d9f1a3c562'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sys_saas_config', sa.Column('annual_discount_pct', sa.Integer(), nullable=False, server_default='25'))
    op.add_column('sys_saas_config', sa.Column('annual_discount_launch', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('sys_tenants', sa.Column('contracted_price', sa.Float(), nullable=True))

    # mrr = lo que paga hoy al mes (sys_tenant_billing_info), NULL si no hay o es 0.
    op.execute("""
        WITH s AS (
            SELECT tt.id AS tenant_id, NULLIF(MAX(bi.monthly_price), 0) AS mrr
              FROM sys_tenants tt
              LEFT JOIN sys_tenant_billing_info bi ON bi.tenant_id = tt.id
             GROUP BY tt.id
        )
        UPDATE sys_tenants t
           SET contracted_price = CASE
                   WHEN t.billing_cycle = 'annual'
                       THEN COALESCE(s.mrr * 12, p.annual_price, p.price * 12)
                   WHEN t.billing_cycle = 'semiannual' THEN COALESCE(s.mrr, p.price) * 6
                   WHEN t.billing_cycle = 'bimonthly' THEN COALESCE(s.mrr, p.price) * 2
                   ELSE COALESCE(s.mrr, p.price)
               END
          FROM sys_subscription_plans p, s
         WHERE s.tenant_id = t.id
           AND p.id = t.subscription_plan_id
           AND p.price > 0
    """)


def downgrade() -> None:
    op.drop_column('sys_tenants', 'contracted_price')
    op.drop_column('sys_saas_config', 'annual_discount_launch')
    op.drop_column('sys_saas_config', 'annual_discount_pct')

"""annual_launch_discount

Precio de lanzamiento: el pago anual de todos los planes de pago cuesta 12
meses con 25 % de descuento (precio mensual × 12 × 0,75). Antes cada plan tenía
un descuento distinto (NORMAL −37 %, PRO −17 %, ULTRA −30 %) y Track no tenía
precio anual. annual_price es lo que se cobra (billing/change-plan-request,
Polar) y lo que muestran la landing y la página de planes.

Revision ID: b7d9f1a3c562
Revises: a5c7e9b1d348
Create Date: 2026-10-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7d9f1a3c562'
down_revision: Union[str, Sequence[str], None] = 'a5c7e9b1d348'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        UPDATE sys_subscription_plans
           SET annual_price = ROUND((price * 12 * 0.75)::numeric)
         WHERE price > 0
    """)


def downgrade() -> None:
    # Los precios anuales anteriores no se guardan: se ajustan desde el panel de planes.
    pass

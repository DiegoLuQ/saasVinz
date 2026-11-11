"""transport_zones

Cobro de traslado por comuna (zonas): `sys_tenants.transport_config` (zonas con
precio y sus comunas + qué se cobra) y en la orden `oc_financial.transport_price`
(monto, como weight_price) + `transport_detail` (copia: comuna/zona/precio de
retiro y entrega). Lógica en app/services/transport.py.

Revision ID: a7b9c1d3e582
Revises: d8f0a2b4c619
Create Date: 2026-11-11 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'a7b9c1d3e582'
down_revision: Union[str, Sequence[str], None] = 'd8f0a2b4c619'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_tenants ADD COLUMN IF NOT EXISTS transport_config JSON;")
    op.execute("ALTER TABLE oc_financial ADD COLUMN IF NOT EXISTS transport_price DOUBLE PRECISION NOT NULL DEFAULT 0;")
    op.execute("ALTER TABLE oc_financial ADD COLUMN IF NOT EXISTS transport_detail JSON;")


def downgrade() -> None:
    op.execute("ALTER TABLE oc_financial DROP COLUMN IF EXISTS transport_detail;")
    op.execute("ALTER TABLE oc_financial DROP COLUMN IF EXISTS transport_price;")
    op.execute("ALTER TABLE sys_tenants DROP COLUMN IF EXISTS transport_config;")

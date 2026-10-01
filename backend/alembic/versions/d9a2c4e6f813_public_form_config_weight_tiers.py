"""public_form_config_weight_tiers

Formulario público configurable por crematorio y tramos de peso con nombre:

- sys_tenants.form_config (JSON, nullable): qué campos opcionales del
  formulario que se envía a la familia se muestran y cuáles son obligatorios,
  y si los tramos de peso muestran su precio. NULL = comportamiento previo
  (ver app/services/public_form_config.py, DEFAULT_FIELDS).
- srv_weight_pricing.label (nullable): nombre visible del tramo ("Pequeño").
  Los tramos pasan a definirse como "hasta X kg" (el mínimo es el máximo del
  tramo anterior; el último puede quedar abierto con max_weight NULL). Las
  filas existentes siguen funcionando sin cambios.

Revision ID: d9a2c4e6f813
Revises: c5f7a9b1d258
Create Date: 2026-09-30 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd9a2c4e6f813'
down_revision: Union[str, Sequence[str], None] = 'c5f7a9b1d258'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_tenants ADD COLUMN IF NOT EXISTS form_config JSON;
        ALTER TABLE srv_weight_pricing ADD COLUMN IF NOT EXISTS label VARCHAR(40);
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE srv_weight_pricing DROP COLUMN IF EXISTS label;
        ALTER TABLE sys_tenants DROP COLUMN IF EXISTS form_config;
    """)

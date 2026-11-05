"""plan_name_per_group (el nombre del plan es único dentro de su grupo)

Igual que los servicios: el mismo nombre de plan puede existir en grupos
distintos. La unicidad pasa de (tenant, nombre) a (tenant, nombre, grupo).

Revision ID: c0f2b4d6e683
Revises: b8e0a2c4d571
Create Date: 2026-11-04 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'c0f2b4d6e683'
down_revision: Union[str, Sequence[str], None] = 'b8e0a2c4d571'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE srv_plans DROP CONSTRAINT IF EXISTS uix_plan_name_tenant")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uix_plan_name_group_tenant "
        "ON srv_plans (tenant_id, name, COALESCE(group_name, ''))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uix_plan_name_group_tenant")
    # Falla si quedaron nombres repetidos en grupos distintos: renombrarlos antes.
    op.create_unique_constraint('uix_plan_name_tenant', 'srv_plans', ['tenant_id', 'name'])

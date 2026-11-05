"""service_groups (grupo de cada servicio, solo para ordenar el panel)

srv_services.group_name: texto libre (≤ 60), NULL = «Sin grupo». El mismo
nombre de servicio puede existir en grupos distintos, así que la unicidad pasa
de (tenant, nombre) a (tenant, nombre, grupo).

Revision ID: a6c8e0b2d359
Revises: f4c6e8a0b247
Create Date: 2026-11-04 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a6c8e0b2d359'
down_revision: Union[str, Sequence[str], None] = 'f4c6e8a0b247'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('srv_services', sa.Column('group_name', sa.String(60), nullable=True))
    op.execute("ALTER TABLE srv_services DROP CONSTRAINT IF EXISTS uix_service_name_tenant")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uix_service_name_group_tenant "
        "ON srv_services (tenant_id, name, COALESCE(group_name, ''))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uix_service_name_group_tenant")
    op.drop_column('srv_services', 'group_name')
    # Si quedaron nombres repetidos en grupos distintos esto falla: hay que renombrarlos antes.
    op.create_unique_constraint('uix_service_name_tenant', 'srv_services', ['tenant_id', 'name'])

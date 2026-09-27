"""farewell_form_per_tenant

Tarjeta de homenaje del formulario personalizada por crematorio:
- ops_farewell_templates.is_locked: copia exclusiva de un tenant creada por el
  SuperAdmin; el tenant la usa pero no puede editarla ni borrarla (mismo
  criterio que las plantillas de certificado exclusivas).
- sys_tenants.form_farewell_template_id: tarjeta que usa el formulario público
  (y el expediente) de ese tenant. NULL = global predeterminada.

Revision ID: b9d4e6f8a025
Revises: a8c3d5e7f914
Create Date: 2026-09-27 16:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b9d4e6f8a025'
down_revision: Union[str, Sequence[str], None] = 'a8c3d5e7f914'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'ops_farewell_templates',
        sa.Column('is_locked', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'sys_tenants',
        sa.Column('form_farewell_template_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_tenants_form_farewell_template', 'sys_tenants', 'ops_farewell_templates',
        ['form_farewell_template_id'], ['id'], ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_tenants_form_farewell_template', 'sys_tenants', type_='foreignkey')
    op.drop_column('sys_tenants', 'form_farewell_template_id')
    op.drop_column('ops_farewell_templates', 'is_locked')

"""image_templates_tenant

Plantillas de imagen exclusivas: sys_image_templates.tenant_id (NULL = global,
visible para todos los crematorios; con valor = solo ese tenant la ve y usa).
Solo el SuperAdmin crea y edita las plantillas.

Revision ID: c5e7a9b2d146
Revises: b2d4f6a8c135
Create Date: 2026-10-18 23:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c5e7a9b2d146'
down_revision: Union[str, Sequence[str], None] = 'b2d4f6a8c135'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_image_templates
            ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES sys_tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS ix_sys_image_templates_tenant_id ON sys_image_templates(tenant_id);
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_sys_image_templates_tenant_id;")
    op.execute("ALTER TABLE sys_image_templates DROP COLUMN IF EXISTS tenant_id;")

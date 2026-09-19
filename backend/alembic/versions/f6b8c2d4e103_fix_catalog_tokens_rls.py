"""fix_catalog_tokens_rls

Actualiza la política tenant_isolation_policy de inv_catalog_tokens para
soportar app.bypass_rls = 'true'/'on'/'1' y cláusula WITH CHECK explícita,
permitiendo inserciones de usuarios creator y tenant.

Revision ID: f6b8c2d4e103
Revises: e5a9b7c1d302
Create Date: 2026-09-19 13:35:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f6b8c2d4e103'
down_revision: Union[str, Sequence[str], None] = 'e5a9b7c1d302'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DROP POLICY IF EXISTS tenant_isolation_policy ON inv_catalog_tokens;
        CREATE POLICY tenant_isolation_policy ON inv_catalog_tokens
            FOR ALL
            USING (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            )
            WITH CHECK (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            );
    """)


def downgrade() -> None:
    op.execute("""
        DROP POLICY IF EXISTS tenant_isolation_policy ON inv_catalog_tokens;
        CREATE POLICY tenant_isolation_policy ON inv_catalog_tokens
            FOR ALL
            USING (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) = 'true')
            );
    """)

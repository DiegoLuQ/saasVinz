"""inv_catalog_tokens

Crea la tabla inv_catalog_tokens con RLS (Row Level Security) y permisos
para el catálogo online compartido con token de vencimiento por tenant.

Revision ID: e5a9b7c1d302
Revises: d8e3b6a2f147
Create Date: 2026-09-19 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a9b7c1d302'
down_revision: Union[str, Sequence[str], None] = 'd8e3b6a2f147'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS inv_catalog_tokens (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            token VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(100),
            expires_at TIMESTAMPTZ,
            is_active BOOLEAN NOT NULL DEFAULT true,
            views_count INTEGER NOT NULL DEFAULT 0,
            last_viewed_at TIMESTAMPTZ,
            created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_inv_catalog_tokens_tenant_id ON inv_catalog_tokens(tenant_id);
        CREATE INDEX IF NOT EXISTS ix_inv_catalog_tokens_token ON inv_catalog_tokens(token);
        CREATE INDEX IF NOT EXISTS ix_inv_catalog_tokens_id ON inv_catalog_tokens(id);
        ALTER TABLE inv_catalog_tokens ENABLE ROW LEVEL SECURITY;
        ALTER TABLE inv_catalog_tokens FORCE ROW LEVEL SECURITY;
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
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON inv_catalog_tokens TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE inv_catalog_tokens_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS inv_catalog_tokens CASCADE;")

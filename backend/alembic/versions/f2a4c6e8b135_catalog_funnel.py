"""catalog_funnel

Embudo del catálogo de planes (services/catalog_funnel.py):

- inv_catalog_events: lo que hace cada visitante anónimo en un enlace de
  catálogo (view, size_select, plan_request, whatsapp, form_open). Sin datos
  personales ni IP: solo un id de sesión aleatorio del navegador. El índice
  único deja una fila por sesión + evento + plan + peso, así recargar no infla.
  Con RLS.
- web_form_submissions.catalog_token_id: el formulario enviado desde un
  catálogo queda ligado a su enlace, para seguir si terminó en orden.

Revision ID: f2a4c6e8b135
Revises: e0b2d4f6a681
Create Date: 2026-11-01 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f2a4c6e8b135'
down_revision: Union[str, Sequence[str], None] = 'e0b2d4f6a681'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS inv_catalog_events (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            catalog_token_id INTEGER NOT NULL REFERENCES inv_catalog_tokens(id) ON DELETE CASCADE,
            kind VARCHAR(20) NOT NULL,          -- view | size_select | plan_request | whatsapp | form_open
            plan_id INTEGER,                    -- sin FK: el plan puede borrarse y el historial queda
            weight_tier VARCHAR(40),
            session_id VARCHAR(40) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uix_inv_catalog_events_once
            ON inv_catalog_events (catalog_token_id, session_id, kind, COALESCE(plan_id, 0), COALESCE(weight_tier, ''));
        CREATE INDEX IF NOT EXISTS ix_inv_catalog_events_tenant_created ON inv_catalog_events(tenant_id, created_at);
        CREATE INDEX IF NOT EXISTS ix_inv_catalog_events_created ON inv_catalog_events(created_at);

        ALTER TABLE inv_catalog_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE inv_catalog_events FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON inv_catalog_events;
        CREATE POLICY tenant_isolation_policy ON inv_catalog_events
            FOR ALL
            USING (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            )
            WITH CHECK (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            );

        ALTER TABLE web_form_submissions ADD COLUMN IF NOT EXISTS catalog_token_id INTEGER
            REFERENCES inv_catalog_tokens(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS ix_web_form_submissions_catalog_token ON web_form_submissions(catalog_token_id);
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON inv_catalog_events TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE inv_catalog_events_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS ix_web_form_submissions_catalog_token;
        ALTER TABLE web_form_submissions DROP COLUMN IF EXISTS catalog_token_id;
        DROP TABLE IF EXISTS inv_catalog_events CASCADE;
    """)

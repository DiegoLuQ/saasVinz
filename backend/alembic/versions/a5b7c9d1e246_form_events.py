"""form_events

web_form_events: hasta dónde llega cada familia en el FORMULARIO OFICIAL del
crematorio (Configuración → Enlaces oficiales) y qué toca (services/form_funnel.py).
Sin datos personales ni IP: solo un id de sesión aleatorio del navegador. El índice
único deja una fila por sesión + formulario + evento + detalle (la primera: su hora
sirve para medir el tiempo por paso), así recargar no infla. Con RLS.

Revision ID: a5b7c9d1e246
Revises: f3c5e7a9b140
Create Date: 2026-11-09 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'a5b7c9d1e246'
down_revision: Union[str, Sequence[str], None] = 'f3c5e7a9b140'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS web_form_events (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            form_id VARCHAR(60) NOT NULL,       -- 'main' o id del formulario personalizado
            session_id VARCHAR(40) NOT NULL,
            kind VARCHAR(30) NOT NULL,
            detail VARCHAR(60) NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uix_web_form_events_once
            ON web_form_events (tenant_id, form_id, session_id, kind, detail);
        CREATE INDEX IF NOT EXISTS ix_web_form_events_tenant_created ON web_form_events(tenant_id, created_at);
        CREATE INDEX IF NOT EXISTS ix_web_form_events_created ON web_form_events(created_at);

        ALTER TABLE web_form_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE web_form_events FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON web_form_events;
        CREATE POLICY tenant_isolation_policy ON web_form_events
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON web_form_events TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE web_form_events_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS web_form_events;")

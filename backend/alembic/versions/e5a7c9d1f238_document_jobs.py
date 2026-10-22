"""document_jobs

sys_document_jobs: documentos que se generan en segundo plano desde la orden
(hoy la imagen para redes con IA, que puede tardar 1-2 minutos). El crematorio
la pide y sigue trabajando; el estado (queued/running/done/error) se consulta
desde la ficha de la orden. Con RLS.

Revision ID: e5a7c9d1f238
Revises: d1f3b5c7e896
Create Date: 2026-10-20 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e5a7c9d1f238'
down_revision: Union[str, Sequence[str], None] = 'd1f3b5c7e896'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_document_jobs (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            cremation_id INTEGER,
            pet_id INTEGER,
            kind VARCHAR(20) NOT NULL DEFAULT 'social',
            template_id INTEGER,
            status VARCHAR(20) NOT NULL DEFAULT 'queued',
            detail VARCHAR(300),
            error TEXT,
            export_id INTEGER,
            ai_session_id INTEGER REFERENCES sys_ai_design_sessions(id) ON DELETE SET NULL,
            created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            started_at TIMESTAMPTZ,
            finished_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS ix_sys_document_jobs_tenant ON sys_document_jobs(tenant_id, created_at);
        CREATE INDEX IF NOT EXISTS ix_sys_document_jobs_cremation ON sys_document_jobs(cremation_id);
        ALTER TABLE sys_document_jobs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sys_document_jobs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON sys_document_jobs;
        CREATE POLICY tenant_isolation_policy ON sys_document_jobs
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_document_jobs TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_document_jobs_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_document_jobs CASCADE;")

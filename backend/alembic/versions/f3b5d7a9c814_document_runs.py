"""document_runs

sys_document_runs: una fila por cada "Generar todo" del detalle de un registro
(registro + certificado + tarjeta + imagen para redes). Guarda el tiempo total y
de cada paso, si usó un crédito IA y el costo real de la IA, para medir el
consumo. Con RLS.

Revision ID: f3b5d7a9c814
Revises: e1a3c5d7f692
Create Date: 2026-10-21 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f3b5d7a9c814'
down_revision: Union[str, Sequence[str], None] = 'e1a3c5d7f692'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_document_runs (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            submission_id INTEGER,
            cremation_id INTEGER,
            pet_id INTEGER,
            ai_session_id INTEGER REFERENCES sys_ai_design_sessions(id) ON DELETE SET NULL,
            steps JSON NOT NULL DEFAULT '[]',
            total_ms INTEGER NOT NULL DEFAULT 0,
            ok_count INTEGER NOT NULL DEFAULT 0,
            error_count INTEGER NOT NULL DEFAULT 0,
            credits_used INTEGER NOT NULL DEFAULT 0,
            ai_cost_usd NUMERIC(10, 5) NOT NULL DEFAULT 0,
            created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_sys_document_runs_tenant ON sys_document_runs(tenant_id, created_at);
        ALTER TABLE sys_document_runs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sys_document_runs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON sys_document_runs;
        CREATE POLICY tenant_isolation_policy ON sys_document_runs
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_document_runs TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_document_runs_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_document_runs CASCADE;")

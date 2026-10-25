"""business_metrics

Métricas del negocio para el SuperAdmin (services/business_metrics.py):

- sys_users.last_seen_at: último uso del panel (login, renovación de sesión o
  carga del panel, como mucho cada 10 min). Mide qué crematorios están activos.
- sys_tenant_events: historial de altas, cambios de plan y de estado de cada
  crematorio (lo registra solo un listener de SQLAlchemy, services/tenant_events.py),
  para contar altas, subidas y bajas por mes. Con RLS.

Revision ID: e0b2d4f6a681
Revises: d8a0c2e4f579
Create Date: 2026-10-24 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e0b2d4f6a681'
down_revision: Union[str, Sequence[str], None] = 'd8a0c2e4f579'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

        CREATE TABLE IF NOT EXISTS sys_tenant_events (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            kind VARCHAR(30) NOT NULL,          -- created | plan_change | status_change
            from_value VARCHAR(60),
            to_value VARCHAR(60),
            from_mrr DOUBLE PRECISION,          -- equivalente mensual antes / después
            to_mrr DOUBLE PRECISION,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_sys_tenant_events_created ON sys_tenant_events(created_at);
        CREATE INDEX IF NOT EXISTS ix_sys_tenant_events_tenant ON sys_tenant_events(tenant_id);

        ALTER TABLE sys_tenant_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sys_tenant_events FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON sys_tenant_events;
        CREATE POLICY tenant_isolation_policy ON sys_tenant_events
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_tenant_events TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_tenant_events_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS sys_tenant_events CASCADE;
        ALTER TABLE sys_users DROP COLUMN IF EXISTS last_seen_at;
    """)

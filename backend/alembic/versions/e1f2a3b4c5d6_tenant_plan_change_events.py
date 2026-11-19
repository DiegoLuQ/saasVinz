"""tenant_plan_change_events

Crea la tabla `srv_plan_change_events` para registrar hitos automáticos y manuales
de cambios en planes propios de cada crematorio (servicios incluidos, productos,
precios) y medir su impacto antes/después en órdenes, ticket promedio e ingresos.

Revision ID: e1f2a3b4c5d6
Revises: d9e1f3a5b7c9
Create Date: 2026-11-17 20:45:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd9e1f3a5b7c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS srv_plan_change_events (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            plan_id INTEGER NULL REFERENCES srv_plans(id) ON DELETE SET NULL,
            plan_name VARCHAR(120) NULL,
            event_type VARCHAR(30) NOT NULL DEFAULT 'auto_diff',
            title VARCHAR(200) NOT NULL,
            notes TEXT NULL,
            changes JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_by INTEGER NULL REFERENCES sys_users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_srv_plan_change_events_tenant_created
            ON srv_plan_change_events (tenant_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS ix_srv_plan_change_events_plan_id
            ON srv_plan_change_events (plan_id);

        ALTER TABLE srv_plan_change_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE srv_plan_change_events FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON srv_plan_change_events;
        CREATE POLICY tenant_isolation_policy ON srv_plan_change_events
            FOR ALL
            USING (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            )
            WITH CHECK (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            );
        """
    )

    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    roles_to_check = {'vinzer_app', 'vincer_app'}
    try:
        configured_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username
        if configured_user and configured_user.replace('_', '').isalnum():
            roles_to_check.add(configured_user)
    except Exception:
        pass

    for role in roles_to_check:
        op.execute(f"""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
                    GRANT SELECT, INSERT, UPDATE, DELETE ON srv_plan_change_events TO "{role}";
                    GRANT USAGE, SELECT ON SEQUENCE srv_plan_change_events_id_seq TO "{role}";
                END IF;
            END $$;
        """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS srv_plan_change_events;")

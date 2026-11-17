"""module_clicks_telemetry

Agrega soporte para telemetría optimizada y agregada de clics en el sidebar:
- `sys_saas_config.module_tracking_enabled` (interruptor On/Off global, default False).
- `sys_module_clicks_daily` (contadores diarios agregados por tenant y módulo con índice único).

Revision ID: b7e9c1d3f5a2
Revises: f8a2c4d6e910
Create Date: 2026-11-16 21:40:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'b7e9c1d3f5a2'
down_revision: Union[str, Sequence[str], None] = 'f8a2c4d6e910'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS module_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE;"
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sys_module_clicks_daily (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            module_key VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            click_count INTEGER NOT NULL DEFAULT 1,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_sys_module_clicks_daily_tenant_id ON sys_module_clicks_daily(tenant_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_sys_module_clicks_daily_module_key ON sys_module_clicks_daily(module_key);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_sys_module_clicks_daily_date ON sys_module_clicks_daily(date);"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_module_clicks_tenant_module_date ON sys_module_clicks_daily(tenant_id, module_key, date);"
    )
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    """El rol de la app (no dueño de las tablas) debe poder leer y escribir."""
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_module_clicks_daily TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_module_clicks_daily_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_module_clicks_daily;")
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS module_tracking_enabled;")

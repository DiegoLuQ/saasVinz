"""plan_change_events

Crea la tabla `sys_plan_change_events` para registrar hitos automáticos y manuales
de cambios en planes de suscripción (módulos, precios, límites) y medir su impacto
antes/después en ventas, upgrades e ingresos.

Revision ID: d9e1f3a5b7c9
Revises: c8d0e2f4a6b8
Create Date: 2026-11-17 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'd9e1f3a5b7c9'
down_revision: Union[str, Sequence[str], None] = 'c8d0e2f4a6b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sys_plan_change_events (
            id SERIAL PRIMARY KEY,
            plan_id INTEGER NULL REFERENCES sys_subscription_plans(id) ON DELETE SET NULL,
            plan_name VARCHAR(80) NULL,
            event_type VARCHAR(30) NOT NULL DEFAULT 'auto_diff',
            title VARCHAR(200) NOT NULL,
            notes TEXT NULL,
            changes JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_by INTEGER NULL REFERENCES sys_users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_sys_plan_change_events_created_at
            ON sys_plan_change_events (created_at DESC);
        CREATE INDEX IF NOT EXISTS ix_sys_plan_change_events_plan_id
            ON sys_plan_change_events (plan_id);
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
                    GRANT SELECT, INSERT, UPDATE, DELETE ON sys_plan_change_events TO "{role}";
                    GRANT USAGE, SELECT ON SEQUENCE sys_plan_change_events_id_seq TO "{role}";
                END IF;
            END $$;
        """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_plan_change_events;")

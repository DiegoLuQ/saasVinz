"""ai_credits

Fase 2 de créditos IA:
- sys_subscription_plans.ai_monthly_credits: créditos que el plan entrega cada
  mes (NORMAL 3, PRO 7, ULTRA 10; el resto 0). No se acumulan.
- sys_saas_config: precio del crédito (USD 1, puede subir), intentos por
  crédito (3) y días de vigencia de un diseño abierto (7).
- sys_ai_credit_balances: saldo por tenant (bolsillo mensual + extra).
- sys_ai_credit_ledger: historial de movimientos (asignación mensual,
  vencimiento, regalo, compra, consumo, devolución, ajuste).
- sys_ai_design_sessions: cada crédito usado = un diseño (plantilla +
  mascota) con N intentos.
- sys_ai_generations.session_id: a qué diseño pertenece cada generación.
Las tablas por tenant tienen RLS.

Revision ID: e9b1d3f5a370
Revises: d7f9b1c3e258
Create Date: 2026-10-19 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e9b1d3f5a370'
down_revision: Union[str, Sequence[str], None] = 'd7f9b1c3e258'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_RLS_TABLES = ("sys_ai_credit_balances", "sys_ai_credit_ledger", "sys_ai_design_sessions")


def _rls(table: str) -> str:
    return f"""
        ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE {table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON {table};
        CREATE POLICY tenant_isolation_policy ON {table}
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


def upgrade() -> None:
    op.execute("ALTER TABLE sys_subscription_plans ADD COLUMN IF NOT EXISTS ai_monthly_credits INTEGER NOT NULL DEFAULT 0;")
    op.execute("""
        UPDATE sys_subscription_plans SET ai_monthly_credits = CASE UPPER(name)
            WHEN 'NORMAL' THEN 3 WHEN 'PRO' THEN 7 WHEN 'ULTRA' THEN 10 ELSE 0 END;
    """)

    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS ai_credit_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 1.00;")
    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS ai_attempts_per_credit INTEGER NOT NULL DEFAULT 3;")
    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS ai_session_days INTEGER NOT NULL DEFAULT 7;")

    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_ai_credit_balances (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL UNIQUE REFERENCES sys_tenants(id) ON DELETE CASCADE,
            period VARCHAR(7) NOT NULL,
            monthly_granted INTEGER NOT NULL DEFAULT 0,
            monthly_remaining INTEGER NOT NULL DEFAULT 0,
            extra_remaining INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sys_ai_design_sessions (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            template_id INTEGER REFERENCES sys_image_templates(id) ON DELETE SET NULL,
            pet_id INTEGER,
            bucket VARCHAR(10) NOT NULL,
            attempts_used INTEGER NOT NULL DEFAULT 0,
            max_attempts INTEGER NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_sys_ai_design_sessions_tenant ON sys_ai_design_sessions(tenant_id, created_at);

        CREATE TABLE IF NOT EXISTS sys_ai_credit_ledger (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            bucket VARCHAR(10) NOT NULL,
            delta INTEGER NOT NULL,
            reason VARCHAR(20) NOT NULL,
            note TEXT,
            session_id INTEGER REFERENCES sys_ai_design_sessions(id) ON DELETE SET NULL,
            created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_sys_ai_credit_ledger_tenant ON sys_ai_credit_ledger(tenant_id, created_at);

        ALTER TABLE sys_ai_generations ADD COLUMN IF NOT EXISTS session_id INTEGER
            REFERENCES sys_ai_design_sessions(id) ON DELETE SET NULL;
    """)
    for table in _RLS_TABLES:
        op.execute(_rls(table))
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    grants = "\n".join(
        f'GRANT SELECT, INSERT, UPDATE, DELETE ON {t} TO "{app_user}";\n'
        f'GRANT USAGE, SELECT ON SEQUENCE {t}_id_seq TO "{app_user}";'
        for t in _RLS_TABLES
    )
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                {grants}
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE sys_ai_generations DROP COLUMN IF EXISTS session_id;")
    op.execute("DROP TABLE IF EXISTS sys_ai_credit_ledger CASCADE;")
    op.execute("DROP TABLE IF EXISTS sys_ai_design_sessions CASCADE;")
    op.execute("DROP TABLE IF EXISTS sys_ai_credit_balances CASCADE;")
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS ai_session_days;")
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS ai_attempts_per_credit;")
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS ai_credit_price_usd;")
    op.execute("ALTER TABLE sys_subscription_plans DROP COLUMN IF EXISTS ai_monthly_credits;")

"""ai_credit_purchases

Compra de créditos IA por transferencia u otros medios:
- sys_saas_config.payment_bank_info: datos de transferencia de Vinzer (JSON:
  holder_name, rut, bank, account_type, account_number, email).
- sys_saas_config.payment_other_instructions: instrucciones de otros medios.
- sys_saas_config.ai_credit_price_clp: precio opcional del crédito en CLP
  (monto a transferir); el precio de referencia sigue siendo el USD.
- sys_ai_credit_purchases: solicitudes de compra del tenant (pendiente →
  aprobada/rechazada/cancelada). Al aprobar se suman al saldo extra. Con RLS.

Revision ID: f1c3e5a7b482
Revises: e9b1d3f5a370
Create Date: 2026-10-19 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f1c3e5a7b482'
down_revision: Union[str, Sequence[str], None] = 'e9b1d3f5a370'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS payment_bank_info JSON;")
    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS payment_other_instructions TEXT;")
    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS ai_credit_price_clp INTEGER;")
    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_ai_credit_purchases (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL,
            unit_price_usd NUMERIC(10, 2) NOT NULL,
            total_usd NUMERIC(12, 2) NOT NULL,
            total_clp INTEGER,
            method VARCHAR(20) NOT NULL,
            reference VARCHAR(120),
            note TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            review_note TEXT,
            reviewed_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMPTZ,
            created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_sys_ai_credit_purchases_tenant ON sys_ai_credit_purchases(tenant_id, created_at);
        CREATE INDEX IF NOT EXISTS ix_sys_ai_credit_purchases_status ON sys_ai_credit_purchases(status);
        ALTER TABLE sys_ai_credit_purchases ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sys_ai_credit_purchases FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON sys_ai_credit_purchases;
        CREATE POLICY tenant_isolation_policy ON sys_ai_credit_purchases
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_ai_credit_purchases TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_ai_credit_purchases_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_ai_credit_purchases CASCADE;")
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS ai_credit_price_clp;")
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS payment_other_instructions;")
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS payment_bank_info;")

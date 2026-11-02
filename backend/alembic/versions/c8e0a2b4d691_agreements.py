"""agreements (convenios con empresas)

- crm_agreements: convenios del crematorio con empresas (nombre, RUT) que dan
  descuento a sus trabajadores/clientes: % en planes, % en ánforas/productos y
  % en UN servicio especial (srv_services.is_special). Con RLS.
- oc_financial.agreement_*: la orden guarda el convenio aplicado y una copia de
  sus condiciones (agreement_terms) y del monto descontado, para que cambiar el
  convenio después no altere órdenes ya registradas.

Revision ID: c8e0a2b4d691
Revises: b6d8f0a2c379
Create Date: 2026-11-02 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c8e0a2b4d691'
down_revision: Union[str, Sequence[str], None] = 'b6d8f0a2c379'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS crm_agreements (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            name VARCHAR(120) NOT NULL,
            rut VARCHAR(20),
            plans_discount_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
            products_discount_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
            special_service_id INTEGER REFERENCES srv_services(id) ON DELETE SET NULL,
            special_service_discount_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
            notes VARCHAR(300),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS ix_crm_agreements_tenant ON crm_agreements(tenant_id);
        CREATE UNIQUE INDEX IF NOT EXISTS uix_crm_agreements_tenant_name
            ON crm_agreements (tenant_id, lower(name));

        ALTER TABLE crm_agreements ENABLE ROW LEVEL SECURITY;
        ALTER TABLE crm_agreements FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON crm_agreements;
        CREATE POLICY tenant_isolation_policy ON crm_agreements
            FOR ALL
            USING (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            )
            WITH CHECK (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            );

        ALTER TABLE oc_financial ADD COLUMN IF NOT EXISTS agreement_id INTEGER
            REFERENCES crm_agreements(id) ON DELETE SET NULL;
        ALTER TABLE oc_financial ADD COLUMN IF NOT EXISTS agreement_name VARCHAR(120);
        ALTER TABLE oc_financial ADD COLUMN IF NOT EXISTS agreement_discount DOUBLE PRECISION NOT NULL DEFAULT 0;
        ALTER TABLE oc_financial ADD COLUMN IF NOT EXISTS agreement_terms JSON;
        CREATE INDEX IF NOT EXISTS ix_oc_financial_agreement ON oc_financial(agreement_id);
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON crm_agreements TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE crm_agreements_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS ix_oc_financial_agreement;
        ALTER TABLE oc_financial DROP COLUMN IF EXISTS agreement_terms;
        ALTER TABLE oc_financial DROP COLUMN IF EXISTS agreement_discount;
        ALTER TABLE oc_financial DROP COLUMN IF EXISTS agreement_name;
        ALTER TABLE oc_financial DROP COLUMN IF EXISTS agreement_id;
        DROP TABLE IF EXISTS crm_agreements CASCADE;
    """)

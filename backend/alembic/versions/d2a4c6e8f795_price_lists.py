"""price_lists (tablas de precios por peso: promociones / plantillas)

srv_price_lists: tablas con nombre que usan los MISMOS rangos de peso de la
General (srv_weight_pricing) y cambian solo los precios:
- tier_prices: {"<id tramo>": recargo}            (modo recargo por tramo)
- plan_prices: {"<id plan>": {"<id tramo>": precio}} (modo precio por plan y peso)
Celda vacía = precio de la General. valid_from / valid_until (fechas, opcional).
inv_catalog_tokens.price_list_id: tabla que usa ese enlace del catálogo de
planes (NULL = General); el formulario abierto desde el enlace la respeta y la
solicitud congela esos precios hasta la orden.

Revision ID: d2a4c6e8f795
Revises: c0f2b4d6e683
Create Date: 2026-11-04 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'd2a4c6e8f795'
down_revision: Union[str, Sequence[str], None] = 'c0f2b4d6e683'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS srv_price_lists (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            name VARCHAR(60) NOT NULL,
            tier_prices JSON,
            plan_prices JSON,
            valid_from DATE,
            valid_until DATE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS ix_srv_price_lists_tenant ON srv_price_lists(tenant_id);
        CREATE UNIQUE INDEX IF NOT EXISTS uix_srv_price_lists_tenant_name
            ON srv_price_lists (tenant_id, lower(name));

        ALTER TABLE srv_price_lists ENABLE ROW LEVEL SECURITY;
        ALTER TABLE srv_price_lists FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON srv_price_lists;
        CREATE POLICY tenant_isolation_policy ON srv_price_lists
            FOR ALL
            USING (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            )
            WITH CHECK (
                (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
            );

        ALTER TABLE inv_catalog_tokens ADD COLUMN IF NOT EXISTS price_list_id INTEGER
            REFERENCES srv_price_lists(id) ON DELETE SET NULL;
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON srv_price_lists TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE srv_price_lists_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE inv_catalog_tokens DROP COLUMN IF EXISTS price_list_id;
        DROP TABLE IF EXISTS srv_price_lists CASCADE;
    """)

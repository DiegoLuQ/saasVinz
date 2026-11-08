"""product_requests

Solicitudes de productos desde el catálogo público (carrito): ligadas a una
orden de cremación / registro web, o compras externas («orden de compra de
productos», PC-0001). Con RLS. Ver app/services/product_requests.py.

Revision ID: c6f8a0b2d871
Revises: b4e6a8c0d769
Create Date: 2026-11-08 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c6f8a0b2d871'
down_revision: Union[str, Sequence[str], None] = 'b4e6a8c0d769'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS inv_product_requests (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            number INTEGER NOT NULL,
            kind VARCHAR(20) NOT NULL DEFAULT 'order',
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            cremation_id INTEGER REFERENCES oc_cremations(id) ON DELETE SET NULL,
            submission_id INTEGER REFERENCES web_form_submissions(id) ON DELETE SET NULL,
            customer_id INTEGER REFERENCES crm_customers(id) ON DELETE SET NULL,
            catalog_token_id INTEGER REFERENCES inv_catalog_tokens(id) ON DELETE SET NULL,
            pet_name VARCHAR(120),
            contact_name VARCHAR(120),
            contact_phone VARCHAR(40),
            note TEXT,
            items JSON NOT NULL DEFAULT '[]',
            total DOUBLE PRECISION NOT NULL DEFAULT 0,
            reject_reason VARCHAR(300),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            decided_at TIMESTAMPTZ,
            decided_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            delivered_at TIMESTAMPTZ,
            CONSTRAINT uix_product_request_number UNIQUE (tenant_id, number)
        );
        CREATE INDEX IF NOT EXISTS ix_inv_product_requests_tenant_status ON inv_product_requests(tenant_id, status);
        CREATE INDEX IF NOT EXISTS ix_inv_product_requests_cremation ON inv_product_requests(cremation_id);
        CREATE INDEX IF NOT EXISTS ix_inv_product_requests_submission ON inv_product_requests(submission_id);

        ALTER TABLE inv_product_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE inv_product_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON inv_product_requests;
        CREATE POLICY tenant_isolation_policy ON inv_product_requests
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON inv_product_requests TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE inv_product_requests_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS inv_product_requests")

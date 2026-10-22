"""template_exports

Diseños finales exportados por el tenant desde "Diseños para Redes" (imagen
WebP en tenant_{id}/ia/). Permite listarlos en una sección propia con su
plantilla y mascota. Con RLS. Incorpora los diseños ya guardados antes de esta
tabla (web_media_library, categoría 'ia', descripción "Diseño final · …").

Revision ID: b5d7f9a1c236
Revises: a3c5e7b9d014
Create Date: 2026-10-19 23:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b5d7f9a1c236'
down_revision: Union[str, Sequence[str], None] = 'a3c5e7b9d014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_template_exports (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            template_id INTEGER REFERENCES sys_image_templates(id) ON DELETE SET NULL,
            pet_id INTEGER,
            title VARCHAR(250) NOT NULL,
            media_url TEXT NOT NULL,
            created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_sys_template_exports_tenant ON sys_template_exports(tenant_id, created_at);
        ALTER TABLE sys_template_exports ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sys_template_exports FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON sys_template_exports;
        CREATE POLICY tenant_isolation_policy ON sys_template_exports
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
    # Diseños guardados antes de esta tabla (la migración corre como owner/bypass).
    op.execute("""
        INSERT INTO sys_template_exports (tenant_id, title, media_url, created_at)
        SELECT m.tenant_id,
               COALESCE(NULLIF(REPLACE(m.description, 'Diseño final · ', ''), ''), 'Diseño'),
               m.url, COALESCE(m.created_at, NOW())
        FROM web_media_library m
        WHERE m.category = 'ia' AND m.tenant_id IS NOT NULL AND m.description LIKE 'Diseño final%%'
          AND NOT EXISTS (SELECT 1 FROM sys_template_exports e WHERE e.media_url = m.url);
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_template_exports TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_template_exports_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_template_exports CASCADE;")

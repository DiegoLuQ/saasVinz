"""image_templates_ai

Plantillas de imagen para redes (Instagram) con IA (Gemini):
- sys_image_templates: prompts editables por el SuperAdmin (texto e imagen)
  y el límite de caracteres del texto generado (máx. 500).
- sys_ai_generations: registro de cada generación por tenant (cupo mensual,
  auditoría del prompt usado). Con RLS por tenant.

Revision ID: f8a2c4e6b913
Revises: a7c9e1f3b468
Create Date: 2026-10-18 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f8a2c4e6b913'
down_revision: Union[str, Sequence[str], None] = 'a7c9e1f3b468'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_image_templates ADD COLUMN IF NOT EXISTS ai_text_prompt TEXT;")
    op.execute("ALTER TABLE sys_image_templates ADD COLUMN IF NOT EXISTS ai_image_prompt TEXT;")
    op.execute("ALTER TABLE sys_image_templates ADD COLUMN IF NOT EXISTS ai_text_max_chars INTEGER NOT NULL DEFAULT 500;")

    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_ai_generations (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            template_id INTEGER REFERENCES sys_image_templates(id) ON DELETE SET NULL,
            pet_id INTEGER,
            kind VARCHAR(10) NOT NULL,
            model VARCHAR(80) NOT NULL,
            prompt TEXT,
            success BOOLEAN NOT NULL DEFAULT false,
            error TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_sys_ai_generations_tenant_created
            ON sys_ai_generations(tenant_id, created_at);
        ALTER TABLE sys_ai_generations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sys_ai_generations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_policy ON sys_ai_generations;
        CREATE POLICY tenant_isolation_policy ON sys_ai_generations
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_ai_generations TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_ai_generations_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_ai_generations CASCADE;")
    op.execute("ALTER TABLE sys_image_templates DROP COLUMN IF EXISTS ai_text_max_chars;")
    op.execute("ALTER TABLE sys_image_templates DROP COLUMN IF EXISTS ai_image_prompt;")
    op.execute("ALTER TABLE sys_image_templates DROP COLUMN IF EXISTS ai_text_prompt;")

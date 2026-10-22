"""ai_providers

Plataformas de IA configurables desde Configuración Global (Gemini, Claude,
ChatGPT, OpenRouter, DeepSeek): nombre, modelo y API key cifrada, con la
conexión marcada para texto y/o ilustración de las plantillas de imagen.
Tabla global (sin tenant_id, sin RLS): solo la administra el SuperAdmin.

Revision ID: b2d4f6a8c135
Revises: f8a2c4e6b913
Create Date: 2026-10-18 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b2d4f6a8c135'
down_revision: Union[str, Sequence[str], None] = 'f8a2c4e6b913'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_ai_providers (
            id SERIAL PRIMARY KEY,
            provider VARCHAR(20) NOT NULL,
            name VARCHAR(120) NOT NULL,
            model VARCHAR(160) NOT NULL,
            api_key_encrypted TEXT,
            is_active BOOLEAN NOT NULL DEFAULT true,
            use_for_text BOOLEAN NOT NULL DEFAULT false,
            use_for_image BOOLEAN NOT NULL DEFAULT false,
            last_test_at TIMESTAMPTZ,
            last_test_ok BOOLEAN,
            last_test_message TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_ai_providers TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_ai_providers_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_ai_providers CASCADE;")

"""tracking_custom_templates

Crea la tabla `sys_tracking_custom_templates` para el constructor de plantillas
de seguimiento personalizadas con fondos móviles/desktop, elementos decorativos y colores:
- Inserta la plantilla predeterminada 'celestial' si no existe.
- Otorga permisos SELECT, INSERT, UPDATE, DELETE al rol de la app.

Revision ID: c8d0e2f4a6b8
Revises: b7e9c1d3f5a2
Create Date: 2026-11-17 00:55:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c8d0e2f4a6b8'
down_revision: Union[str, Sequence[str], None] = 'b7e9c1d3f5a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sys_tracking_custom_templates (
            id SERIAL PRIMARY KEY,
            slug VARCHAR(60) NOT NULL UNIQUE,
            name VARCHAR(120) NOT NULL,
            description TEXT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            allowed_plans JSONB NOT NULL DEFAULT '["PRO", "ULTRA"]'::jsonb,
            background_mobile_url TEXT NULL,
            background_desktop_url TEXT NULL,
            element_url TEXT NULL,
            preview_image_url TEXT NULL,
            theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_sys_tracking_custom_templates_slug ON sys_tracking_custom_templates(slug);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_sys_tracking_custom_templates_is_active ON sys_tracking_custom_templates(is_active);"
    )

    # Seed de la plantilla celestial inicial
    op.execute(
        """
        INSERT INTO sys_tracking_custom_templates (
            slug, name, description, is_active, allowed_plans,
            background_mobile_url, background_desktop_url, element_url,
            theme_config
        )
        VALUES (
            'celestial',
            'Santuario Angelical / Celestial',
            'Alas conmemorativas de ángel, cielo dorado con flores, caligrafía emotiva y tarjetas en cristal.',
            TRUE,
            '["PRO", "ULTRA"]'::jsonb,
            '/tracking/fondos/movil/fondo_cielo_flores_1_9_16.webp',
            '/tracking/fondos/desktop/fondo_cielo_flores_1_16_9.webp',
            '/tracking/elementos/alas_elemento.webp',
            '{"accent_color": "#D97706", "title_color_light": "#3E2723", "title_color_dark": "#FDF6E2", "subtitle_color_light": "#78350F", "subtitle_color_dark": "#FDE68A"}'::jsonb
        )
        ON CONFLICT (slug) DO NOTHING;
        """
    )

    _grant_to_app_roles()


def _grant_to_app_roles() -> None:
    """Otorga permisos a los roles de aplicación comunes (vincer_app, vinzer_app y usuario configurado)."""
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
                    GRANT SELECT, INSERT, UPDATE, DELETE ON sys_tracking_custom_templates TO "{role}";
                    GRANT USAGE, SELECT ON SEQUENCE sys_tracking_custom_templates_id_seq TO "{role}";
                END IF;
            END $$;
        """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_tracking_custom_templates;")

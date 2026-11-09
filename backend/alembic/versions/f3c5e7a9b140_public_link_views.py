"""public_link_views

sys_public_link_views: aperturas de los links públicos de memorial y de
seguimiento (KPIs del catálogo del SuperAdmin). Antes se creaba en tiempo de
ejecución (CREATE TABLE desde la app), lo que en producción fallaba porque el rol
de la app no puede crear tablas, y la consulta posterior abortaba la transacción
del reporte (500 en /creator/catalog-funnel).

Sin RLS a propósito (como rec_*): es un registro de conteo sin datos personales
(resource_key = huella SHA-256 del uuid/token), se escribe desde endpoints
públicos sin contexto de crematorio y solo lo lee el SuperAdmin.

Revision ID: f3c5e7a9b140
Revises: e1a3c5f7b928
Create Date: 2026-11-09 03:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'f3c5e7a9b140'
down_revision: Union[str, Sequence[str], None] = 'e1a3c5f7b928'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_public_link_views (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            kind VARCHAR(20) NOT NULL,
            resource_key VARCHAR(64) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_public_link_views_tenant_kind_date
            ON sys_public_link_views (tenant_id, kind, created_at);
    """)
    # Filas antiguas (creadas por la app con el uuid/token en claro) → misma huella que ahora.
    op.execute("""
        UPDATE sys_public_link_views
           SET resource_key = encode(sha256(convert_to(resource_key, 'UTF8')), 'hex')
         WHERE length(resource_key) <> 64;
    """)
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    """El rol de la app (no dueño de las tablas) debe poder leer y escribir."""
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_public_link_views TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_public_link_views_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sys_public_link_views;")

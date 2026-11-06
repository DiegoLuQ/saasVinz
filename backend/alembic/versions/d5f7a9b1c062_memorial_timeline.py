"""memorial_timeline

rec_timeline: momentos de la línea de tiempo del memorial (planes con `timeline`:
Eterno 50, Infinito 100 por defecto). Cada momento tiene fecha opcional, título,
texto y su propia foto (aparte de la galería). Sin RLS, como el resto de rec_*
(el acceso es por el memorial: PIN de la familia).

Revision ID: d5f7a9b1c062
Revises: c3e5a7b9d940
Create Date: 2026-11-06 17:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd5f7a9b1c062'
down_revision: Union[str, Sequence[str], None] = 'c3e5a7b9d940'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rec_timeline",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("id_recuerdo", sa.Integer(), sa.ForeignKey("rec_recuerdos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=True),
        sa.Column("titulo", sa.String(80), nullable=False),
        sa.Column("texto", sa.String(1000), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_rec_timeline_recuerdo", "rec_timeline", ["id_recuerdo"])
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    """El rol de la app (sin BYPASSRLS) necesita permisos sobre la tabla nueva."""
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON rec_timeline TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE rec_timeline_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_index("ix_rec_timeline_recuerdo", table_name="rec_timeline")
    op.drop_table("rec_timeline")

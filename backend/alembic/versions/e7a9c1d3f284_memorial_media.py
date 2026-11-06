"""memorial_media

rec_media: video y audio de voz del memorial (planes con max_videos / max_voice:
Infinito 1 video + 1 voz de 30 s por defecto). Sin RLS, como el resto de rec_*.

Revision ID: e7a9c1d3f284
Revises: d5f7a9b1c062
Create Date: 2026-11-06 19:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e7a9c1d3f284'
down_revision: Union[str, Sequence[str], None] = 'd5f7a9b1c062'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rec_media",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("id_recuerdo", sa.Integer(), sa.ForeignKey("rec_recuerdos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(10), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("thumbnail_url", sa.String(500), nullable=True),
        sa.Column("duration", sa.Float(), nullable=True),
        sa.Column("titulo", sa.String(80), nullable=True),
        sa.Column("media_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_rec_media_recuerdo", "rec_media", ["id_recuerdo"])
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON rec_media TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE rec_media_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_index("ix_rec_media_recuerdo", table_name="rec_media")
    op.drop_table("rec_media")

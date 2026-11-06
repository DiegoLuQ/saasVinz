"""Memoriales Vinzer: enlaces para que la familia cree su memorial (rec_memorial_invites)

Revision ID: f7b9d1c3e406
Revises: e5a7c9b1d284
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f7b9d1c3e406'
down_revision: Union[str, Sequence[str], None] = 'e5a7c9b1d284'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabla global de Vinzer (como rec_recuerdos / rec_plans): sin RLS, solo la usan el
    # SuperAdmin (creator) y el formulario público con el token.
    op.create_table(
        'rec_memorial_invites',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column('plan', sa.String(length=20), nullable=True),
        sa.Column('note', sa.String(length=200), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('memorial_id', sa.Integer(), sa.ForeignKey('rec_recuerdos.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_rec_memorial_invites_id', 'rec_memorial_invites', ['id'])
    op.create_index('ix_rec_memorial_invites_token', 'rec_memorial_invites', ['token'], unique=True)
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
                GRANT SELECT, INSERT, UPDATE, DELETE ON rec_memorial_invites TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE rec_memorial_invites_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_index('ix_rec_memorial_invites_token', table_name='rec_memorial_invites')
    op.drop_index('ix_rec_memorial_invites_id', table_name='rec_memorial_invites')
    op.drop_table('rec_memorial_invites')

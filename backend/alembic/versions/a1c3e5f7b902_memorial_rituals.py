"""memorial_rituals

Tabla rec_rituals: gestos simbólicos de los visitantes en el memorial público
(encender una vela, dejar una flor, encender una estrella, enviar un beso al
cielo). Antes eran estado local que se perdía al recargar; ahora alimentan el
contador público ("47 velas encendidas") y las estrellas con nombre de la
plantilla Constelación. La IP se guarda solo como hash (antiabuso).

Revision ID: a1c3e5f7b902
Revises: f4c6e8a0b235
Create Date: 2026-10-03 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1c3e5f7b902'
down_revision: Union[str, Sequence[str], None] = 'f4c6e8a0b235'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'rec_rituals',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('id_recuerdo', sa.Integer(),
                  sa.ForeignKey('rec_recuerdos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=60), nullable=True),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_rec_rituals_id', 'rec_rituals', ['id'])
    op.create_index('ix_rec_rituals_recuerdo_kind', 'rec_rituals', ['id_recuerdo', 'kind'])
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    """Mismo criterio que b4f1a7c3e920: otorgar explícitamente al rol de la app."""
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON rec_rituals TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE rec_rituals_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_index('ix_rec_rituals_recuerdo_kind', table_name='rec_rituals')
    op.drop_index('ix_rec_rituals_id', table_name='rec_rituals')
    op.drop_table('rec_rituals')

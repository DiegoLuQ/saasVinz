"""collage_templates

- sys_image_templates.kind: 'social' (diseño por mascota, lo de siempre) o
  'collage' (fotos de varias órdenes entregadas: collage mensual / últimas N).
- crm_pets.photo_consent: la familia autoriza que la foto de su mascota aparezca
  en homenajes del crematorio (collage). NULL = no se preguntó (no se usa hasta
  que el crematorio confirme la autorización), false = no autoriza.

Revision ID: b3d5f7a9c106
Revises: a1c3e5f7b984
Create Date: 2026-11-07 18:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b3d5f7a9c106'
down_revision: Union[str, Sequence[str], None] = 'a1c3e5f7b984'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sys_image_templates', sa.Column('kind', sa.String(10), nullable=False, server_default='social'))
    op.create_check_constraint('ck_sys_image_templates_kind', 'sys_image_templates', "kind IN ('social', 'collage')")
    op.add_column('crm_pets', sa.Column('photo_consent', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('crm_pets', 'photo_consent')
    op.drop_constraint('ck_sys_image_templates_kind', 'sys_image_templates', type_='check')
    op.drop_column('sys_image_templates', 'kind')

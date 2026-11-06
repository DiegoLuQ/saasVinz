"""memorial_expiry_notice

rec_recuerdos.expiry_notice_for: valid_until para el que ya se envió el aviso
«el memorial vence en 1 mes» (un solo correo por vigencia; al renovar se limpia).

Revision ID: c3e5a7b9d940
Revises: b1d3f5a7c829
Create Date: 2026-11-06 15:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c3e5a7b9d940'
down_revision: Union[str, Sequence[str], None] = 'b1d3f5a7c829'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE rec_recuerdos ADD COLUMN IF NOT EXISTS expiry_notice_for TIMESTAMP NULL")


def downgrade() -> None:
    op.execute("ALTER TABLE rec_recuerdos DROP COLUMN IF EXISTS expiry_notice_for")

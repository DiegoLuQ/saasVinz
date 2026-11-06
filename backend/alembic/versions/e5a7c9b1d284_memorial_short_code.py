"""Memoriales: código corto para el enlace público (memorial.<dominio>/<crematorio>/<mascota>-<código>)

Revision ID: e5a7c9b1d284
Revises: d4f6b8c0e173
"""
import secrets
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e5a7c9b1d284'
down_revision: Union[str, Sequence[str], None] = 'd4f6b8c0e173'
branch_labels = None
depends_on = None

# Igual que app.utils.generators (copiado: las migraciones no dependen del código de la app)
_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"
_LENGTH = 7


def _code() -> str:
    while True:
        c = "".join(secrets.choice(_ALPHABET) for _ in range(_LENGTH))
        if any(ch.isdigit() for ch in c):
            return c


def upgrade() -> None:
    op.add_column('rec_recuerdos', sa.Column('short_code', sa.String(length=12), nullable=True))
    conn = op.get_bind()
    ids = [r[0] for r in conn.execute(sa.text("SELECT id FROM rec_recuerdos WHERE short_code IS NULL"))]
    used: set[str] = set()
    for mid in ids:
        code = _code()
        while code in used:
            code = _code()
        used.add(code)
        conn.execute(sa.text("UPDATE rec_recuerdos SET short_code = :c WHERE id = :i"), {"c": code, "i": mid})
    op.create_index('ix_rec_recuerdos_short_code', 'rec_recuerdos', ['short_code'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_rec_recuerdos_short_code', table_name='rec_recuerdos')
    op.drop_column('rec_recuerdos', 'short_code')

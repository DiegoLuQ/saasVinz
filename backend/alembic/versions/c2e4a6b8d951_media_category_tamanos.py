"""Categoría «Íconos de tamaños» (key tamanos) en la Biblioteca global: el SuperAdmin sube ahí
los íconos estándar de los rangos de peso y los crematorios los eligen en «Pesos y precios».

Revision ID: c2e4a6b8d951
Revises: b0d2f4a6c839
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'c2e4a6b8d951'
down_revision: Union[str, Sequence[str], None] = 'b0d2f4a6c839'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO web_media_categories (key, label, sort_order, is_active, created_at)
        SELECT 'tamanos', 'Íconos de tamaños', COALESCE(MAX(sort_order), 0) + 10, TRUE, NOW()
        FROM web_media_categories
        WHERE NOT EXISTS (SELECT 1 FROM web_media_categories WHERE key = 'tamanos')
    """)


def downgrade() -> None:
    op.execute("DELETE FROM web_media_categories WHERE key = 'tamanos'")

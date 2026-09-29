"""catalog_tokens_type

Agrega inv_catalog_tokens.catalog_type para distinguir enlaces del catálogo de
productos ('products', valor por defecto de los enlaces existentes) de los del
catálogo de planes ('plans', compartido desde Gestión de Servicios).

Revision ID: d4f6a8c0e257
Revises: c3e5f7a9b136
Create Date: 2026-09-28 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd4f6a8c0e257'
down_revision: Union[str, Sequence[str], None] = 'c3e5f7a9b136'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE inv_catalog_tokens
            ADD COLUMN IF NOT EXISTS catalog_type VARCHAR(20) NOT NULL DEFAULT 'products';
        ALTER TABLE inv_catalog_tokens
            DROP CONSTRAINT IF EXISTS ck_catalog_tokens_type;
        ALTER TABLE inv_catalog_tokens
            ADD CONSTRAINT ck_catalog_tokens_type CHECK (catalog_type IN ('products', 'plans'));
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE inv_catalog_tokens DROP CONSTRAINT IF EXISTS ck_catalog_tokens_type;
        ALTER TABLE inv_catalog_tokens DROP COLUMN IF EXISTS catalog_type;
    """)

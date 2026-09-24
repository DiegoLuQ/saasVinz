"""partner_portal_access

Agrega access_token, access_pin y token_generated_at a ptn_partner_links
para el portal privado de veterinarias.

Revision ID: a1b2c3d4e5f6
Revises: f6b8c2d4e103
Create Date: 2026-09-22 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f6b8c2d4e103'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE ptn_partner_links ADD COLUMN IF NOT EXISTS access_token VARCHAR(64) UNIQUE;
        ALTER TABLE ptn_partner_links ADD COLUMN IF NOT EXISTS access_pin VARCHAR(10);
        ALTER TABLE ptn_partner_links ADD COLUMN IF NOT EXISTS token_generated_at TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS ix_ptn_partner_links_access_token ON ptn_partner_links(access_token);
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS ix_ptn_partner_links_access_token;
        ALTER TABLE ptn_partner_links DROP COLUMN IF EXISTS token_generated_at;
        ALTER TABLE ptn_partner_links DROP COLUMN IF EXISTS access_pin;
        ALTER TABLE ptn_partner_links DROP COLUMN IF EXISTS access_token;
    """)

"""pet_date_year_only

crm_pets.birth_date_year_only / death_date_year_only: la familia solo sabe el año.
La fecha se guarda como 1 de enero de ese año y los documentos (certificado,
diseños, memorial) muestran solo el año.

Revision ID: c4e6a8b0d317
Revises: a3c5e7f9b218
Create Date: 2026-11-06 23:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'c4e6a8b0d317'
down_revision: Union[str, Sequence[str], None] = 'a3c5e7f9b218'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE crm_pets ADD COLUMN IF NOT EXISTS birth_date_year_only BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE crm_pets ADD COLUMN IF NOT EXISTS death_date_year_only BOOLEAN NOT NULL DEFAULT false")


def downgrade() -> None:
    op.execute("ALTER TABLE crm_pets DROP COLUMN IF EXISTS death_date_year_only")
    op.execute("ALTER TABLE crm_pets DROP COLUMN IF EXISTS birth_date_year_only")

"""plan_important_note

Agrega srv_plans.important_note: aviso destacado opcional que se muestra en la
tarjeta del plan en el catálogo público (ej. "Exclusivo para mascotas de menos
de 1 kg"). NULL = sin aviso.

Revision ID: b3e5a7c9d146
Revises: a7c9e1f3b248
Create Date: 2026-09-30 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b3e5a7c9d146'
down_revision: Union[str, Sequence[str], None] = 'a7c9e1f3b248'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE srv_plans
            ADD COLUMN IF NOT EXISTS important_note VARCHAR(200);
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE srv_plans DROP COLUMN IF EXISTS important_note;
    """)

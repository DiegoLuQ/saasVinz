"""pet_id_indexes

Índices en oc_cremations.pet_id y web_form_submissions.pet_id: cada visita a un memorial
busca la orden / el formulario de la mascota (dedicatoria del tutor) y otras pantallas
(órdenes por mascota, purga) filtran por esa columna; sin índice era un recorrido completo.

Revision ID: f9b1c3d5e406
Revises: e7a9c1d3f284
Create Date: 2026-11-06 21:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'f9b1c3d5e406'
down_revision: Union[str, Sequence[str], None] = 'e7a9c1d3f284'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_oc_cremations_pet_id ON oc_cremations (pet_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_web_form_submissions_pet_id ON web_form_submissions (pet_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_web_form_submissions_pet_id")
    op.execute("DROP INDEX IF EXISTS ix_oc_cremations_pet_id")

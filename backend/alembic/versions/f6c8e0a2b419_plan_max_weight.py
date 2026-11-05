"""plan_max_weight (peso máximo opcional de un plan)

srv_plans.max_weight (kg, NULL = sin límite): un plan como «Minigarritas» (hasta
1 kg) se oculta en el catálogo y el formulario cuando el tamaño o los kg de la
mascota lo superan, y submit-form rechaza la solicitud si llega igual.

Revision ID: f6c8e0a2b419
Revises: e4b6d8f0a917
Create Date: 2026-11-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'f6c8e0a2b419'
down_revision: Union[str, Sequence[str], None] = 'e4b6d8f0a917'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE srv_plans ADD COLUMN IF NOT EXISTS max_weight DOUBLE PRECISION")


def downgrade() -> None:
    op.execute("ALTER TABLE srv_plans DROP COLUMN IF EXISTS max_weight")

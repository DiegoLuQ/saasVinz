"""ai_provider_priority

sys_ai_providers.priority: orden de uso dentro de cada función (texto /
ilustración). 1 = principal; si falla (saturada, sin saldo, key inválida…)
se pasa a la siguiente marcada para el mismo uso. Desde este cambio puede
haber varias conexiones marcadas para textos o ilustraciones.

Revision ID: e1a3c5d7f692
Revises: d9f1b3c5e570
Create Date: 2026-10-20 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e1a3c5d7f692'
down_revision: Union[str, Sequence[str], None] = 'd9f1b3c5e570'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_ai_providers ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1;")


def downgrade() -> None:
    op.execute("ALTER TABLE sys_ai_providers DROP COLUMN IF EXISTS priority;")

"""ai_costs_and_saved_media

Fase 1 de créditos IA:
- sys_ai_providers.cost_per_use_usd: costo estimado de una generación (USD).
- sys_ai_generations.cost_usd: costo registrado de cada generación (el real
  si la plataforma lo informa, ej. OpenRouter; si no, el estimado).
- sys_ai_generations.media_url: ilustración guardada por el tenant en
  tenant_{id}/ia/ (NULL si la descartó).

Revision ID: d7f9b1c3e258
Revises: c5e7a9b2d146
Create Date: 2026-10-19 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd7f9b1c3e258'
down_revision: Union[str, Sequence[str], None] = 'c5e7a9b2d146'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_ai_providers ADD COLUMN IF NOT EXISTS cost_per_use_usd NUMERIC(10, 5) NOT NULL DEFAULT 0;")
    op.execute("ALTER TABLE sys_ai_generations ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10, 5);")
    op.execute("ALTER TABLE sys_ai_generations ADD COLUMN IF NOT EXISTS media_url TEXT;")


def downgrade() -> None:
    op.execute("ALTER TABLE sys_ai_generations DROP COLUMN IF EXISTS media_url;")
    op.execute("ALTER TABLE sys_ai_generations DROP COLUMN IF EXISTS cost_usd;")
    op.execute("ALTER TABLE sys_ai_providers DROP COLUMN IF EXISTS cost_per_use_usd;")

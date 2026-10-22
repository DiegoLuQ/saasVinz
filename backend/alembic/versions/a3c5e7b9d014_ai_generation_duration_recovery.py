"""ai_generation_duration_recovery

sys_ai_generations:
- duration_ms: cuánto tardó la plataforma de IA en responder (reporte de tiempos
  y estimación que ve el tenant mientras espera).
- output_text: texto generado (permite recuperarlo si la respuesta no llegó).
- pending_image: ilustración generada (data URL WebP) que el tenant aún no
  guardó ni descartó. Permite recuperarla sin gastar otro intento si la
  conexión se cortó; se borra al guardar/descartar o cuando vence el diseño.

Revision ID: a3c5e7b9d014
Revises: f1c3e5a7b482
Create Date: 2026-10-19 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a3c5e7b9d014'
down_revision: Union[str, Sequence[str], None] = 'f1c3e5a7b482'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_ai_generations ADD COLUMN IF NOT EXISTS duration_ms INTEGER;")
    op.execute("ALTER TABLE sys_ai_generations ADD COLUMN IF NOT EXISTS output_text TEXT;")
    op.execute("ALTER TABLE sys_ai_generations ADD COLUMN IF NOT EXISTS pending_image TEXT;")


def downgrade() -> None:
    op.execute("ALTER TABLE sys_ai_generations DROP COLUMN IF EXISTS pending_image;")
    op.execute("ALTER TABLE sys_ai_generations DROP COLUMN IF EXISTS output_text;")
    op.execute("ALTER TABLE sys_ai_generations DROP COLUMN IF EXISTS duration_ms;")

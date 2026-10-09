"""special_services

Servicios especiales (eutanasia, exhumación…): servicios del catálogo que el
formulario público ofrece como adicionales después de elegir el plan.
- is_special: marca el servicio como especial (se edita en el catálogo).
- show_in_form: si la familia lo ve en el formulario (Configuración →
  Formulario y Pesos). Un especial oculto no se publica.

Revision ID: a7c9e1f3b468
Revises: c4e7a9b1d356
Create Date: 2026-10-08 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a7c9e1f3b468'
down_revision: Union[str, Sequence[str], None] = 'c4e7a9b1d356'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE srv_services ADD COLUMN IF NOT EXISTS is_special BOOLEAN NOT NULL DEFAULT false;")
    op.execute("ALTER TABLE srv_services ADD COLUMN IF NOT EXISTS show_in_form BOOLEAN NOT NULL DEFAULT true;")


def downgrade() -> None:
    op.execute("ALTER TABLE srv_services DROP COLUMN IF EXISTS show_in_form;")
    op.execute("ALTER TABLE srv_services DROP COLUMN IF EXISTS is_special;")

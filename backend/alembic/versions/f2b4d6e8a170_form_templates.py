"""form_templates

sys_saas_config.form_templates: plantillas de formulario para las familias que
diseña el SuperAdmin (Admin → Configuración → «Plantillas de formulario»). Cada
crematorio crea un formulario personalizado desde una plantilla activa.
NULL = la lista original («Formulario Huella»). Ver app/services/form_templates.py.

Revision ID: f2b4d6e8a170
Revises: e1f2a3b4c5d6
Create Date: 2026-11-18 23:30:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'f2b4d6e8a170'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS form_templates JSON;")


def downgrade() -> None:
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS form_templates;")

"""landing_features

sys_saas_config.landing_features: funciones que la web pública (landing y
/comparar-planes) muestra al comparar planes, con su nombre público, grupo y
orden. Lo edita el SuperAdmin en Admin → Planes → «Funciones en la web»; qué
plan tiene cada una se calcula de sus módulos y características
(app/services/landing_features.py). NULL = lista por defecto.

Revision ID: c3e5a7b9d126
Revises: b9d1f3a5c784
Create Date: 2026-10-22 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3e5a7b9d126'
down_revision: Union[str, Sequence[str], None] = 'b9d1f3a5c784'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_saas_config
            ADD COLUMN IF NOT EXISTS landing_features JSON;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS landing_features;")

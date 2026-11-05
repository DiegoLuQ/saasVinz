"""RUT vacío de clientes → NULL (el índice único tenant+rut rechazaba el 2.º cliente sin RUT)

Revision ID: b0d2f4a6c839
Revises: a8e0c2d4f617
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'b0d2f4a6c839'
down_revision: Union[str, Sequence[str], None] = 'a8e0c2d4f617'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE crm_customers SET rut = NULL WHERE rut IS NOT NULL AND btrim(rut) = ''")


def downgrade() -> None:
    pass

"""certificate_template_is_locked

ops_certificate_templates.is_locked: plantilla exclusiva diseñada por el admin
para un solo tenant. El tenant la usa (y puede elegirla como predeterminada),
pero solo el admin puede editarla o eliminarla.

Revision ID: d8e3b6a2f147
Revises: b4f1a7c3e920
Create Date: 2026-09-18 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e3b6a2f147'
down_revision: Union[str, Sequence[str], None] = 'b4f1a7c3e920'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'ops_certificate_templates',
        sa.Column('is_locked', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('ops_certificate_templates', 'is_locked')

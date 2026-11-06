"""submission_soft_delete

Eliminar un registro web ya no lo borra: queda con status 'deleted' (datos y
fotos intactos) y se puede restaurar a pendiente. El borrado definitivo es aparte.

Revision ID: e8a0c2d4f651
Revises: d6f8a0c2e429
Create Date: 2026-11-06 19:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e8a0c2d4f651'
down_revision: Union[str, Sequence[str], None] = 'd6f8a0c2e429'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('web_form_submissions', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('web_form_submissions', sa.Column(
        'deleted_by', sa.Integer(), sa.ForeignKey('sys_users.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_web_form_submissions_tenant_status', 'web_form_submissions', ['tenant_id', 'status'])


def downgrade() -> None:
    op.drop_index('ix_web_form_submissions_tenant_status', table_name='web_form_submissions')
    op.drop_column('web_form_submissions', 'deleted_by')
    op.drop_column('web_form_submissions', 'deleted_at')

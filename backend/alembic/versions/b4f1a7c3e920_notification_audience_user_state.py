"""notification_audience_user_state

- sys_notifications.audience: quién ve la notificación dentro del tenant
  ('owner' = admin, 'ordenes' = roles con el módulo de órdenes, 'all').
  Backfill: solicitudes web (new_submission) -> 'ordenes'; el resto -> 'owner'
  (pagos, cambios de plan y difusiones del creador son del dueño).
- sys_notification_user_states: leído/descartado por usuario. Antes el estado
  era global y un operador podía archivarle al dueño un aviso de pago.

Revision ID: b4f1a7c3e920
Revises: 7d2e9c4a1b58
Create Date: 2026-09-18 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4f1a7c3e920'
down_revision: Union[str, Sequence[str], None] = '7d2e9c4a1b58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'sys_notifications',
        sa.Column('audience', sa.String(length=20), nullable=False, server_default='owner'),
    )
    op.create_index('ix_sys_notifications_audience', 'sys_notifications', ['audience'])
    op.execute("UPDATE sys_notifications SET audience = 'ordenes' WHERE type = 'new_submission'")

    op.create_table(
        'sys_notification_user_states',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('notification_id', sa.Integer(), sa.ForeignKey('sys_notifications.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('sys_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dismissed_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('notification_id', 'user_id', name='uq_notification_user_state'),
    )
    op.create_index('ix_sys_notification_user_states_id', 'sys_notification_user_states', ['id'])
    op.create_index('ix_sys_notification_user_states_notification_id', 'sys_notification_user_states', ['notification_id'])
    op.create_index('ix_sys_notification_user_states_user_id', 'sys_notification_user_states', ['user_id'])
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    """Las ALTER DEFAULT PRIVILEGES solo cubren tablas creadas por el rol que las
    definió; si la migración corre con otro usuario admin, el rol de la app se
    quedaría sin acceso. Se otorga explícitamente al usuario de la app."""
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_notification_user_states TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_notification_user_states_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_index('ix_sys_notification_user_states_user_id', table_name='sys_notification_user_states')
    op.drop_index('ix_sys_notification_user_states_notification_id', table_name='sys_notification_user_states')
    op.drop_index('ix_sys_notification_user_states_id', table_name='sys_notification_user_states')
    op.drop_table('sys_notification_user_states')
    op.drop_index('ix_sys_notifications_audience', table_name='sys_notifications')
    op.drop_column('sys_notifications', 'audience')

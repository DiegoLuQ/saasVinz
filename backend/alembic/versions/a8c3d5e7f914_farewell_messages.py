"""farewell_messages

Tabla sys_farewell_messages: mensajes de despedida sugeridos (globales, los
administra el creador en Contenido). El formulario público ofrece uno al azar
en la Carta de Despedida. `{nombre_mascota}` se reemplaza por el nombre de la
mascota. Se siembra un primer mensaje.

Revision ID: a8c3d5e7f914
Revises: e1f3a5b7c902
Create Date: 2026-09-27 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a8c3d5e7f914'
down_revision: Union[str, Sequence[str], None] = 'e1f3a5b7c902'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_MESSAGE = (
    "Gracias de corazón, {nombre_mascota}, por cada día de amor incondicional y nobleza pura. "
    "Llenaste mi vida de una luz que jamás se apagará. Hoy me toca despedirte con el alma rota, "
    "pero con el pecho lleno de gratitud por haber compartido este viaje a tu lado. Fuiste mi "
    "refugio, mi sombra fiel y mi mayor alegría. Corre libre y sin dolor. Te amaré por siempre y "
    "te recordaré en cada latido de mi existencia. Hasta que volvamos a encontrarnos, descansa en paz."
)


def upgrade() -> None:
    table = op.create_table(
        'sys_farewell_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('text', sa.String(length=500), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_sys_farewell_messages_id', 'sys_farewell_messages', ['id'])
    op.bulk_insert(table, [{'text': SEED_MESSAGE, 'is_active': True}])
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    """Mismo criterio que b4f1a7c3e920: otorgar explícitamente al rol de la app."""
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_farewell_messages TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_farewell_messages_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_index('ix_sys_farewell_messages_id', table_name='sys_farewell_messages')
    op.drop_table('sys_farewell_messages')

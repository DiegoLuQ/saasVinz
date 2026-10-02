"""memorial_landing_usd_plans

Planes del memorial ofrecidos en la landing (memorial.vinzer.cl), en USD y
con venta asistida por WhatsApp: Mensual (10), Anual (70) y Eterno (110,
pago único). El SuperAdmin los asigna desde Memoriales; sus límites se leen
de features (max_images = fotos del recuerdo, velas = dedicatorias). Eterno
no vence (al asignarlo se limpia valid_until). No modifica los planes previos.

Revision ID: e3b5d7f9a124
Revises: d9a2c4e6f813
Create Date: 2026-10-02 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e3b5d7f9a124'
down_revision: Union[str, Sequence[str], None] = 'd9a2c4e6f813'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO rec_plans (name, name_db, price, features, default_config, is_active, created_at)
        VALUES
            ('Plan Mensual (USD)', 'mensual', 10,
             '{"max_images": 3, "velas": 10, "currency": "USD", "billing": "monthly"}', '{}', true, now()),
            ('Plan Anual (USD)', 'anual', 70,
             '{"max_images": 10, "velas": 35, "currency": "USD", "billing": "yearly"}', '{}', true, now()),
            ('Plan Eterno (USD)', 'eterno', 110,
             '{"max_images": 25, "velas": 100000, "currency": "USD", "billing": "one_time"}', '{}', true, now())
        ON CONFLICT (name_db) DO NOTHING;
    """)


def downgrade() -> None:
    # Solo si ningún memorial los usa (rec_recuerdos.plan_id / plan).
    op.execute("""
        DELETE FROM rec_plans
        WHERE name_db IN ('mensual', 'anual', 'eterno')
          AND id NOT IN (SELECT plan_id FROM rec_recuerdos WHERE plan_id IS NOT NULL);
    """)

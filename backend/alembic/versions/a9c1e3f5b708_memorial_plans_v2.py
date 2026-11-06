"""memorial_plans_v2

Planes de memorial separados de los del SaaS y editables desde Admin:
- rec_plans: kind (vinzer | partner | legacy), currency, billing (yearly | one_time | included),
  description, highlight, sort_order. Límites en features (ver app/services/memorial_plans.py).
- Vinzer: Recuerdo 39 USD/año, Eterno 79 USD/año, Infinito 135 USD pago único. Partner = memoriales
  de crematorios (3 fotos, 20 mensajes, como hasta ahora).
- rec_recuerdos: plan_price / plan_currency / plan_billing = precio congelado por memorial.
- Migración: Eterno antiguo (110 USD, pago único) → Infinito a 110; Mensual/Anual → Recuerdo a 39;
  el resto (crematorios, legacy) → Partner (plan_id). Mensual/Anual quedan inactivos (legacy).

Revision ID: a9c1e3f5b708
Revises: f7b9d1c3e406
Create Date: 2026-11-06 10:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a9c1e3f5b708'
down_revision: Union[str, Sequence[str], None] = 'f7b9d1c3e406'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RECUERDO = ('{"max_images": 10, "max_dedications": 30, "max_dedication_chars": 500, "max_melodies": 1, '
            '"qr": false, "timeline": false, "max_timeline": 0, "max_videos": 0, "max_voice": 0, '
            '"expired_images": 3, "expired_dedications": 5}')
ETERNO = ('{"max_images": 30, "max_dedications": 50, "max_dedication_chars": 500, "max_melodies": 3, '
          '"qr": true, "timeline": true, "max_timeline": 50, "max_videos": 0, "max_voice": 0, '
          '"expired_images": 3, "expired_dedications": 5}')
INFINITO = ('{"max_images": 150, "max_dedications": 100, "max_dedication_chars": 500, "max_melodies": 3, '
            '"qr": true, "timeline": true, "max_timeline": 100, "max_videos": 1, "max_voice": 1, '
            '"expired_images": 3, "expired_dedications": 5}')
PARTNER = ('{"max_images": 3, "max_dedications": 20, "max_dedication_chars": 500, "max_melodies": 1, '
           '"qr": false, "timeline": false, "max_timeline": 0, "max_videos": 0, "max_voice": 0, '
           '"expired_images": 3, "expired_dedications": 5}')


def upgrade() -> None:
    op.add_column('rec_plans', sa.Column('kind', sa.String(20), nullable=False, server_default='legacy'))
    op.add_column('rec_plans', sa.Column('currency', sa.String(3), nullable=False, server_default='USD'))
    op.add_column('rec_plans', sa.Column('billing', sa.String(20), nullable=True))
    op.add_column('rec_plans', sa.Column('description', sa.String(300), nullable=True))
    op.add_column('rec_plans', sa.Column('highlight', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('rec_plans', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('rec_recuerdos', sa.Column('plan_price', sa.Float(), nullable=True))
    op.add_column('rec_recuerdos', sa.Column('plan_currency', sa.String(3), nullable=True))
    op.add_column('rec_recuerdos', sa.Column('plan_billing', sa.String(20), nullable=True))

    op.execute(f"""
        INSERT INTO rec_plans (name, name_db, price, features, default_config, is_active, created_at)
        VALUES ('Recuerdo', 'recuerdo', 39, '{RECUERDO}', '{{}}', true, now()),
               ('Infinito', 'infinito', 135, '{INFINITO}', '{{}}', true, now()),
               ('Partner', 'partner', 0, '{PARTNER}', '{{}}', true, now()),
               ('Eterno', 'eterno', 79, '{ETERNO}', '{{}}', true, now())
        ON CONFLICT (name_db) DO NOTHING;
    """)
    op.execute(f"""
        UPDATE rec_plans SET kind='vinzer', name='Recuerdo', price=39, billing='yearly', sort_order=1,
            description='Su recuerdo, siempre cerca.', features='{RECUERDO}', is_active=true WHERE name_db='recuerdo';
        UPDATE rec_plans SET kind='vinzer', name='Eterno', price=79, billing='yearly', sort_order=2, highlight=true,
            description='Su historia completa, en una línea de tiempo.', features='{ETERNO}', is_active=true WHERE name_db='eterno';
        UPDATE rec_plans SET kind='vinzer', name='Infinito', price=135, billing='one_time', sort_order=3,
            description='Para siempre, con su voz y un video.', features='{INFINITO}', is_active=true WHERE name_db='infinito';
        UPDATE rec_plans SET kind='partner', name='Partner', price=0, billing='included', sort_order=0,
            description='Memorial incluido por el crematorio.', features='{PARTNER}', is_active=true WHERE name_db='partner';
        UPDATE rec_plans SET kind='legacy', is_active=false WHERE name_db IN ('mensual', 'anual');
    """)

    # Memoriales existentes: precio congelado y plan nuevo
    op.execute("""
        UPDATE rec_recuerdos SET plan='infinito', plan_price=110, plan_currency='USD', plan_billing='one_time',
            valid_until=NULL, plan_id=(SELECT id FROM rec_plans WHERE name_db='infinito')
        WHERE lower(plan)='eterno';
        UPDATE rec_recuerdos SET plan='recuerdo', plan_price=39, plan_currency='USD', plan_billing='yearly',
            plan_id=(SELECT id FROM rec_plans WHERE name_db='recuerdo')
        WHERE lower(plan) IN ('mensual', 'anual');
        UPDATE rec_recuerdos SET plan_id=(SELECT id FROM rec_plans WHERE name_db='partner'),
            plan_price=0, plan_currency='USD', plan_billing='included'
        WHERE plan IS NULL OR lower(plan) NOT IN ('recuerdo', 'eterno', 'infinito');
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE rec_recuerdos SET plan='eterno' WHERE plan='infinito';
        UPDATE rec_recuerdos SET plan='anual' WHERE plan='recuerdo';
        UPDATE rec_recuerdos SET plan_id=NULL WHERE plan_id IN (SELECT id FROM rec_plans WHERE name_db IN ('recuerdo','infinito','partner'));
        DELETE FROM rec_plans WHERE name_db IN ('recuerdo', 'infinito', 'partner');
        UPDATE rec_plans SET price=110, is_active=true WHERE name_db='eterno';
        UPDATE rec_plans SET is_active=true WHERE name_db IN ('mensual', 'anual');
    """)
    for col in ('plan_billing', 'plan_currency', 'plan_price'):
        op.drop_column('rec_recuerdos', col)
    for col in ('sort_order', 'highlight', 'description', 'billing', 'currency', 'kind'):
        op.drop_column('rec_plans', col)

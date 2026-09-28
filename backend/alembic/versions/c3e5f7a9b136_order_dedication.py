"""order_dedication

Carta de despedida de la orden (máx. 500). Antes vivía solo en la solicitud web
(web_form_submissions.pet_data.dedication): las órdenes creadas a mano no tenían
dónde guardarla y editarla implicaba tocar el registro original de la familia.

- oc_details.dedication: texto de la orden (lo usan el expediente, la tarjeta de
  homenaje y el memorial).
- Backfill: se copia desde la solicitud más reciente de la misma mascota.

Revision ID: c3e5f7a9b136
Revises: b9d4e6f8a025
Create Date: 2026-09-27 20:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3e5f7a9b136'
down_revision: Union[str, Sequence[str], None] = 'b9d4e6f8a025'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('oc_details', sa.Column('dedication', sa.String(length=500), nullable=True))

    # Las tablas tienen RLS por tenant: el backfill cruza todos los tenants.
    conn = op.get_bind()
    conn.execute(sa.text("SELECT set_config('app.bypass_rls', 'true', true)"))
    conn.execute(sa.text("""
        UPDATE oc_details d
        SET dedication = LEFT(s.ded, 500)
        FROM oc_cremations o
        CROSS JOIN LATERAL (
            SELECT ws.pet_data->>'dedication' AS ded
            FROM web_form_submissions ws
            WHERE ws.tenant_id = o.tenant_id AND ws.pet_id = o.pet_id
            ORDER BY ws.id DESC
            LIMIT 1
        ) s
        WHERE o.id = d.cremation_id
          AND d.dedication IS NULL
          AND COALESCE(TRIM(s.ded), '') <> ''
    """))


def downgrade() -> None:
    op.drop_column('oc_details', 'dedication')

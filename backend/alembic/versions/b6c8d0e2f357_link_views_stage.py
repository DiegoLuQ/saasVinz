"""link_views_stage

sys_public_link_views.stage: en qué estado estaba la orden cuando se abrió su
seguimiento ('in_progress' | 'delivered' | 'cancelled'; NULL en memoriales), para
filtrar los KPIs de tracking por «En proceso / Entregadas / Todas».

Las aperturas ya guardadas se clasifican con la huella del tracking_token de cada
orden: después de su fecha de entrega (oc_scheduling.completed_at) = delivered,
orden cancelada = cancelled, el resto (y los registros sin orden) = in_progress.

Revision ID: b6c8d0e2f357
Revises: a5b7c9d1e246
Create Date: 2026-11-09 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'b6c8d0e2f357'
down_revision: Union[str, Sequence[str], None] = 'a5b7c9d1e246'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CANCELED = "('cancelado','canceled','cancelled','rejected','rechazado','rechazado_por_cliente')"


def upgrade() -> None:
    op.execute("ALTER TABLE sys_public_link_views ADD COLUMN IF NOT EXISTS stage VARCHAR(20);")
    op.execute(f"""
        UPDATE sys_public_link_views v
           SET stage = CASE
                 WHEN lower(coalesce(oc.status, '')) IN {CANCELED} THEN 'cancelled'
                 WHEN s.completed_at IS NOT NULL AND v.created_at >= s.completed_at THEN 'delivered'
                 ELSE 'in_progress'
               END
          FROM oc_details d
          JOIN oc_cremations oc ON oc.id = d.cremation_id
          LEFT JOIN oc_scheduling s ON s.cremation_id = oc.id
         WHERE v.kind = 'tracking' AND v.stage IS NULL
           AND d.tenant_id = v.tenant_id
           AND encode(sha256(convert_to(d.tracking_token, 'UTF8')), 'hex') = v.resource_key;
    """)
    op.execute("UPDATE sys_public_link_views SET stage = 'in_progress' WHERE kind = 'tracking' AND stage IS NULL;")


def downgrade() -> None:
    op.execute("ALTER TABLE sys_public_link_views DROP COLUMN IF EXISTS stage;")

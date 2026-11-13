"""order_line_snapshot

Copia de lo vendido en cada orden, para poder editar planes y servicios sin
alterar las órdenes ya creadas (app/services/order_snapshot.py):

- oc_plans: plan_name, plan_group, included_services (JSON [{service_id, name,
  optional, position}]) y snapshot_source ('order' = copiada al crear la línea,
  'backfill' = reconstruida aquí con el plan tal como estaba al migrar).
- oc_services: service_name, is_special, price_on_request (indicador «servicios
  especiales» separado de los normales vendidos sueltos).

Revision ID: d3f5a7b9c148
Revises: c1e3f5a7b826
Create Date: 2026-11-13 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd3f5a7b9c148'
down_revision: Union[str, Sequence[str], None] = 'c1e3f5a7b826'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE oc_plans ADD COLUMN IF NOT EXISTS plan_name VARCHAR(150);")
    op.execute("ALTER TABLE oc_plans ADD COLUMN IF NOT EXISTS plan_group VARCHAR(60);")
    op.execute("ALTER TABLE oc_plans ADD COLUMN IF NOT EXISTS included_services JSON;")
    op.execute("ALTER TABLE oc_plans ADD COLUMN IF NOT EXISTS snapshot_source VARCHAR(20);")
    op.execute("ALTER TABLE oc_services ADD COLUMN IF NOT EXISTS service_name VARCHAR(150);")
    op.execute("ALTER TABLE oc_services ADD COLUMN IF NOT EXISTS is_special BOOLEAN;")
    op.execute("ALTER TABLE oc_services ADD COLUMN IF NOT EXISTS price_on_request BOOLEAN;")

    # Backfill de las órdenes existentes con el contenido ACTUAL de cada plan/servicio
    # (lo que se haya editado antes de esta migración no se puede recuperar).
    conn = op.get_bind()
    conn.execute(sa.text("SELECT set_config('app.bypass_rls', 'true', true)"))
    conn.execute(sa.text("""
        UPDATE oc_plans op
        SET plan_name = LEFT(p.name, 150),
            plan_group = p.group_name,
            included_services = COALESCE((
                SELECT json_agg(json_build_object(
                           'service_id', s.id, 'name', s.name,
                           'optional', COALESCE(ps.is_optional, false), 'position', ps.sort_order)
                       ORDER BY ps.sort_order, ps.id)
                FROM srv_plan_services ps JOIN srv_services s ON s.id = ps.service_id
                WHERE ps.plan_id = p.id), '[]'::json),
            snapshot_source = 'backfill'
        FROM srv_plans p
        WHERE p.id = op.plan_id AND op.snapshot_source IS NULL
    """))
    conn.execute(sa.text("""
        UPDATE oc_plans SET included_services = '[]'::json, snapshot_source = 'backfill'
        WHERE snapshot_source IS NULL
    """))
    conn.execute(sa.text("""
        UPDATE oc_services os
        SET service_name = LEFT(s.name, 150),
            is_special = COALESCE(s.is_special, false),
            price_on_request = COALESCE(s.price_on_request, false)
        FROM srv_services s
        WHERE s.id = os.service_id AND os.service_name IS NULL
    """))


def downgrade() -> None:
    for col in ("price_on_request", "is_special", "service_name"):
        op.execute(f"ALTER TABLE oc_services DROP COLUMN IF EXISTS {col};")
    for col in ("snapshot_source", "included_services", "plan_group", "plan_name"):
        op.execute(f"ALTER TABLE oc_plans DROP COLUMN IF EXISTS {col};")

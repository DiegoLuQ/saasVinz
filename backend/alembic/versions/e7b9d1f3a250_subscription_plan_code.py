"""subscription_plan_code

Código interno fijo de cada plan SaaS (`sys_subscription_plans.code`: FREE, TRACK,
NORMAL, PRO, ULTRA…). La lógica que antes comparaba el NOMBRE del plan (marca
blanca y widget por defecto, web institucional de ULTRA, plan FREE del registro,
CTA de la web…) usa ahora el código, así el SuperAdmin puede renombrar un plan
(Admin → Planes) sin romper nada. El nombre queda solo para mostrar.

Revision ID: e7b9d1f3a250
Revises: d3f5a7b9c148
Create Date: 2026-11-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'e7b9d1f3a250'
down_revision: Union[str, Sequence[str], None] = 'd3f5a7b9c148'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_subscription_plans ADD COLUMN IF NOT EXISTS code VARCHAR(20);")
    # Código = nombre actual en mayúsculas, solo letras/números/guion bajo.
    op.execute("""
        UPDATE sys_subscription_plans
        SET code = LEFT(REGEXP_REPLACE(UPPER(TRIM(name)), '[^A-Z0-9_]+', '_', 'g'), 20)
        WHERE code IS NULL
    """)
    # Si dos nombres quedaran con el mismo código, el de mayor id lleva su id.
    op.execute("""
        UPDATE sys_subscription_plans p SET code = LEFT(p.code, 14) || '_' || p.id
        WHERE EXISTS (SELECT 1 FROM sys_subscription_plans q WHERE q.code = p.code AND q.id < p.id)
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uix_subscription_plan_code ON sys_subscription_plans (code);")
    # display_order pasa a mandar en toda la web; se fija el orden que la web ya mostraba
    # (estaba escrito en el código): FREE, TRACK, NORMAL, PRO, ULTRA y después el resto.
    op.execute("""
        UPDATE sys_subscription_plans p SET display_order = o.n
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY
                COALESCE(ARRAY_POSITION(ARRAY['FREE','TRACK','NORMAL','PRO','ULTRA']::varchar[], code), 99),
                display_order, price, id) AS n
            FROM sys_subscription_plans
        ) o WHERE o.id = p.id
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uix_subscription_plan_code;")
    op.execute("ALTER TABLE sys_subscription_plans DROP COLUMN IF EXISTS code;")

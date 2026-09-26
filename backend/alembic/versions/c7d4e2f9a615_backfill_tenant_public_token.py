"""backfill_tenant_public_token

Genera `public_token` para los tenants que no lo tienen. Desde este cambio el
formulario público exige credencial (token, partner o API key del widget), y un
tenant sin public_token se queda sin enlace permanente funcional. Los tenants
nuevos lo reciben por el default del modelo.

Solo datos (sin DDL). Idempotente: toca únicamente filas con NULL o vacío.

Revision ID: c7d4e2f9a615
Revises: a1b2c3d4e5f6
Create Date: 2026-09-26 01:00:00.000000

"""
import secrets
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c7d4e2f9a615'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("SELECT set_config('app.bypass_rls', 'true', true)"))
    rows = conn.execute(sa.text(
        "SELECT id FROM sys_tenants WHERE public_token IS NULL OR public_token = ''"
    )).fetchall()
    for (tenant_id,) in rows:
        conn.execute(
            sa.text("UPDATE sys_tenants SET public_token = :token WHERE id = :id"),
            {"token": secrets.token_urlsafe(12), "id": tenant_id},
        )


def downgrade() -> None:
    # No reversible con precisión (no se sabe qué filas estaban vacías) y los
    # tokens generados son inocuos: se dejan.
    pass

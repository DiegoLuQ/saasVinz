"""service_price_on_request

srv_services.price_on_request: el servicio (especial) se puede elegir sin precio
(«Precio a cotizar»: p. ej. un servicio externo); el crematorio pone el valor
después en la orden. srv_services.important_note: nota importante que la familia
ve en el formulario, en el resumen y en el correo de confirmación.

Revision ID: a3c5e7f9b218
Revises: f9b1c3d5e406
Create Date: 2026-11-06 21:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'a3c5e7f9b218'
down_revision: Union[str, Sequence[str], None] = 'f9b1c3d5e406'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE srv_services ADD COLUMN IF NOT EXISTS price_on_request BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE srv_services ADD COLUMN IF NOT EXISTS important_note VARCHAR(300)")


def downgrade() -> None:
    op.execute("ALTER TABLE srv_services DROP COLUMN IF EXISTS important_note")
    op.execute("ALTER TABLE srv_services DROP COLUMN IF EXISTS price_on_request")

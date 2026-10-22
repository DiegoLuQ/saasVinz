"""tenant_auto_documents

sys_tenants.auto_documents (JSON): qué documentos genera "Generar todo" en el
detalle de un registro y con qué plantilla:
{"certificate": {"enabled", "template_id"}, "digital": {"enabled", "template_id"},
 "social": {"enabled", "template_id"}}. template_id null = la predeterminada
(certificado / tarjeta de homenaje); la de redes debe elegirse.

Revision ID: d9f1b3c5e570
Revises: c7e9a1b3d458
Create Date: 2026-10-20 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd9f1b3c5e570'
down_revision: Union[str, Sequence[str], None] = 'c7e9a1b3d458'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_tenants ADD COLUMN IF NOT EXISTS auto_documents JSON;")


def downgrade() -> None:
    op.execute("ALTER TABLE sys_tenants DROP COLUMN IF EXISTS auto_documents;")

"""certificate_folio

Folio automático del certificado (campo «Folio» del diseño con imagen):
- sys_tenants.cert_folio_next: próximo número correlativo del crematorio
  (NULL = 1; el crematorio fija el número de partida en Configuración → Certificados).
  Uno por crematorio, nunca se reinicia.
- ops_certificates.folio: el folio que se imprimió (se reutiliza al volver a emitir
  el certificado de la misma orden; buscable en el Repositorio).

Revision ID: c7e9a1b3d425
Revises: b5d7f9a1c304
Create Date: 2026-11-20 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'c7e9a1b3d425'
down_revision: Union[str, Sequence[str], None] = 'b5d7f9a1c304'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_tenants ADD COLUMN IF NOT EXISTS cert_folio_next INTEGER;
        ALTER TABLE ops_certificates ADD COLUMN IF NOT EXISTS folio VARCHAR(40);
        CREATE INDEX IF NOT EXISTS ix_ops_certificates_tenant_folio ON ops_certificates (tenant_id, folio);
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS ix_ops_certificates_tenant_folio;
        ALTER TABLE ops_certificates DROP COLUMN IF EXISTS folio;
        ALTER TABLE sys_tenants DROP COLUMN IF EXISTS cert_folio_next;
    """)

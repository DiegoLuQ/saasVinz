"""certificate_number_per_tenant

El número de certificado/recibo se genera por crematorio (CREM-{año}-{OC},
REC-{OC}), pero ops_certificates.number era único en TODA la tabla: el primer
certificado de un tenant chocaba con el mismo número de otro tenant
(UniqueViolation "ops_certificates_number_key" al emitir). Pasa a ser único por
(tenant_id, number). No hay duplicados posibles al migrar: la restricción
anterior era más estricta.

Revision ID: c5f7a9b1d258
Revises: b3e5a7c9d146
Create Date: 2026-09-30 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c5f7a9b1d258'
down_revision: Union[str, Sequence[str], None] = 'b3e5a7c9d146'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE ops_certificates DROP CONSTRAINT IF EXISTS ops_certificates_number_key;
        ALTER TABLE ops_certificates DROP CONSTRAINT IF EXISTS uix_certificate_number_tenant;
        ALTER TABLE ops_certificates
            ADD CONSTRAINT uix_certificate_number_tenant UNIQUE (tenant_id, number);
    """)


def downgrade() -> None:
    # Solo reversible si no hay números repetidos entre tenants.
    op.execute("""
        ALTER TABLE ops_certificates DROP CONSTRAINT IF EXISTS uix_certificate_number_tenant;
        ALTER TABLE ops_certificates
            ADD CONSTRAINT ops_certificates_number_key UNIQUE (number);
    """)

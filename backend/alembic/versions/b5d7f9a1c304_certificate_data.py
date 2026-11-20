"""certificate_data

ops_certificates.data: copia de los datos con que se emitió el certificado
(diseño, mascota, dueño y lo que se imprimió en cada campo, incluidos los textos
con código y de dónde salió cada uno). La muestra «Ver datos» en
Documentos → Repositorio. Certificados anteriores = NULL (solo número, fecha,
orden y la vista del certificado).

Revision ID: b5d7f9a1c304
Revises: a3e5c7f9b192
Create Date: 2026-11-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'b5d7f9a1c304'
down_revision: Union[str, Sequence[str], None] = 'a3e5c7f9b192'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE ops_certificates ADD COLUMN IF NOT EXISTS data JSON;")


def downgrade() -> None:
    op.execute("ALTER TABLE ops_certificates DROP COLUMN IF EXISTS data;")

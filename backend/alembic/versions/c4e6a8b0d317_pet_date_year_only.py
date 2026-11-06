"""pet_date_precision

crm_pets.birth_date_precision / death_date_precision: qué tanto se sabe de la
fecha — 'day' (fecha completa), 'month' (mes y año) o 'year' (solo el año).
La fecha se guarda en el día 1 (y enero con solo año) y los documentos
(certificado, diseños, memorial) muestran solo lo que se sabe.

(El archivo conserva el nombre de su primera versión «year_only», que nunca
llegó a producción.)

Revision ID: c4e6a8b0d317
Revises: a3c5e7f9b218
Create Date: 2026-11-06 23:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'c4e6a8b0d317'
down_revision: Union[str, Sequence[str], None] = 'a3c5e7f9b218'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for col in ("birth_date_precision", "death_date_precision"):
        op.execute(f"ALTER TABLE crm_pets ADD COLUMN IF NOT EXISTS {col} VARCHAR(5) NOT NULL DEFAULT 'day'")
        op.execute(f"""
            DO $$ BEGIN
                ALTER TABLE crm_pets ADD CONSTRAINT ck_crm_pets_{col} CHECK ({col} IN ('day', 'month', 'year'));
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """)


def downgrade() -> None:
    for col in ("birth_date_precision", "death_date_precision"):
        op.execute(f"ALTER TABLE crm_pets DROP CONSTRAINT IF EXISTS ck_crm_pets_{col}")
        op.execute(f"ALTER TABLE crm_pets DROP COLUMN IF EXISTS {col}")
    # Primera versión local (booleans), por si quedó aplicada en una base de desarrollo
    op.execute("ALTER TABLE crm_pets DROP COLUMN IF EXISTS birth_date_year_only")
    op.execute("ALTER TABLE crm_pets DROP COLUMN IF EXISTS death_date_year_only")

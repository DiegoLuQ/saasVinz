"""pet_date_precision_fix

La revisión c4e6a8b0d317 llegó a producción en su primera versión (columnas
booleanas birth/death_date_year_only) y después se reescribió con las columnas
de precisión. Como Alembic ya la tenía por aplicada, en esas bases faltan
birth_date_precision / death_date_precision. Esta migración las asegura en
cualquier caso (idempotente), pasa los «solo año» a precision='year' y borra
las columnas booleanas.

Revision ID: d6f8a0c2e429
Revises: c4e6a8b0d317
Create Date: 2026-11-06 17:30:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'd6f8a0c2e429'
down_revision: Union[str, Sequence[str], None] = 'c4e6a8b0d317'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for which in ("birth", "death"):
        col = f"{which}_date_precision"
        op.execute(f"ALTER TABLE crm_pets ADD COLUMN IF NOT EXISTS {col} VARCHAR(5) NOT NULL DEFAULT 'day'")
        op.execute(f"""
            DO $$ BEGIN
                ALTER TABLE crm_pets ADD CONSTRAINT ck_crm_pets_{col} CHECK ({col} IN ('day', 'month', 'year'));
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """)
        # Si existía la versión booleana: «solo año» → 'year' y se borra
        op.execute(f"""
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name = 'crm_pets' AND column_name = '{which}_date_year_only') THEN
                    UPDATE crm_pets SET {col} = 'year' WHERE {which}_date_year_only IS TRUE;
                    ALTER TABLE crm_pets DROP COLUMN {which}_date_year_only;
                END IF;
            END $$;
        """)


def downgrade() -> None:
    # c4e6a8b0d317 (versión actual) ya crea estas columnas: no se quitan aquí.
    pass

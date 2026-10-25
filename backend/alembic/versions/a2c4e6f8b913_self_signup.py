"""self_signup

Registro autoservicio del plan FREE (vinzer.cl/crear-cuenta) y primeros pasos:

- sys_tenants.signup_source: 'self' (se registró solo) | NULL (creado por el admin).
- sys_tenants.terms_accepted_at / terms_version: constancia de la aceptación de
  los Términos y la Política de Privacidad al registrarse.
- sys_tenants.onboarding_dismissed_at: el crematorio ocultó la tarjeta
  «Configura tu crematorio» del inicio.

Revision ID: a2c4e6f8b913
Revises: f9b1d3e5a472
Create Date: 2026-10-23 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a2c4e6f8b913'
down_revision: Union[str, Sequence[str], None] = 'f9b1d3e5a472'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_tenants
            ADD COLUMN IF NOT EXISTS signup_source VARCHAR(20),
            ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20),
            ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE sys_tenants
            DROP COLUMN IF EXISTS onboarding_dismissed_at,
            DROP COLUMN IF EXISTS terms_version,
            DROP COLUMN IF EXISTS terms_accepted_at,
            DROP COLUMN IF EXISTS signup_source;
    """)

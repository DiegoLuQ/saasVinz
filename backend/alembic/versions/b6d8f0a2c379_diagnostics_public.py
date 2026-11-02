"""diagnostics_public

Diagnóstico 360° público (vinzer.cl/diagnostico): el crematorio se diagnostica solo.

- sys_diagnostics.source: 'admin' (lo llenó el SuperAdmin) | 'web' (landing pública).
- public_token: enlace privado al informe (/diagnostico/informe/<token>), se envía por correo.
- completed_at: NULL = dejó nombre y correo pero no terminó las preguntas (prospecto igual).
- utm: de dónde llegó (utm_source/medium/campaign, p. ej. instagram, tiktok, google).
- contact_name y city pasan a opcionales: la landing solo pide nombre del crematorio y correo.

Revision ID: b6d8f0a2c379
Revises: a4c6e8f0b257
Create Date: 2026-11-01 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b6d8f0a2c379'
down_revision: Union[str, Sequence[str], None] = 'a4c6e8f0b257'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_diagnostics ADD COLUMN IF NOT EXISTS source VARCHAR(10) NOT NULL DEFAULT 'admin';
        ALTER TABLE sys_diagnostics ADD COLUMN IF NOT EXISTS public_token VARCHAR(64);
        ALTER TABLE sys_diagnostics ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
        ALTER TABLE sys_diagnostics ADD COLUMN IF NOT EXISTS utm JSON;
        ALTER TABLE sys_diagnostics ALTER COLUMN contact_name DROP NOT NULL;
        ALTER TABLE sys_diagnostics ALTER COLUMN city DROP NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS uix_sys_diagnostics_public_token ON sys_diagnostics(public_token);
        UPDATE sys_diagnostics SET completed_at = created_at WHERE completed_at IS NULL;
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS uix_sys_diagnostics_public_token;
        ALTER TABLE sys_diagnostics DROP COLUMN IF EXISTS utm;
        ALTER TABLE sys_diagnostics DROP COLUMN IF EXISTS completed_at;
        ALTER TABLE sys_diagnostics DROP COLUMN IF EXISTS public_token;
        ALTER TABLE sys_diagnostics DROP COLUMN IF EXISTS source;
    """)

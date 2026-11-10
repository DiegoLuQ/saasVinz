"""catalog_video

Agrega el campo catalog_video (JSON) a sys_tenants para guardar el video de
bienvenida del catálogo público (procesado y optimizado por SuperAdmin).

Revision ID: c7e9b1d3f508
Revises: b6c8d0e2f357
Create Date: 2026-11-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c7e9b1d3f508'
down_revision: Union[str, Sequence[str], None] = 'b6c8d0e2f357'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sys_tenants ADD COLUMN IF NOT EXISTS catalog_video JSON;")


def downgrade() -> None:
    op.execute("ALTER TABLE sys_tenants DROP COLUMN IF EXISTS catalog_video;")


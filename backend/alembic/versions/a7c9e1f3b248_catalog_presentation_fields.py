"""catalog_presentation_fields

Campos de presentación del catálogo público de planes (todos opcionales, con
valores por defecto que no alteran los datos existentes):

- sys_tenants.catalog_tagline / catalog_intro: lema e introducción del catálogo.
- srv_plans.is_featured: plan destacado ("Más solicitado"), uno por tenant.
- srv_plans.price_label: texto que reemplaza al precio (ej. "Según peso").
- srv_plans.sort_order: posición del plan en el catálogo.
- srv_plan_services.sort_order / is_optional: orden del servicio dentro del
  plan y si es un extra opcional.

Revision ID: a7c9e1f3b248
Revises: d4f6a8c0e257
Create Date: 2026-09-29 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a7c9e1f3b248'
down_revision: Union[str, Sequence[str], None] = 'd4f6a8c0e257'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE sys_tenants
            ADD COLUMN IF NOT EXISTS catalog_tagline VARCHAR(120),
            ADD COLUMN IF NOT EXISTS catalog_intro TEXT;

        ALTER TABLE srv_plans
            ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS price_label VARCHAR(60),
            ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

        ALTER TABLE srv_plan_services
            ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS is_optional BOOLEAN NOT NULL DEFAULT FALSE;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE srv_plan_services
            DROP COLUMN IF EXISTS is_optional,
            DROP COLUMN IF EXISTS sort_order;

        ALTER TABLE srv_plans
            DROP COLUMN IF EXISTS sort_order,
            DROP COLUMN IF EXISTS price_label,
            DROP COLUMN IF EXISTS is_featured;

        ALTER TABLE sys_tenants
            DROP COLUMN IF EXISTS catalog_intro,
            DROP COLUMN IF EXISTS catalog_tagline;
    """)

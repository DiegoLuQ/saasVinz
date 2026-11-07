"""pet_age_unit

crm_pets.age_unit: la edad puede estar en días, semanas, meses o años
(antes solo años enteros). Las fichas existentes quedan en 'years'.

Revision ID: a1c3e5f7b984
Revises: f0b2d4e6a873
Create Date: 2026-11-07 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a1c3e5f7b984'
down_revision: Union[str, Sequence[str], None] = 'f0b2d4e6a873'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('crm_pets', sa.Column('age_unit', sa.String(6), nullable=False, server_default='years'))
    op.create_check_constraint('ck_crm_pets_age_unit', 'crm_pets', "age_unit IN ('days', 'weeks', 'months', 'years')")


def downgrade() -> None:
    op.drop_constraint('ck_crm_pets_age_unit', 'crm_pets', type_='check')
    op.drop_column('crm_pets', 'age_unit')

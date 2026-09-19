"""driver_role_blueprint

Da al rol `driver` un blueprint propio (solo `operaciones`, opcional). Sin
blueprint, un rol no tiene techo de rol y ve todo lo que permite el plan
(incluido el Dashboard con ingresos). Solo se inserta si el rol aún no tiene
blueprint, para no pisar lo que el creador haya definido desde la UI.

Revision ID: 7d2e9c4a1b58
Revises: 3bf566cddb7d
Create Date: 2026-09-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '7d2e9c4a1b58'
down_revision: Union[str, Sequence[str], None] = '3bf566cddb7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO auth_role_module_blueprints (role, module_key, is_mandatory)
        SELECT 'driver', 'operaciones', false
        WHERE NOT EXISTS (
            SELECT 1 FROM auth_role_module_blueprints WHERE role = 'driver'
        )
        AND EXISTS (SELECT 1 FROM sys_modules WHERE key = 'operaciones')
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM auth_role_module_blueprints
        WHERE role = 'driver' AND module_key = 'operaciones' AND is_mandatory = false
        """
    )

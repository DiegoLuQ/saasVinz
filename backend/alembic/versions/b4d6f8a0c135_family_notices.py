"""family_notices

Avisos a la familia y encuesta de satisfacción (Fase 3):

- ops_workflow_steps.notify_family: al entrar la orden a esa fase se le envía
  un correo a la familia (con la marca del crematorio y el link de seguimiento).
- sys_tenants.family_notices: ajustes del crematorio ({"on_finish": bool} =
  correo de agradecimiento con la encuesta al concluir). NULL = apagado (los
  crematorios existentes no empiezan a enviar correos sin activarlo).
- ops_family_notices: registro de cada aviso enviado (correo o WhatsApp), para
  no repetirlo y mostrarlo en la orden. Con RLS.
- ops_service_feedback: encuesta de la familia (1–5 estrellas + comentario),
  una por orden. Con RLS.

Revision ID: b4d6f8a0c135
Revises: a2c4e6f8b913
Create Date: 2026-10-23 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b4d6f8a0c135'
down_revision: Union[str, Sequence[str], None] = 'a2c4e6f8b913'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("ops_family_notices", "ops_service_feedback")

RLS = """
    ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;
    ALTER TABLE {t} FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation_policy ON {t};
    CREATE POLICY tenant_isolation_policy ON {t}
        FOR ALL
        USING (
            (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
            OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
        )
        WITH CHECK (
            (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
            OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
        );
"""


def upgrade() -> None:
    op.execute("""
        ALTER TABLE ops_workflow_steps
            ADD COLUMN IF NOT EXISTS notify_family BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE sys_tenants
            ADD COLUMN IF NOT EXISTS family_notices JSON;

        CREATE TABLE IF NOT EXISTS ops_family_notices (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            cremation_id INTEGER NOT NULL REFERENCES oc_cremations(id) ON DELETE CASCADE,
            step_id INTEGER REFERENCES ops_workflow_steps(id) ON DELETE SET NULL,
            kind VARCHAR(20) NOT NULL,
            channel VARCHAR(20) NOT NULL,
            sent_to VARCHAR(255),
            created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_ops_family_notices_order ON ops_family_notices(cremation_id);

        CREATE TABLE IF NOT EXISTS ops_service_feedback (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
            cremation_id INTEGER NOT NULL UNIQUE REFERENCES oc_cremations(id) ON DELETE CASCADE,
            rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment VARCHAR(500),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_ops_service_feedback_tenant ON ops_service_feedback(tenant_id, created_at);
    """)
    for t in TABLES:
        op.execute(RLS.format(t=t))
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    grants = "\n".join(
        f'GRANT SELECT, INSERT, UPDATE, DELETE ON {t} TO "{app_user}";\n'
        f'GRANT USAGE, SELECT ON SEQUENCE {t}_id_seq TO "{app_user}";'
        for t in TABLES
    )
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                {grants}
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS ops_service_feedback CASCADE;
        DROP TABLE IF EXISTS ops_family_notices CASCADE;
        ALTER TABLE sys_tenants DROP COLUMN IF EXISTS family_notices;
        ALTER TABLE ops_workflow_steps DROP COLUMN IF EXISTS notify_family;
    """)

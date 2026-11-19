"""rls_and_cremation_plan_sync

Asegura paridad entre entorno local y producción:
1. Activa y fuerza RLS (`tenant_isolation_policy`) sobre `srv_plan_change_events`.
2. Asegura permisos GRANT para `vinzer_app`, `vincer_app` y el rol de aplicación activo.
3. Sincroniza en órdenes existentes (`oc_cremations` y `oc_plans`):
   - Marca `es_principal = TRUE` en el primer plan de órdenes que tenían planes sin principal.
   - Rellena `oc_plans.plan_name` si estaba nulo desde `srv_plans.name`.
   - Actualiza `oc_cremations.cremation_type` con el nombre del plan principal en aquellas órdenes
     que quedaron con 'Individual' (ej. ingresadas desde el formulario público) pero tienen plan contratado.

Revision ID: f3c5d7e9a281
Revises: f2b4d6e8a170
Create Date: 2026-11-18 22:55:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'f3c5d7e9a281'
down_revision: Union[str, Sequence[str], None] = 'f2b4d6e8a170'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. RLS en srv_plan_change_events
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('public.srv_plan_change_events') IS NOT NULL THEN
                ALTER TABLE srv_plan_change_events ENABLE ROW LEVEL SECURITY;
                ALTER TABLE srv_plan_change_events FORCE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS tenant_isolation_policy ON srv_plan_change_events;
                CREATE POLICY tenant_isolation_policy ON srv_plan_change_events
                    FOR ALL
                    USING (
                        (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                        OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
                    )
                    WITH CHECK (
                        (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
                        OR (current_setting('app.bypass_rls', true) IN ('true', 'on', '1'))
                    );
            END IF;
        END $$;
        """
    )

    # 2. Permisos GRANT para ambos roles (local: vincer_app, producción: vinzer_app)
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    roles_to_check = {'vinzer_app', 'vincer_app'}
    try:
        configured_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username
        if configured_user and configured_user.replace('_', '').isalnum():
            roles_to_check.add(configured_user)
    except Exception:
        pass

    tables_and_seqs = [
        ('srv_plan_change_events', 'srv_plan_change_events_id_seq'),
        ('sys_plan_change_events', 'sys_plan_change_events_id_seq'),
        ('sys_tracking_custom_templates', 'sys_tracking_custom_templates_id_seq'),
        ('sys_module_clicks_daily', 'sys_module_clicks_daily_id_seq'),
    ]

    for role in roles_to_check:
        for table_name, seq_name in tables_and_seqs:
            op.execute(f"""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
                        IF to_regclass('public.{table_name}') IS NOT NULL THEN
                            GRANT SELECT, INSERT, UPDATE, DELETE ON {table_name} TO "{role}";
                        END IF;
                        IF to_regclass('public.{seq_name}') IS NOT NULL THEN
                            GRANT USAGE, SELECT ON SEQUENCE {seq_name} TO "{role}";
                        END IF;
                    END IF;
                END $$;
            """)

    # 3. Backfill de planes en órdenes existentes (oc_plans y oc_cremations)
    # Rellenar plan_name faltante en oc_plans
    op.execute(
        """
        UPDATE oc_plans op
        SET plan_name = sp.name
        FROM srv_plans sp
        WHERE op.plan_id = sp.id
          AND (op.plan_name IS NULL OR BTRIM(op.plan_name) = '');
        """
    )

    # Marcar es_principal = TRUE en el primer plan de órdenes que tienen planes pero ninguno marcado como principal
    op.execute(
        """
        WITH first_plan_per_order AS (
            SELECT DISTINCT ON (cremation_id) id
            FROM oc_plans
            WHERE cremation_id IS NOT NULL
              AND cremation_id NOT IN (
                  SELECT cremation_id FROM oc_plans WHERE es_principal = TRUE AND cremation_id IS NOT NULL
              )
            ORDER BY cremation_id, id ASC
        )
        UPDATE oc_plans
        SET es_principal = TRUE
        WHERE id IN (SELECT id FROM first_plan_per_order);
        """
    )

    # Actualizar cremation_type en oc_cremations cuando quedó como 'Individual' pero la orden tiene un plan en oc_plans
    op.execute(
        """
        WITH resolved_order_plans AS (
            SELECT DISTINCT ON (op.cremation_id)
                op.cremation_id,
                COALESCE(NULLIF(BTRIM(op.plan_name), ''), sp.name) AS resolved_name
            FROM oc_plans op
            LEFT JOIN srv_plans sp ON sp.id = op.plan_id
            WHERE op.cremation_id IS NOT NULL
              AND COALESCE(NULLIF(BTRIM(op.plan_name), ''), sp.name) IS NOT NULL
            ORDER BY op.cremation_id, op.es_principal DESC, op.id ASC
        )
        UPDATE oc_cremations oc
        SET cremation_type = rop.resolved_name
        FROM resolved_order_plans rop
        WHERE oc.id = rop.cremation_id
          AND (
              oc.cremation_type IS NULL
              OR LOWER(BTRIM(oc.cremation_type)) IN ('individual', 'servicio personalizado', '')
          );
        """
    )


def downgrade() -> None:
    pass

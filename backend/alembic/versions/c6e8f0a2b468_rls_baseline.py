"""rls_baseline

Las políticas RLS de las tablas base (clientes, mascotas, órdenes, pagos…)
nunca estuvieron en Alembic: se aplicaron a mano con
scripts/database/sql/003_enable_rls.sql y 007_strict_rls_policies.sql. Una base
creada desde cero con `alembic upgrade head` (instalación nueva, restauración en
otro servidor, CI) quedaba con RLS en solo 11 tablas y sin aislamiento entre
crematorios en el resto.

Esta migración deja ese estado como parte del historial. Es NO destructiva: activa
y fuerza RLS (no-op si ya está) y crea cada política solo si no existe con ese
nombre, así que en una base que ya las tiene (local, producción) no cambia nada.
Mismas definiciones que 007 / 010.

Revision ID: c6e8f0a2b468
Revises: b4d6f8a0c135
Create Date: 2026-10-23 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c6e8f0a2b468'
down_revision: Union[str, Sequence[str], None] = 'b4d6f8a0c135'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tablas con tenant_id aisladas por crematorio (lista de 007 + sys_tenant_api_keys de 018).
TENANT_TABLES = [
    'auth_tenant_module_configs', 'crm_customers', 'crm_pets', 'inv_categories',
    'inv_products', 'inv_providers', 'oc_cremations', 'oc_details',
    'oc_financial', 'oc_logistics', 'oc_plans', 'oc_products',
    'oc_scheduling', 'oc_services', 'ops_certificate_templates',
    'ops_certificates', 'ops_documents', 'ops_farewell_templates',
    'ops_logistics_tasks', 'ops_workflow_steps', 'ptn_partner_links',
    'srv_plan_products', 'srv_plan_services',
    'srv_plans', 'srv_services', 'srv_weight_pricing', 'sys_audit_logs',
    'sys_billing_transactions', 'sys_notifications', 'sys_table_configurations',
    'sys_temporary_tokens', 'sys_tenant_announcements', 'sys_tenant_api_keys',
    'sys_tenant_billing_info', 'sys_tenant_subscriptions', 'web_form_submissions',
    'web_theme_config',
]

TENANT_POLICY = """(tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::integer)
                OR (current_setting(''app.bypass_rls'', true) = ''true'')"""


def _create_policy_if_missing(table: str, name: str, body: str) -> str:
    return f"""
    IF to_regclass('public.{table}') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '{table}' AND policyname = '{name}') THEN
        EXECUTE '{body}';
    END IF;"""


def upgrade() -> None:
    stmts = []
    for t in TENANT_TABLES:
        stmts.append(f"""
    IF to_regclass('public.{t}') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE {t} ENABLE ROW LEVEL SECURITY';
        EXECUTE 'ALTER TABLE {t} FORCE ROW LEVEL SECURITY';
    END IF;""")
        stmts.append(_create_policy_if_missing(
            t, 'tenant_isolation_policy',
            f"CREATE POLICY tenant_isolation_policy ON {t} FOR ALL USING ({TENANT_POLICY})",
        ))

    # Plantillas globales (tenant_id NULL) legibles por todos los crematorios (010).
    stmts.append(_create_policy_if_missing(
        'ops_farewell_templates', 'farewell_global_read_policy',
        "CREATE POLICY farewell_global_read_policy ON ops_farewell_templates FOR SELECT USING (tenant_id IS NULL)",
    ))
    stmts.append(_create_policy_if_missing(
        'ops_certificate_templates', 'certificate_templates_global_read_policy',
        "CREATE POLICY certificate_templates_global_read_policy ON ops_certificate_templates FOR SELECT USING (tenant_id IS NULL)",
    ))

    # Configuración global: lectura pública, escritura solo con bypass (SuperAdmin). Sin FORCE.
    stmts.append("""
    IF to_regclass('public.sys_saas_config') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE sys_saas_config ENABLE ROW LEVEL SECURITY';
    END IF;""")
    stmts.append(_create_policy_if_missing(
        'sys_saas_config', 'saas_config_admin_policy',
        "CREATE POLICY saas_config_admin_policy ON sys_saas_config FOR ALL USING (current_setting(''app.bypass_rls'', true) = ''true'')",
    ))
    stmts.append(_create_policy_if_missing(
        'sys_saas_config', 'saas_config_public_read',
        "CREATE POLICY saas_config_public_read ON sys_saas_config FOR SELECT USING (true)",
    ))

    op.execute("DO $$\nBEGIN" + "".join(stmts) + "\nEND $$;")


def downgrade() -> None:
    # No se revierte: quitar RLS dejaría los datos de los crematorios sin aislamiento.
    pass

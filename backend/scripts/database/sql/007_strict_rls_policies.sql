-- =====================================================
-- Migración 007: Políticas RLS Estrictas
-- Fecha: 2026-05-21
-- Descripción: Reemplaza las políticas permisivas (global_policy)
--   que permiten acceso cuando app.current_tenant_id está vacío,
--   con políticas estrictas que DENIEGAN acceso si no se declara
--   un tenant_id válido en la sesión de PostgreSQL.
-- =====================================================

DO $$ 
DECLARE 
    t text;
    -- Tablas multi-inquilino con columna tenant_id
    tables text[] := ARRAY[
        'auth_tenant_module_configs', 'crm_customers', 'crm_pets', 'inv_categories', 
        'inv_products', 'inv_providers', 'oc_cremations', 'oc_details', 
        'oc_financial', 'oc_logistics', 'oc_plans', 'oc_products', 
        'oc_scheduling', 'oc_services', 'ops_certificate_templates', 
        'ops_certificates', 'ops_documents', 'ops_farewell_templates', 
        'ops_logistics_tasks', 'ops_workflow_steps', 'ptn_partner_links', 
        'srv_plan_products', 'srv_plan_services', 
        'srv_plans', 'srv_services', 'srv_weight_pricing', 'sys_audit_logs', 
        'sys_billing_transactions', 'sys_notifications', 'sys_table_configurations', 
        'sys_temporary_tokens', 'sys_tenant_announcements', 'sys_tenant_billing_info', 
        'sys_tenant_subscriptions', 'web_form_submissions', 'web_theme_config'
    ];
BEGIN 
    FOR t IN SELECT unnest(tables) LOOP
        -- 1. Eliminar la política permisiva anterior
        EXECUTE format('DROP POLICY IF EXISTS global_policy ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', t);
        
        -- 2. Crear política ESTRICTA: Bloquea si no se declaró tenant_id
        --    Solo permite acceso si:
        --      a) tenant_id coincide con app.current_tenant_id (sesión configurada)
        --      b) app.bypass_rls = 'true' (para SuperAdmin/Creator)
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON %I
            FOR ALL
            USING (
                (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::integer)
                OR (current_setting(''app.bypass_rls'', true) = ''true'')
            )', t);
            
        RAISE NOTICE 'Política estricta creada para: %', t;
    END LOOP;
END $$;

-- =====================================================
-- Política especial para sys_saas_config
-- Esta tabla NO tiene tenant_id, tiene reglas diferentes
-- =====================================================

-- Mantener la política existente de sys_saas_config (solo bypass para escritura, lectura pública)
-- No la tocamos porque ya tiene: global_policy (bypass only) + public_read_policy (SELECT true)
-- Verificamos que existen y las recreamos correctamente:
DROP POLICY IF EXISTS global_policy ON sys_saas_config;
DROP POLICY IF EXISTS public_read_policy ON sys_saas_config;

-- Solo Creator/bypass puede modificar la configuración global
CREATE POLICY saas_config_admin_policy ON sys_saas_config
    FOR ALL
    USING (current_setting('app.bypass_rls', true) = 'true');

-- Todos pueden leer la configuración global (necesario para login, etc.)
CREATE POLICY saas_config_public_read ON sys_saas_config
    FOR SELECT
    USING (true);

DO $$ 
DECLARE 
    t text;
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
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        -- Force RLS even for table owner (superuser bypassed by default but not owner)
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        
        -- Drop existing policy if exists to avoid errors on retry
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', t);
        
        -- Create the policy
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON %I
            USING (
                tenant_id::text = current_setting(''app.current_tenant_id'', true) 
                OR current_setting(''app.bypass_rls'', true) = ''true''
            )', t);
            
        RAISE NOTICE 'RLS habilitado y política creada para: %', t;
    END LOOP;
END $$;

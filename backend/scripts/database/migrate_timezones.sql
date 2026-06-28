-- Migration to convert all timestamp columns to TIMESTAMPTZ (America/Santiago aware)
-- Run this as a superuser (e.g., postgres)

-- List of tables and their timestamp columns to update
DO $$
DECLARE
    t_name TEXT;
    c_name TEXT;
    tables TEXT[] := ARRAY[
        'sys_tenants', 'sys_subscription_plans', 'sys_audit_logs', 
        'sys_temporary_tokens', 'sys_table_configurations', 'sys_saas_config',
        'sys_notifications', 'sys_tenant_announcements', 'sys_user_announcement_views',
        'ops_farewell_templates', 'web_landing_configs', 'web_form_submissions',
        'crm_customers', 'crm_pets', 'ptn_partners', 'ptn_partner_links',
        'ptn_commissions', 'oc_cremations', 'ops_workflow_steps',
        'inv_categories', 'inv_providers', 'inv_products', 'srv_services', 
        'srv_plans', 'srv_plan_products', 'srv_plan_services', 'srv_weight_pricing',
        'ops_oc_evidence', 'ops_certificates'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables LOOP
        -- Check for created_at
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'created_at') THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE ''UTC''', t_name);
            RAISE NOTICE 'Updated created_at for table %', t_name;
        END IF;

        -- Check for updated_at
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'updated_at') THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE ''UTC''', t_name);
            RAISE NOTICE 'Updated updated_at for table %', t_name;
        END IF;

        -- Check for other specific timestamp columns
        IF t_name = 'sys_user_announcement_views' AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'viewed_at') THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN viewed_at TYPE TIMESTAMPTZ USING viewed_at AT TIME ZONE ''UTC''', t_name);
        END IF;

        IF t_name = 'oc_cremations' AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'processed_at') THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN processed_at TYPE TIMESTAMPTZ USING processed_at AT TIME ZONE ''UTC''', t_name);
        END IF;

        IF t_name = 'ops_certificates' AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'issue_date') THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN issue_date TYPE TIMESTAMPTZ USING issue_date AT TIME ZONE ''UTC''', t_name);
        END IF;
    END LOOP;
END $$;

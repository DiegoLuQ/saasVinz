-- SaaS Crematorio Database Schema
-- Generated: 2026-02-04 19:07:01
-- PostgreSQL Database Initialization Script

-- This script creates all tables, indexes, and constraints for the SaaS Crematorio system


-- Table: auth_role_module_blueprints
-- ====================================
CREATE TABLE IF NOT EXISTS auth_role_module_blueprints (
    id INTEGER NOT NULL nextval('auth_role_module_blueprints_id_seq'::regclass),
    role VARCHAR(18) NOT NULL,
    module_key VARCHAR NOT NULL,
    is_mandatory BOOLEAN
);


-- Table: auth_tenant_module_configs
-- ====================================
CREATE TABLE IF NOT EXISTS auth_tenant_module_configs (
    id INTEGER NOT NULL nextval('auth_tenant_module_configs_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    role VARCHAR(18) NOT NULL,
    module_key VARCHAR NOT NULL,
    is_active BOOLEAN,
    updated_at TIMESTAMP
);


-- Table: auth_user_module_permissions
-- ====================================
CREATE TABLE IF NOT EXISTS auth_user_module_permissions (
    id INTEGER NOT NULL nextval('auth_user_module_permissions_id_seq'::regclass),
    user_id INTEGER,
    module_key VARCHAR,
    is_active BOOLEAN,
    actions JSON
);


-- Table: crm_customers
-- ====================================
CREATE TABLE IF NOT EXISTS crm_customers (
    id INTEGER NOT NULL nextval('crm_customers_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    rut VARCHAR,
    name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    address VARCHAR,
    country VARCHAR,
    region VARCHAR,
    city VARCHAR,
    created_at TIMESTAMP
);


-- Table: crm_pets
-- ====================================
CREATE TABLE IF NOT EXISTS crm_pets (
    id INTEGER NOT NULL nextval('crm_pets_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    name VARCHAR,
    species VARCHAR,
    breed VARCHAR,
    size VARCHAR,
    birth_date TIMESTAMP,
    death_date TIMESTAMP,
    age INTEGER,
    image_url VARCHAR,
    images JSON,
    status VARCHAR(10),
    created_at TIMESTAMP
);


-- Table: inv_categories
-- ====================================
CREATE TABLE IF NOT EXISTS inv_categories (
    id INTEGER NOT NULL nextval('inv_categories_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    name VARCHAR,
    description VARCHAR,
    created_at TIMESTAMP
);


-- Table: inv_products
-- ====================================
CREATE TABLE IF NOT EXISTS inv_products (
    id INTEGER NOT NULL nextval('inv_products_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    category_id INTEGER,
    provider_id INTEGER,
    code VARCHAR,
    name VARCHAR,
    cost_price DOUBLE PRECISION,
    sale_price DOUBLE PRECISION,
    stock INTEGER,
    description VARCHAR,
    image_url VARCHAR,
    images JSON,
    availability_status VARCHAR,
    is_active BOOLEAN,
    created_at TIMESTAMP
);


-- Table: inv_providers
-- ====================================
CREATE TABLE IF NOT EXISTS inv_providers (
    id INTEGER NOT NULL nextval('inv_providers_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    name VARCHAR,
    rut VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    created_at TIMESTAMP
);


-- Table: oc_cremation_technical
-- ====================================
CREATE TABLE IF NOT EXISTS oc_cremation_technical (
    cremation_id INTEGER NOT NULL,
    step_id INTEGER,
    operator_id INTEGER,
    furnace_id VARCHAR,
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    temperature DOUBLE PRECISION,
    evidence_url VARCHAR,
    timeline JSON
);


-- Table: oc_cremations
-- ====================================
CREATE TABLE IF NOT EXISTS oc_cremations (
    id INTEGER NOT NULL nextval('oc_cremations_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    created_at TIMESTAMP,
    pet_id INTEGER,
    oc_number INTEGER,
    cremation_type VARCHAR,
    status VARCHAR,
    weight DOUBLE PRECISION,
    partner_link_id INTEGER,
    verification_code VARCHAR(10)
);


-- Table: oc_details
-- ====================================
CREATE TABLE IF NOT EXISTS oc_details (
    cremation_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    images JSON,
    notes VARCHAR,
    tracking_token VARCHAR,
    additional_services JSON,
    service_code VARCHAR
);


-- Table: oc_financial
-- ====================================
CREATE TABLE IF NOT EXISTS oc_financial (
    cremation_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    total_price DOUBLE PRECISION,
    total_cost DOUBLE PRECISION,
    discount DOUBLE PRECISION,
    weight_price DOUBLE PRECISION,
    commission DOUBLE PRECISION
);


-- Table: oc_logistics
-- ====================================
CREATE TABLE IF NOT EXISTS oc_logistics (
    cremation_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    region VARCHAR,
    city VARCHAR,
    address VARCHAR,
    pickup_region VARCHAR,
    pickup_city VARCHAR,
    pickup_address VARCHAR
);


-- Table: oc_plans
-- ====================================
CREATE TABLE IF NOT EXISTS oc_plans (
    id INTEGER NOT NULL nextval('oc_plans_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    cremation_id INTEGER,
    plan_id INTEGER,
    cantidad INTEGER,
    precio_costo DOUBLE PRECISION,
    precio_venta DOUBLE PRECISION,
    created_at TIMESTAMP
);


-- Table: oc_products
-- ====================================
CREATE TABLE IF NOT EXISTS oc_products (
    id INTEGER NOT NULL nextval('oc_products_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    cremation_id INTEGER,
    product_id INTEGER,
    cantidad INTEGER,
    precio_costo DOUBLE PRECISION,
    precio_venta DOUBLE PRECISION,
    created_at TIMESTAMP
);


-- Table: oc_scheduling
-- ====================================
CREATE TABLE IF NOT EXISTS oc_scheduling (
    cremation_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP
);


-- Table: oc_services
-- ====================================
CREATE TABLE IF NOT EXISTS oc_services (
    id INTEGER NOT NULL nextval('oc_services_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    cremation_id INTEGER,
    service_id INTEGER,
    cantidad INTEGER,
    precio_costo DOUBLE PRECISION,
    precio_venta DOUBLE PRECISION,
    created_at TIMESTAMP
);


-- Table: ops_certificate_templates
-- ====================================
CREATE TABLE IF NOT EXISTS ops_certificate_templates (
    id INTEGER NOT NULL nextval('ops_certificate_templates_id_seq'::regclass),
    tenant_id INTEGER,
    name VARCHAR NOT NULL,
    category VARCHAR,
    paper_format VARCHAR,
    theme VARCHAR,
    title VARCHAR,
    subtitle VARCHAR,
    declaration_text VARCHAR,
    signature_text VARCHAR,
    memorial_message VARCHAR,
    memorial_title VARCHAR,
    header_logo_url VARCHAR,
    header_logo_x VARCHAR,
    header_logo_y VARCHAR,
    background_logo_url VARCHAR,
    background_logo_x VARCHAR,
    background_logo_y VARCHAR,
    background_logo_opacity DOUBLE PRECISION,
    background_logo_rotation DOUBLE PRECISION,
    header_logo_shape VARCHAR,
    background_logo_shape VARCHAR,
    farewell_text VARCHAR,
    sections_config JSON,
    sections_order JSON,
    is_default BOOLEAN,
    created_at TIMESTAMP
);


-- Table: ops_certificates
-- ====================================
CREATE TABLE IF NOT EXISTS ops_certificates (
    id INTEGER NOT NULL nextval('ops_certificates_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    cremation_id INTEGER,
    type VARCHAR,
    number VARCHAR,
    issue_date TIMESTAMP,
    html_content VARCHAR,
    pdf_url VARCHAR,
    created_at TIMESTAMP
);


-- Table: ops_documents
-- ====================================
CREATE TABLE IF NOT EXISTS ops_documents (
    id INTEGER NOT NULL nextval('ops_documents_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    cremation_id INTEGER,
    type VARCHAR,
    file_url VARCHAR,
    created_at TIMESTAMP
);


-- Table: ops_farewell_templates
-- ====================================
CREATE TABLE IF NOT EXISTS ops_farewell_templates (
    id INTEGER NOT NULL nextval('ops_farewell_templates_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    description VARCHAR,
    config JSON NOT NULL,
    preview_url VARCHAR,
    is_default BOOLEAN,
    created_at TIMESTAMP
);


-- Table: ops_logistics_tasks
-- ====================================
CREATE TABLE IF NOT EXISTS ops_logistics_tasks (
    id INTEGER NOT NULL nextval('ops_logistics_tasks_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    driver_id INTEGER,
    cremation_id INTEGER,
    type VARCHAR,
    status VARCHAR,
    address VARCHAR,
    contact_name VARCHAR,
    contact_phone VARCHAR,
    checklist JSON,
    evidence_image_url VARCHAR,
    signature_url VARCHAR,
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP
);


-- Table: ops_order_evidence
-- ====================================
CREATE TABLE IF NOT EXISTS ops_order_evidence (
    id INTEGER NOT NULL nextval('ops_order_evidence_id_seq'::regclass),
    cremation_id INTEGER NOT NULL,
    step_id INTEGER NOT NULL,
    comments JSON,
    photo_url VARCHAR,
    created_at TIMESTAMP
);


-- Table: ops_workflow_steps
-- ====================================
CREATE TABLE IF NOT EXISTS ops_workflow_steps (
    id INTEGER NOT NULL nextval('ops_workflow_steps_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    order_index INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMP
);


-- Table: ptn_partner_commissions
-- ====================================
CREATE TABLE IF NOT EXISTS ptn_partner_commissions (
    id INTEGER NOT NULL nextval('ptn_partner_commissions_id_seq'::regclass),
    cremation_id INTEGER NOT NULL,
    partner_link_id INTEGER NOT NULL,
    amount DOUBLE PRECISION,
    amount_porcentaje DOUBLE PRECISION,
    status VARCHAR(9),
    paid_at TIMESTAMP,
    notes VARCHAR,
    created_at TIMESTAMP
);


-- Table: ptn_partner_links
-- ====================================
CREATE TABLE IF NOT EXISTS ptn_partner_links (
    id INTEGER NOT NULL nextval('ptn_partner_links_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    veterinary_id INTEGER NOT NULL,
    status VARCHAR(8),
    slug_publico VARCHAR NOT NULL,
    tipo_comision VARCHAR,
    monto_comision DOUBLE PRECISION,
    porcentaje_comision DOUBLE PRECISION,
    bank_data_override JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);


-- Table: rec_dedicatoria
-- ====================================
CREATE TABLE IF NOT EXISTS rec_dedicatoria (
    id_dedicatoria INTEGER NOT NULL nextval('rec_dedicatoria_id_dedicatoria_seq'::regclass),
    id_recuerdo INTEGER NOT NULL,
    mensajero VARCHAR(100),
    mensaje VARCHAR(300),
    estado VARCHAR DEFAULT 'pendiente'::character varying,
    fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- Table: rec_recuerdos
-- ====================================
CREATE TABLE IF NOT EXISTS rec_recuerdos (
    id INTEGER NOT NULL nextval('rec_recuerdos_id_seq'::regclass),
    id_recuerdo UUID NOT NULL,
    id_mascota INTEGER NOT NULL,
    id_tenant INTEGER NOT NULL,
    diseno JSONB DEFAULT '{}'::jsonb,
    lista_imagenes JSONB DEFAULT '[]'::jsonb,
    main_image_url VARCHAR,
    imagen_ia VARCHAR,
    msg_despedida TEXT,
    access_key VARCHAR(6),
    status VARCHAR DEFAULT 'activo'::character varying,
    es_privado BOOLEAN DEFAULT false,
    fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- Table: srv_plan_products
-- ====================================
CREATE TABLE IF NOT EXISTS srv_plan_products (
    id INTEGER NOT NULL nextval('srv_plan_products_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    plan_id INTEGER,
    product_id INTEGER
);


-- Table: srv_plan_services
-- ====================================
CREATE TABLE IF NOT EXISTS srv_plan_services (
    id INTEGER NOT NULL nextval('srv_plan_services_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    plan_id INTEGER,
    service_id INTEGER
);


-- Table: srv_plans
-- ====================================
CREATE TABLE IF NOT EXISTS srv_plans (
    id INTEGER NOT NULL nextval('srv_plans_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    name VARCHAR,
    description VARCHAR,
    price DOUBLE PRECISION,
    cost DOUBLE PRECISION,
    is_active BOOLEAN,
    created_at TIMESTAMP
);


-- Table: srv_services
-- ====================================
CREATE TABLE IF NOT EXISTS srv_services (
    id INTEGER NOT NULL nextval('srv_services_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    name VARCHAR,
    description VARCHAR,
    price DOUBLE PRECISION,
    cost DOUBLE PRECISION,
    is_active BOOLEAN,
    created_at TIMESTAMP
);


-- Table: srv_weight_pricing
-- ====================================
CREATE TABLE IF NOT EXISTS srv_weight_pricing (
    id INTEGER NOT NULL nextval('srv_weight_pricing_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    min_weight DOUBLE PRECISION,
    max_weight DOUBLE PRECISION,
    price DOUBLE PRECISION,
    created_at TIMESTAMP
);


-- Table: sys_audit_logs
-- ====================================
CREATE TABLE IF NOT EXISTS sys_audit_logs (
    id INTEGER NOT NULL nextval('sys_audit_logs_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    user_id INTEGER,
    action VARCHAR NOT NULL,
    resource_type VARCHAR,
    resource_id INTEGER,
    status VARCHAR,
    status_code INTEGER,
    resource_name VARCHAR,
    details VARCHAR,
    ip_address VARCHAR,
    user_agent VARCHAR,
    error_message VARCHAR,
    created_at TIMESTAMP
);


-- Table: sys_billing_transactions
-- ====================================
CREATE TABLE IF NOT EXISTS sys_billing_transactions (
    id INTEGER NOT NULL nextval('sys_billing_transactions_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    subscription_id INTEGER,
    amount DOUBLE PRECISION NOT NULL,
    payment_method paymentmethod,
    payment_status paymentstatus,
    payment_date TIMESTAMP,
    payment_reference VARCHAR,
    notes TEXT,
    target_plan_id INTEGER,
    target_billing_cycle billingcycle,
    created_by INTEGER,
    created_at TIMESTAMP,
    receipt_url VARCHAR
);


-- Table: sys_coupons
-- ====================================
CREATE TABLE IF NOT EXISTS sys_coupons (
    id INTEGER NOT NULL nextval('sys_coupons_id_seq'::regclass),
    code VARCHAR NOT NULL,
    discount_percent INTEGER NOT NULL,
    is_active BOOLEAN,
    valid_until TIMESTAMP,
    max_uses INTEGER,
    current_uses INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);


-- Table: sys_modules
-- ====================================
CREATE TABLE IF NOT EXISTS sys_modules (
    id INTEGER NOT NULL nextval('sys_modules_id_seq'::regclass),
    key VARCHAR,
    name VARCHAR NOT NULL,
    description VARCHAR,
    icon VARCHAR,
    created_at TIMESTAMP
);


-- Table: sys_notifications
-- ====================================
CREATE TABLE IF NOT EXISTS sys_notifications (
    id INTEGER NOT NULL nextval('sys_notifications_id_seq'::regclass),
    tenant_id INTEGER,
    title VARCHAR NOT NULL,
    message VARCHAR,
    type VARCHAR,
    is_read BOOLEAN,
    data JSON,
    created_at TIMESTAMP,
    veterinary_id INTEGER,
    recipient_type VARCHAR(20) NOT NULL DEFAULT 'tenant'::character varying,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal'::character varying,
    action_url VARCHAR(500),
    expires_at TIMESTAMP
);


-- Table: sys_receipts
-- ====================================
CREATE TABLE IF NOT EXISTS sys_receipts (
    id INTEGER NOT NULL nextval('sys_receipts_id_seq'::regclass),
    receipt_number VARCHAR(20) NOT NULL,
    tenant_id INTEGER NOT NULL,
    transaction_id INTEGER,
    tenant_name VARCHAR(255) NOT NULL,
    tenant_email VARCHAR(255),
    tenant_phone VARCHAR(50),
    tenant_address TEXT,
    plan_name VARCHAR(100) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    amount NUMERIC NOT NULL,
    currency VARCHAR(3) DEFAULT 'CLP'::character varying,
    period_start_date TIMESTAMP NOT NULL,
    period_end_date TIMESTAMP NOT NULL,
    pdf_url TEXT NOT NULL,
    pdf_size_bytes INTEGER,
    template_id INTEGER,
    template_snapshot TEXT,
    status VARCHAR(20) DEFAULT 'active'::character varying,
    voided_at TIMESTAMP,
    voided_by INTEGER,
    void_reason TEXT,
    replaced_by_receipt_id INTEGER,
    replaces_receipt_id INTEGER,
    issued_at TIMESTAMP DEFAULT now(),
    issued_by INTEGER,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);


-- Table: sys_saas_config
-- ====================================
CREATE TABLE IF NOT EXISTS sys_saas_config (
    id INTEGER NOT NULL nextval('sys_saas_config_id_seq'::regclass),
    name VARCHAR NOT NULL DEFAULT 'SaaS Crematorio'::character varying,
    rut VARCHAR,
    slug VARCHAR DEFAULT 'saas-crematorio'::character varying,
    logo VARCHAR,
    eslogan VARCHAR,
    descripcion TEXT,
    mision TEXT,
    vision TEXT,
    direccion VARCHAR,
    ciudad VARCHAR,
    pais VARCHAR,
    whatsapp VARCHAR,
    correo VARCHAR,
    redes_sociales JSONB DEFAULT '[]'::jsonb,
    imagenes JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- Table: sys_subscription_plans
-- ====================================
CREATE TABLE IF NOT EXISTS sys_subscription_plans (
    id INTEGER NOT NULL nextval('sys_subscription_plans_id_seq'::regclass),
    name VARCHAR,
    max_pets INTEGER,
    max_services INTEGER,
    max_plans INTEGER,
    max_products INTEGER,
    max_orders INTEGER,
    max_customers INTEGER,
    max_users INTEGER,
    max_partners INTEGER,
    allowed_modules JSON,
    can_delete BOOLEAN,
    can_export BOOLEAN,
    price DOUBLE PRECISION,
    annual_price DOUBLE PRECISION,
    description VARCHAR,
    features JSON,
    is_active BOOLEAN,
    display_order INTEGER,
    stripe_price_id VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);


-- Table: sys_table_configurations
-- ====================================
CREATE TABLE IF NOT EXISTS sys_table_configurations (
    id INTEGER NOT NULL nextval('sys_table_configurations_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    table_name VARCHAR,
    columns_config JSON,
    updated_at TIMESTAMP
);


-- Table: sys_temporary_tokens
-- ====================================
CREATE TABLE IF NOT EXISTS sys_temporary_tokens (
    id INTEGER NOT NULL nextval('sys_temporary_tokens_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    token VARCHAR NOT NULL,
    created_by_user_id INTEGER,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN,
    created_at TIMESTAMP
);


-- Table: sys_tenant_announcements
-- ====================================
CREATE TABLE IF NOT EXISTS sys_tenant_announcements (
    id INTEGER NOT NULL nextval('sys_tenant_announcements_id_seq'::regclass),
    tenant_id INTEGER,
    type VARCHAR(7) NOT NULL,
    display_type VARCHAR(6),
    target_status VARCHAR(9),
    target_plan_id INTEGER,
    title VARCHAR NOT NULL,
    content VARCHAR NOT NULL,
    is_active BOOLEAN,
    show_once BOOLEAN,
    must_read BOOLEAN,
    priority INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);


-- Table: sys_tenant_billing_info
-- ====================================
CREATE TABLE IF NOT EXISTS sys_tenant_billing_info (
    id INTEGER NOT NULL nextval('sys_tenant_billing_info_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    billing_cycle VARCHAR,
    billing_status VARCHAR,
    billing_end_date TIMESTAMP,
    last_payment_date TIMESTAMP,
    last_payment_method VARCHAR,
    billing_notify_days INTEGER,
    billing_notify_channels VARCHAR,
    billing_discount INTEGER,
    monthly_price DOUBLE PRECISION,
    updated_at TIMESTAMP
);


-- Table: sys_tenant_subscriptions
-- ====================================
CREATE TABLE IF NOT EXISTS sys_tenant_subscriptions (
    id INTEGER NOT NULL nextval('sys_tenant_subscriptions_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    subscription_plan_id INTEGER NOT NULL,
    status subscriptionstatus,
    billing_cycle billingcycle,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    next_billing_date TIMESTAMP NOT NULL,
    monthly_price DOUBLE PRECISION NOT NULL,
    discount_percent INTEGER,
    final_price DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);


-- Table: sys_tenants
-- ====================================
CREATE TABLE IF NOT EXISTS sys_tenants (
    id INTEGER NOT NULL nextval('sys_tenants_id_seq'::regclass),
    name VARCHAR NOT NULL,
    short_name VARCHAR(10),
    slug VARCHAR,
    rut VARCHAR,
    pending_reason VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    logo_url VARCHAR,
    social_media JSON,
    legal_rep_name VARCHAR,
    legal_rep_rut VARCHAR,
    timezone VARCHAR,
    status VARCHAR(9),
    subscription_plan_id INTEGER,
    plan VARCHAR,
    public_token VARCHAR,
    billing_cycle VARCHAR,
    billing_status VARCHAR,
    billing_end_date TIMESTAMP,
    last_payment_date TIMESTAMP,
    last_payment_method VARCHAR,
    billing_notify_days INTEGER,
    billing_notify_channels VARCHAR,
    billing_discount INTEGER,
    created_at TIMESTAMP,
    address VARCHAR,
    region VARCHAR,
    city VARCHAR,
    country VARCHAR DEFAULT 'Chile'::character varying
);


-- Table: sys_user_announcement_views
-- ====================================
CREATE TABLE IF NOT EXISTS sys_user_announcement_views (
    id INTEGER NOT NULL nextval('sys_user_announcement_views_id_seq'::regclass),
    user_id INTEGER NOT NULL,
    announcement_id INTEGER NOT NULL,
    viewed_at TIMESTAMP
);


-- Table: sys_users
-- ====================================
CREATE TABLE IF NOT EXISTS sys_users (
    id INTEGER NOT NULL nextval('sys_users_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    name VARCHAR,
    email VARCHAR,
    password_hash VARCHAR,
    role VARCHAR(18),
    is_active BOOLEAN,
    created_at TIMESTAMP
);


-- Table: sys_veterinaries
-- ====================================
CREATE TABLE IF NOT EXISTS sys_veterinaries (
    id INTEGER NOT NULL nextval('sys_veterinaries_id_seq'::regclass),
    name VARCHAR NOT NULL,
    rut VARCHAR,
    slug VARCHAR,
    email VARCHAR,
    password_hash VARCHAR NOT NULL,
    address VARCHAR,
    city VARCHAR,
    region VARCHAR,
    phone VARCHAR,
    bank_data JSON,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    country VARCHAR DEFAULT 'Chile'::character varying
);


-- Table: web_form_submissions
-- ====================================
CREATE TABLE IF NOT EXISTS web_form_submissions (
    id INTEGER NOT NULL nextval('web_form_submissions_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    slug VARCHAR,
    owner_data JSON NOT NULL,
    pet_data JSON NOT NULL,
    selected_services JSON,
    images JSON,
    customer_id INTEGER,
    pet_id INTEGER,
    status VARCHAR,
    created_at TIMESTAMP,
    processed_at TIMESTAMP
);


-- Table: web_landing_configs
-- ====================================
CREATE TABLE IF NOT EXISTS web_landing_configs (
    id INTEGER NOT NULL nextval('web_landing_configs_id_seq'::regclass),
    key VARCHAR,
    config JSON NOT NULL,
    updated_at TIMESTAMP
);


-- Table: web_theme_config
-- ====================================
CREATE TABLE IF NOT EXISTS web_theme_config (
    id INTEGER NOT NULL nextval('web_theme_config_id_seq'::regclass),
    tenant_id INTEGER NOT NULL,
    theme_mode VARCHAR,
    auto_light_start VARCHAR,
    auto_light_end VARCHAR,
    custom_theme_colors JSON
);

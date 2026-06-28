-- Migration: Add subscription management tables
-- Database: PostgreSQL
-- Description: Adds tenant_subscriptions and billing_transactions tables for subscription management
-- Date: 2026-01-27
-- Author: Antigravity AI

-- ============================================
-- Create ENUM types
-- ============================================

CREATE TYPE subscription_status AS ENUM ('active', 'pending', 'expired', 'canceled', 'trial');
CREATE TYPE billing_cycle_type AS ENUM ('monthly', 'bimonthly', 'semiannual', 'annual');
CREATE TYPE payment_method_type AS ENUM ('transfer', 'stripe', 'paypal', 'cash');
CREATE TYPE payment_status_type AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ============================================
-- Table: tenant_subscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
    subscription_plan_id INTEGER NOT NULL REFERENCES sys_subscription_plans(id) ON DELETE RESTRICT,
    
    -- Status and cycle
    status subscription_status DEFAULT 'active' NOT NULL,
    billing_cycle billing_cycle_type DEFAULT 'monthly' NOT NULL,
    
    -- Dates
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    next_billing_date TIMESTAMP NOT NULL,
    
    -- Pricing
    monthly_price NUMERIC(10, 2) NOT NULL,
    discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    final_price NUMERIC(10, 2) NOT NULL,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tenant_subscriptions
CREATE INDEX idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_tenant_status ON tenant_subscriptions(tenant_id, status);

-- ============================================
-- Table: billing_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS billing_transactions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
    
    -- Payment details
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method_type DEFAULT 'transfer' NOT NULL,
    payment_status payment_status_type DEFAULT 'pending' NOT NULL,
    payment_date TIMESTAMP,
    payment_reference VARCHAR(255),
    
    -- Additional info
    notes TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for billing_transactions
CREATE INDEX idx_billing_transactions_tenant_id ON billing_transactions(tenant_id);
CREATE INDEX idx_billing_transactions_status ON billing_transactions(payment_status);
CREATE INDEX idx_billing_transactions_date ON billing_transactions(payment_date);
CREATE INDEX idx_billing_transactions_tenant_status ON billing_transactions(tenant_id, payment_status);

-- ============================================
-- Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_subscriptions_updated_at
BEFORE UPDATE ON tenant_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE tenant_subscriptions IS 'Stores subscription history and management for each tenant';
COMMENT ON TABLE billing_transactions IS 'Records all billing transactions and payment attempts';

COMMENT ON COLUMN tenant_subscriptions.monthly_price IS 'Base monthly price at time of subscription creation';
COMMENT ON COLUMN tenant_subscriptions.final_price IS 'Final price after all discounts for the entire billing period';
COMMENT ON COLUMN tenant_subscriptions.discount_percent IS 'Custom discount percentage (0-100)';

COMMENT ON COLUMN billing_transactions.payment_reference IS 'External reference: transfer number, Stripe ID, etc.';
COMMENT ON COLUMN billing_transactions.subscription_id IS 'Optional link to specific subscription period';

-- ============================================
-- Sample data (optional - uncomment to insert)
-- ============================================

/*
-- Example: Create a subscription for a tenant
INSERT INTO tenant_subscriptions (
    tenant_id,
    subscription_plan_id,
    status,
    billing_cycle,
    start_date,
    end_date,
    next_billing_date,
    monthly_price,
    discount_percent,
    final_price
) VALUES (
    1,  -- tenant_id
    2,  -- subscription_plan_id (NORMAL)
    'active',
    'monthly',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 month',
    CURRENT_TIMESTAMP + INTERVAL '1 month',
    29990.00,
    0,
    29990.00
);

-- Example: Record a payment transaction
INSERT INTO billing_transactions (
    tenant_id,
    subscription_id,
    amount,
    payment_method,
    payment_status,
    payment_date,
    payment_reference,
    notes
) VALUES (
    1,
    1,
    29990.00,
    'transfer',
    'completed',
    CURRENT_TIMESTAMP,
    'TRANS-20260127-001',
    'Pago mensual enero 2026'
);
*/

-- ============================================
-- Verification queries
-- ============================================

/*
-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenant_subscriptions', 'billing_transactions');

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('tenant_subscriptions', 'billing_transactions');

-- Check enum types
SELECT typname 
FROM pg_type 
WHERE typname IN ('subscription_status', 'billing_cycle_type', 'payment_method_type', 'payment_status_type');
*/

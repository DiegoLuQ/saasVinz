-- Migration: Add enhanced fields to SubscriptionPlan
-- Database: PostgreSQL
-- Description: Adds fields for better plan management (description, features, pricing, display)
-- Date: 2026-01-27

-- Add new columns to sys_subscription_plans
ALTER TABLE sys_subscription_plans 
ADD COLUMN IF NOT EXISTS annual_price NUMERIC(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index on is_active for filtering active plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active 
ON sys_subscription_plans(is_active);

-- Add index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order 
ON sys_subscription_plans(display_order);

-- Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_subscription_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_subscription_plan_updated_at ON sys_subscription_plans;
CREATE TRIGGER trigger_subscription_plan_updated_at
BEFORE UPDATE ON sys_subscription_plans
FOR EACH ROW
EXECUTE FUNCTION update_subscription_plan_updated_at();

-- Add comments for documentation
COMMENT ON COLUMN sys_subscription_plans.annual_price IS 'Annual price with discount (if applicable)';
COMMENT ON COLUMN sys_subscription_plans.description IS 'Plan description for UI display';
COMMENT ON COLUMN sys_subscription_plans.features IS 'JSON array of features: [{"name": "...", "included": true}]';
COMMENT ON COLUMN sys_subscription_plans.is_active IS 'Whether plan is available for selection';
COMMENT ON COLUMN sys_subscription_plans.display_order IS 'Order for UI display (lower number = first)';
COMMENT ON COLUMN sys_subscription_plans.stripe_price_id IS 'Stripe Price ID for future payment integration';

-- Set display_order for existing plans based on name
UPDATE sys_subscription_plans SET display_order = 1 WHERE name = 'FREE';
UPDATE sys_subscription_plans SET display_order = 2 WHERE name = 'NORMAL';
UPDATE sys_subscription_plans SET display_order = 3 WHERE name = 'PRO';
UPDATE sys_subscription_plans SET display_order = 4 WHERE name = 'ULTRA';

-- Set default descriptions for existing plans (optional - можно настроить позже)
UPDATE sys_subscription_plans SET description = 'Plan gratuito con funcionalidades básicas' WHERE name = 'FREE';
UPDATE sys_subscription_plans SET description = 'Plan ideal para pequeños crematorios' WHERE name = 'NORMAL';
UPDATE sys_subscription_plans SET description = 'Plan profesional con características avanzadas' WHERE name = 'PRO';
UPDATE sys_subscription_plans SET description = 'Plan premium con todas las funcionalidades' WHERE name = 'ULTRA';

-- Verification query
/*
SELECT 
    name, 
    price as monthly_price, 
    annual_price,
    description,
    is_active,
    display_order,
    features
FROM sys_subscription_plans
ORDER BY display_order;
*/

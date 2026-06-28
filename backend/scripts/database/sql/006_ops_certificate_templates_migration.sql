-- Migration: Add source_template_id to ops_certificate_templates 
-- Goal: Support template inheritance for certificates

ALTER TABLE ops_certificate_templates ADD COLUMN IF NOT EXISTS source_template_id INTEGER NULL;

-- Add Foreign Key if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_source_template') THEN
        ALTER TABLE ops_certificate_templates 
        ADD CONSTRAINT fk_source_template 
        FOREIGN KEY (source_template_id) 
        REFERENCES ops_certificate_templates(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add Index
CREATE INDEX IF NOT EXISTS idx_ops_certificate_templates_source_template_id ON ops_certificate_templates(source_template_id);

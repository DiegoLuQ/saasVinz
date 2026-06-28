# Sistema de Gestión de Recibos SaaS
# Tabla: receipts
# Descripción: Almacena recibos generados con numeración incremental y trazabilidad completa

-- 1. Crear tabla de recibos
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(20) UNIQUE NOT NULL, -- R-000001, R-000002, etc.
    
    -- Relaciones
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES billing_transactions(id) ON DELETE SET NULL,
    
    -- Datos del cliente (snapshot en el momento de emisión)
    tenant_name VARCHAR(255) NOT NULL,
    tenant_email VARCHAR(255),
    tenant_phone VARCHAR(50),
    tenant_address TEXT,
    
    -- Datos de la suscripción
    plan_name VARCHAR(100) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL, -- monthly, quarterly, yearly
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CLP',
    
    -- Período cubierto
    period_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Archivo PDF
    pdf_url TEXT NOT NULL, -- /storage/receipts/{tenant_id}/R-000001.pdf
    pdf_size_bytes INTEGER,
    
    -- Metadata de diseño usado
    template_id INTEGER REFERENCES certificate_templates(id) ON DELETE SET NULL,
    template_snapshot JSONB, -- Copia del sections_config usado
    
    -- Estado y auditoría
    status VARCHAR(20) DEFAULT 'active', -- active, voided, replaced
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    void_reason TEXT,
    
    -- Reemplazo (si fue anulado y re-emitido)
    replaced_by_receipt_id INTEGER REFERENCES receipts(id) ON DELETE SET NULL,
    replaces_receipt_id INTEGER REFERENCES receipts(id) ON DELETE SET NULL,
    
    -- Timestamps
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX idx_receipts_tenant_id ON receipts(tenant_id);
CREATE INDEX idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_receipts_issued_at ON receipts(issued_at DESC);

-- 3. Crear secuencia para numeración incremental
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- 4. Función para generar el siguiente número de recibo
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    next_num INTEGER;
    formatted_number VARCHAR(20);
BEGIN
    next_num := nextval('receipt_number_seq');
    formatted_number := 'R-' || LPAD(next_num::TEXT, 6, '0');
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_receipts_updated_at
    BEFORE UPDATE ON receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_receipts_updated_at();

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para receipts
-- Política para SaaS Creator (tenant_id IS NULL en contexto)
CREATE POLICY receipts_creator_all ON receipts
    FOR ALL
    USING (current_setting('app.current_tenant_id', true) IS NULL OR current_setting('app.current_tenant_id', true) = '');

-- Política para Tenants (solo sus propios recibos)
CREATE POLICY receipts_tenant_select ON receipts
    FOR SELECT
    USING (
        current_setting('app.current_tenant_id', true) IS NOT NULL 
        AND current_setting('app.current_tenant_id', true) != ''
        AND tenant_id = current_setting('app.current_tenant_id', true)::INTEGER
    );

-- 8. Comentarios para documentación
COMMENT ON TABLE receipts IS 'Almacena recibos generados con numeración incremental y trazabilidad completa';
COMMENT ON COLUMN receipts.receipt_number IS 'Número único de recibo con formato R-000001';
COMMENT ON COLUMN receipts.template_snapshot IS 'Snapshot del diseño usado para generar el PDF (inmutable)';
COMMENT ON COLUMN receipts.status IS 'Estado: active (activo), voided (anulado), replaced (reemplazado)';
COMMENT ON COLUMN receipts.replaced_by_receipt_id IS 'ID del recibo que reemplaza a este (si fue anulado y re-emitido)';

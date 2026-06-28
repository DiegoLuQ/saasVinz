-- =====================================================
-- Migración 015: imagen de catálogo en srv_plans
-- Fecha: 2026-06-12
-- Descripción: Cada plan de servicio (paquete de cremación que el crematorio
--   crea para su catálogo) puede tener una imagen propia, optimizada a WEBP y
--   subida a R2 vía MediaService. Se muestra en el catálogo interno y en el
--   selector de plan del formulario público. Columna nullable: los planes
--   existentes simplemente no tienen imagen hasta que se les asigne una.
-- =====================================================

ALTER TABLE srv_plans ADD COLUMN IF NOT EXISTS image_url VARCHAR;

-- =====================================================
-- Migración 019: Tabla de categorías de la biblioteca de medios
-- Fecha: 2026-07-03
-- Descripción: Hasta ahora las categorías del selector de "Subir Archivo" en la
--   biblioteca global del SuperAdmin estaban HARDCODEADAS en el frontend
--   (gallery, altars, logos, ...). Esta tabla las vuelve gestionables: el
--   SuperAdmin puede crear/editar/desactivar categorías y el selector se llena
--   desde aquí.
--   Es configuración GLOBAL (igual que web_media_library, gestionada solo por
--   el creator): sin RLS ni tenant_id.
--   `key` es el slug técnico que se guarda en web_media_library.category;
--   `label` es el nombre visible.
-- =====================================================

CREATE TABLE IF NOT EXISTS web_media_categories (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(50) UNIQUE NOT NULL,   -- slug técnico, ej: 'gallery'
    label       VARCHAR(120) NOT NULL,         -- nombre visible, ej: 'Galería General'
    sort_order  INTEGER NOT NULL DEFAULT 0,    -- orden en el selector
    is_active   BOOLEAN NOT NULL DEFAULT TRUE, -- desactivar la oculta del selector sin borrarla
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_web_media_categories_active ON web_media_categories (is_active, sort_order);

-- Semilla: las mismas categorías que ya ofrecía el selector hardcodeado, para
-- que las subidas existentes conserven su categoría y el selector no cambie.
INSERT INTO web_media_categories (key, label, sort_order) VALUES
    ('gallery',     'Galería General', 10),
    ('altars',      'Fondos de Altar', 20),
    ('logos',       'Logos/Marcas',    30),
    ('objects',     'Objetos (3D/2D)', 40),
    ('memories',    'Recuerdos/Fotos', 50),
    ('music',       'Música/Audio',    60),
    ('videos',      'Videos',          70),
    ('ui',          'Interfaz (UI)',   80),
    ('backgrounds', 'Fondos Web',      90)
ON CONFLICT (key) DO NOTHING;

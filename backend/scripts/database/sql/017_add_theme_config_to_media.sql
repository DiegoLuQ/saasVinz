-- Migration 017: Add theme_config column to web_media_library
-- This stores per-background theme override rules (JSON) so the admin can
-- define text colors / accents for each wallpaper.
-- Example JSON:
-- {
--   "mode": "dark",
--   "title_color": "#ffffff",
--   "text_color": "#e2e8f0",
--   "accent_color": "#c3b091"
-- }
ALTER TABLE web_media_library
    ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT NULL;

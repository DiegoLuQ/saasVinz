-- Create Media Library Table
CREATE TABLE IF NOT EXISTS web_media_library (
    id SERIAL PRIMARY KEY,
    url VARCHAR(512) NOT NULL,
    media_type VARCHAR(20) NOT NULL, -- 'image', 'video'
    category VARCHAR(50),            -- 'altars', 'backgrounds', 'ui', 'gallery'
    ratio VARCHAR(10),               -- '1:1', '16:9', '9:16', 'original'
    description TEXT,
    alt_text VARCHAR(255),
    file_size INTEGER,               -- Size in bytes
    width INTEGER,
    height INTEGER,
    duration FLOAT,                  -- For videos, in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_category ON web_media_library(category);
CREATE INDEX idx_media_type ON web_media_library(media_type);

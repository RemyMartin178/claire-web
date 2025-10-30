-- Add provider column if it doesn't exist
ALTER TABLE tools ADD COLUMN IF NOT EXISTS provider VARCHAR(100) DEFAULT 'internal';

-- Insert additional tools (will skip existing ones)
INSERT INTO tools (tool_name, display_name, description, icon, category, is_enabled, provider) VALUES
    ('date_time', 'Date & Time', 'Outil de gestion de dates et horaires', '📅', 'utility', TRUE, 'internal'),
    ('text_processor', 'Text Processor', 'Traitement et analyse de texte', '📝', 'utility', TRUE, 'internal'),
    ('url_summarizer', 'URL Summarizer', 'Résume le contenu d''une URL web', '🔗', 'web_search', TRUE, 'internal'),
    ('weather', 'Weather API', 'Informations météorologiques', '🌤️', 'utility', TRUE, 'internal'),
    ('image_generator', 'Image Generator', 'Génération d''images avec IA', '🎨', 'ai', TRUE, 'internal')
ON CONFLICT (tool_name) DO NOTHING;


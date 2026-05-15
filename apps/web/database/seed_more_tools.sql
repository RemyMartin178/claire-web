-- Insert MCP-style integrations as regular tools
INSERT INTO tools (tool_name, display_name, description, icon, category, is_enabled, provider) VALUES
    ('google_calendar', 'Google Calendar', 'Gerez vos evenements Google Calendar', '📅', 'productivity', TRUE, 'google'),
    ('gmail', 'Gmail', 'Envoyez et recevez des emails avec Gmail', '📧', 'communication', TRUE, 'google'),
    ('google_drive', 'Google Drive', 'Accedez et partagez vos fichiers Google Drive', '📁', 'storage', TRUE, 'google'),
    ('atlassian', 'Atlassian', 'Integration avec Jira, Confluence et Trello', '🎫', 'productivity', TRUE, 'atlassian'),
    ('slack', 'Slack', 'Messagerie et collaboration d''equipe', '💬', 'communication', TRUE, 'slack'),
    ('notion', 'Notion', 'Notes, documents et bases de connaissances', '📝', 'productivity', TRUE, 'notion'),
    ('github', 'GitHub', 'Gestion de code et depots GitHub', '💻', 'development', TRUE, 'github'),
    ('linear', 'Linear', 'Suivi de bugs et taches de developpement', '📋', 'productivity', TRUE, 'linear'),
    ('figma', 'Figma', 'Design collaboratif et prototypes', '🎨', 'design', TRUE, 'figma'),
    ('discord', 'Discord', 'Communication communautaire et gaming', '🎮', 'communication', TRUE, 'discord')
ON CONFLICT (tool_name) DO NOTHING;


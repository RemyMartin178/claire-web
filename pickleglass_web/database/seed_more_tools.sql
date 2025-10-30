-- Insert MCP-style integrations as regular tools
INSERT INTO tools (tool_name, display_name, description, icon, category, is_enabled, provider) VALUES
    ('google_calendar', 'Google Calendar', 'Gérez vos événements Google Calendar', '📅', 'productivity', TRUE, 'google'),
    ('gmail', 'Gmail', 'Envoyez et recevez des emails avec Gmail', '📧', 'communication', TRUE, 'google'),
    ('google_drive', 'Google Drive', 'Accédez et partagez vos fichiers Google Drive', '📁', 'storage', TRUE, 'google'),
    ('atlassian', 'Atlassian', 'Intégration avec Jira, Confluence et Trello', '🎫', 'productivity', TRUE, 'atlassian'),
    ('slack', 'Slack', 'Messagerie et collaboration d\'équipe', '💬', 'communication', TRUE, 'slack'),
    ('notion', 'Notion', 'Notes, documents et bases de connaissances', '📝', 'productivity', TRUE, 'notion'),
    ('github', 'GitHub', 'Gestion de code et dépôts GitHub', '💻', 'development', TRUE, 'github'),
    ('linear', 'Linear', 'Suivi de bugs et tâches de développement', '📋', 'productivity', TRUE, 'linear'),
    ('figma', 'Figma', 'Design collaboratif et prototypes', '🎨', 'design', TRUE, 'figma'),
    ('discord', 'Discord', 'Communication communautaire et gaming', '🎮', 'communication', TRUE, 'discord')
ON CONFLICT (tool_name) DO NOTHING;


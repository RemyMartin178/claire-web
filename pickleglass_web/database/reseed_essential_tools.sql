-- Re-add essential tools with proper structure
INSERT INTO tools (tool_name, display_name, description, icon, category, is_enabled, provider, icon_url) VALUES
    ('calculator', 'Calculator', 'Calculateur avance pour calculs mathematiques', '🔢', 'calculation', TRUE, 'internal', NULL),
    ('code_executor', 'Code Executor', 'Execution de code dans differents langages', '💻', 'utility', TRUE, 'internal', NULL),
    ('google_calendar', 'Google Calendar', 'Gerez vos evenements Google Calendar', '📅', 'productivity', TRUE, 'google', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlecalendar.svg'),
    ('gmail', 'Gmail', 'Envoyez et recevez des emails avec Gmail', '📧', 'communication', TRUE, 'google', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg'),
    ('google_drive', 'Google Drive', 'Accedez et partagez vos fichiers Google Drive', '📁', 'storage', TRUE, 'google', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googledrive.svg'),
    ('atlassian', 'Atlassian', 'Integration avec Jira, Confluence et Trello', '🎫', 'productivity', TRUE, 'atlassian', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/jira.svg'),
    ('slack', 'Slack', 'Messagerie et collaboration d''equipe', '💬', 'communication', TRUE, 'slack', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/slack.svg'),
    ('notion', 'Notion', 'Notes, documents et bases de connaissances', '📝', 'productivity', TRUE, 'notion', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/notion.svg'),
    ('github', 'GitHub', 'Gestion de code et depots GitHub', '💻', 'development', TRUE, 'github', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/github.svg'),
    ('linear', 'Linear', 'Suivi de bugs et taches de developpement', '📋', 'productivity', TRUE, 'linear', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linear.svg'),
    ('figma', 'Figma', 'Design collaboratif et prototypes', '🎨', 'design', TRUE, 'figma', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/figma.svg')
ON CONFLICT (tool_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    provider = EXCLUDED.provider,
    icon_url = EXCLUDED.icon_url,
    updated_at = NOW();


-- Add icon_url column to tools table
ALTER TABLE tools ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Update existing tools with proper icon URLs
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlecalendar.svg' WHERE tool_name = 'google_calendar';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg' WHERE tool_name = 'gmail';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googledrive.svg' WHERE tool_name = 'google_drive';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/jira.svg' WHERE tool_name = 'atlassian';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/slack.svg' WHERE tool_name = 'slack';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/notion.svg' WHERE tool_name = 'notion';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/github.svg' WHERE tool_name = 'github';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linear.svg' WHERE tool_name = 'linear';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/figma.svg' WHERE tool_name = 'figma';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discord.svg' WHERE tool_name = 'discord';
UPDATE tools SET icon_url = 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/google.svg' WHERE tool_name = 'web_search';


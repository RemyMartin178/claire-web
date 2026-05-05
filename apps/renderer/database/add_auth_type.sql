-- Add auth_type column to tools table and set OAuth for integrations
ALTER TABLE tools ADD COLUMN IF NOT EXISTS auth_type VARCHAR(50);

-- Set OAuth auth_type for integrations that require authentication
UPDATE tools 
SET auth_type = 'oauth' 
WHERE tool_name IN (
  'google_calendar',
  'gmail',
  'google_drive',
  'atlassian',
  'slack',
  'notion',
  'github',
  'linear',
  'figma'
);

-- Set internal auth_type for built-in tools
UPDATE tools 
SET auth_type = 'internal' 
WHERE tool_name IN (
  'web_search',
  'calculator',
  'code_executor'
);


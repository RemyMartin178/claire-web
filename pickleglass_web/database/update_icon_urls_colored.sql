-- Update icon URLs to use colored versions from popular CDNs
-- These URLs point to PNG/SVG files that display in color

UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/google/F4285F' WHERE tool_name = 'web_search';
UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/googlecalendar/4285F4' WHERE tool_name = 'google_calendar';
UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/gmail/EA4335' WHERE tool_name = 'gmail';
UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/googledrive/4285F4' WHERE tool_name = 'google_drive';
UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/jira/0052CC' WHERE tool_name = 'atlassian';
UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/slack/4A154B' WHERE tool_name = 'slack';
UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/notion/000000' WHERE tool_name = 'notion';
UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/github/181717' WHERE tool_name = 'github';
UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/linear/5E6AD2' WHERE tool_name = 'linear';
UPDATE tools SET icon_url = 'https://cdn.simpleicons.org/figma/F24E1E' WHERE tool_name = 'figma';


-- Remove unnecessary/incomplete tools
DELETE FROM tools WHERE tool_name IN (
  'discord',
  'weather',
  'image_generator',
  'url_summarizer',
  'text_processor',
  'date_time'
);

-- Keep only the essential, working tools:
-- - web_search
-- - calculator
-- - code_executor
-- - google_calendar
-- - gmail
-- - google_drive
-- - atlassian
-- - slack
-- - notion
-- - github
-- - linear
-- - figma


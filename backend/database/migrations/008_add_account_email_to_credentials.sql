-- Migration 008: Add account_email to user_credentials
ALTER TABLE user_credentials ADD COLUMN IF NOT EXISTS account_email TEXT;

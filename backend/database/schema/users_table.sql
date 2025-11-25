-- Users table for authentication and user management
-- Supports both authenticated users and guest users
-- Includes credit system for usage tracking

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    display_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'guest')),
    user_type VARCHAR(50) DEFAULT 'authenticated' CHECK (user_type IN ('authenticated', 'guest')),
    guest_session_token VARCHAR(255) UNIQUE,
    
    -- Credit system
    credits_available INTEGER DEFAULT 10,
    credits_used INTEGER DEFAULT 0,
    credits_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_type VARCHAR(50) DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    
    -- Session management
    session_expires_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_guest_session ON users(guest_session_token);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type, is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Insert a default admin user (optional, for testing)
INSERT INTO users (id, display_name, email, role, user_type, credits_available, plan_type, is_active)
VALUES 
    ('admin_user', 'Admin User', 'admin@clairia.app', 'admin', 'authenticated', 1000000, 'enterprise', true)
ON CONFLICT (id) DO NOTHING;


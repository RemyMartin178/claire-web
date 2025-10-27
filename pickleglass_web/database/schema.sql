-- ==========================================
-- CLAIRE DATABASE SCHEMA
-- Execute this in Supabase SQL Editor
-- ==========================================

-- Table for knowledge base documents
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    tags TEXT[] DEFAULT '{}',
    is_indexed BOOLEAN DEFAULT FALSE,
    embedding_vector FLOAT[],
    folder_id INTEGER,
    user_id TEXT,
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for knowledge base folders
CREATE TABLE IF NOT EXISTS knowledge_folders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES knowledge_folders(id) ON DELETE CASCADE,
    user_id TEXT,
    document_count INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for tools/integrations
CREATE TABLE IF NOT EXISTS tools (
    id SERIAL PRIMARY KEY,
    tool_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200),
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50),
    is_enabled BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_folder ON knowledge_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_indexed ON knowledge_documents(is_indexed);
CREATE INDEX IF NOT EXISTS idx_folders_user ON knowledge_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON knowledge_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_enabled ON tools(is_enabled);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_knowledge_documents_updated_at'
    ) THEN
        CREATE TRIGGER update_knowledge_documents_updated_at 
            BEFORE UPDATE ON knowledge_documents
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_knowledge_folders_updated_at'
    ) THEN
        CREATE TRIGGER update_knowledge_folders_updated_at 
            BEFORE UPDATE ON knowledge_folders
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_tools_updated_at'
    ) THEN
        CREATE TRIGGER update_tools_updated_at 
            BEFORE UPDATE ON tools
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert default tools
INSERT INTO tools (tool_name, display_name, description, icon, category, is_enabled) VALUES
    ('web_search', 'Web Search', 'Recherche web avec résultats pertinents', '🔍', 'web_search', TRUE),
    ('calculator', 'Calculator', 'Calculateur avancé pour calculs mathématiques', '🔢', 'calculation', TRUE),
    ('code_executor', 'Code Executor', 'Exécution de code dans différents langages', '💻', 'utility', TRUE)
ON CONFLICT (tool_name) DO NOTHING;

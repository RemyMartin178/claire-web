-- =============================================================================
-- AGENTS TABLE SCHEMA
-- Create the agents table for AI agents management
-- =============================================================================

CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    personality_type VARCHAR(50) NOT NULL,
    ai_model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    system_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    agent_type VARCHAR(20) DEFAULT 'system' CHECK (agent_type IN ('system', 'user', 'shared')),
    user_id VARCHAR(255),
    created_by VARCHAR(255),
    tts_enabled BOOLEAN DEFAULT false,
    web_search_enabled BOOLEAN DEFAULT false,
    search_all_knowledge BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    capabilities JSONB DEFAULT '[]'::jsonb,
    knowledge_sources JSONB DEFAULT '[]'::jsonb,
    tool_assignments JSONB DEFAULT '[]'::jsonb,
    tools JSONB DEFAULT '[]'::jsonb,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id, agent_type, is_active);
CREATE INDEX IF NOT EXISTS idx_agents_type_active ON agents(agent_type, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_personality_user ON agents(personality_type, user_id, is_active);

-- Insert default system agents
INSERT INTO agents (name, description, personality_type, ai_model, system_prompt, is_active, agent_type, created_by)
VALUES 
(
    'Claire Assistante',
    'Assistant IA principal pour aider les utilisateurs dans leurs tâches quotidiennes',
    'assistant',
    'gpt-4o',
    'Tu es Claire, un assistant IA bienveillant et compétent. Tu aides les utilisateurs avec leurs questions et tâches quotidiennes de manière claire et concise.',
    true,
    'system',
    'system'
),
(
    'Expert Technique',
    'Spécialiste en développement et architecture logicielle',
    'technical',
    'gpt-4o',
    'Tu es un expert technique spécialisé en développement logiciel, architecture système et debugging. Tu fournis des réponses précises et techniques.',
    true,
    'system',
    'system'
),
(
    'Assistant Créatif',
    'Aide à la création de contenu, brainstorming et idéation',
    'creative',
    'gpt-4o',
    'Tu es un assistant créatif qui aide à générer des idées, créer du contenu et explorer des concepts innovants.',
    true,
    'system',
    'system'
)
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Agents table created successfully with ' || COUNT(*) || ' default agents' as result 
FROM agents 
WHERE agent_type = 'system';


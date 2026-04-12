-- =============================================================================
-- FIX SUPABASE VULNERABILITIES - ROBUST VERSION
-- Enables RLS and adds policies ONLY if the tables exist
-- =============================================================================

DO $$
DECLARE
    t_name TEXT;
    tables_to_fix TEXT[] := ARRAY[
        'knowledge_documents', 'knowledge_folders', 'tools', 'user_credentials', 
        'user_api_keys', 'agents', 'mcp_sessions', 'users',
        'memory_evolution_log', 'memory_sharing_rules', 'context_decisions', 
        'context_patterns', 'context_anchors', 'session_contexts', 'working_memory', 
        'episodic_memory', 'semantic_memory', 'procedural_memory', 
        'discovered_patterns', 'memory_evolution_history', 'conversations', 'messages'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_fix
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t_name AND table_schema = 'public') THEN
            
            -- 1. Enable RLS
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t_name);
            
            -- 2. Drop existing policy if it exists to avoid "policy already exists" errors
            EXECUTE format('DROP POLICY IF EXISTS "Users can only access their own data" ON %I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Anyone can see tools" ON %I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Only admins can modify tools" ON %I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can read context anchors" ON %I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Users can only access their own sharing rules" ON %I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Users can only access their own messages" ON %I', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can access their data" ON %I', t_name);

            -- 3. Create specific policies
            IF t_name = 'tools' THEN
                EXECUTE 'CREATE POLICY "Anyone can see tools" ON tools FOR SELECT USING (true)';
                EXECUTE 'CREATE POLICY "Only admins can modify tools" ON tools FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = ''admin''))';
            
            ELSIF t_name = 'context_anchors' THEN
                EXECUTE 'CREATE POLICY "Authenticated users can read context anchors" ON context_anchors FOR SELECT USING (auth.role() = ''authenticated'')';
            
            ELSIF t_name = 'memory_sharing_rules' THEN
                EXECUTE 'CREATE POLICY "Users can only access their own sharing rules" ON memory_sharing_rules FOR ALL USING (split_part(source_instance_key, '':'', 2) = auth.uid()::text OR split_part(target_instance_key, '':'', 2) = auth.uid()::text)';
            
            ELSIF t_name IN ('memory_evolution_log', 'discovered_patterns', 'memory_evolution_history') THEN
                EXECUTE format('CREATE POLICY "Users can only access their own data" ON %I FOR ALL USING (split_part(instance_key, '':'', 2) = auth.uid()::text)', t_name);
            
            ELSIF t_name = 'users' THEN
                EXECUTE 'CREATE POLICY "Users can only access their own data" ON users FOR ALL USING (auth.uid()::text = id)';
            
            ELSIF t_name = 'agents' THEN
                EXECUTE 'CREATE POLICY "Users can only access their own data" ON agents FOR ALL USING (auth.uid()::text = user_id OR agent_type = ''system'')';
            
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'user_id' AND table_schema = 'public') THEN
                -- Standard user_id ownership policy
                EXECUTE format('CREATE POLICY "Users can only access their own data" ON %I FOR ALL USING (auth.uid()::text = user_id)', t_name);
            
            ELSIF t_name = 'messages' AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id' AND table_schema = 'public') THEN
                -- If messages doesn't have user_id, it might have conversation_id linked to a conversation that has user_id
                EXECUTE 'CREATE POLICY "Users can only access their own messages" ON messages FOR ALL USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()::text))';
            
            ELSE
                RAISE NOTICE 'No user_id column found for table %, created a restricted policy (authenticated only)', t_name;
                EXECUTE format('CREATE POLICY "Authenticated users can access their data" ON %I FOR ALL USING (auth.uid() IS NOT NULL)', t_name);
            END IF;

            RAISE NOTICE 'Successfully secured table: %', t_name;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping...', t_name;
        END IF;
    END LOOP;
END $$;

SELECT 'RLS and policies applied successfully to all existing vulnerable tables' as status;

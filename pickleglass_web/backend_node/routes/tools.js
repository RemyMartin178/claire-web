const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * GET /api/v1/tools
 * List available tools from database
 */
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching tools from database...');
    
    // Query tools from database
    const result = await pool.query(`
      SELECT 
        id,
        COALESCE(display_name, REPLACE(tool_name, '_', ' ')) as name,
        display_name,
        tool_name,
        description,
        icon,
        category,
        provider,
        is_enabled,
        usage_count,
        success_rate,
        CASE 
          WHEN is_enabled THEN 'active'
          ELSE 'inactive'
        END as status
      FROM tools
      WHERE is_enabled = true
      ORDER BY category, tool_name
    `);
    
    console.log(`✅ Found ${result.rows.length} tools`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Failed to fetch tools:', error);
    
    // Fallback to hardcoded tools if database fails
    const fallbackTools = [
      {
        id: 'web_search',
        name: 'Web Search',
        description: 'Recherche web avec résultats pertinents',
        icon: '🔍',
        category: 'web_search',
        status: 'active',
        is_enabled: true,
        usage_count: 0,
        success_rate: 100,
        provider: 'internal'
      }
    ];
    
    console.log('⚠️ Using fallback tools');
    res.json(fallbackTools);
  }
});

/**
 * GET /api/v1/tools/:toolName
 * Get specific tool
 */
router.get('/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    res.json({ message: `Tool ${toolName} details - TODO: implement` });
  } catch (error) {
    console.error('Failed to get tool:', error);
    res.status(500).json({ error: 'Failed to get tool' });
  }
});

/**
 * POST /api/v1/tools/:toolName/execute
 * Execute a tool
 */
router.post('/:toolName/execute', async (req, res) => {
  try {
    const { toolName } = req.params;
    const { parameters } = req.body;
    
    res.json({
      tool_name: toolName,
      parameters,
      result: { message: 'Tool execution - TODO: implement' },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to execute tool:', error);
    res.status(500).json({ error: 'Failed to execute tool' });
  }
});

module.exports = router;

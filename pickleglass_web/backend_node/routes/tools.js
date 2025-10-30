const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const credentialService = require('../services/credentialService');
const oauthService = require('../services/oauthService');

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
        icon_url,
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
 * Get specific tool by name
 */
router.get('/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id,
        tool_name,
        COALESCE(display_name, REPLACE(tool_name, '_', ' ')) as name,
        display_name,
        description,
        icon,
        category,
        provider,
        is_enabled,
        usage_count,
        success_rate,
        last_used_at,
        created_at,
        updated_at
      FROM tools
      WHERE tool_name = $1
    `, [toolName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to get tool:', error);
    res.status(500).json({ error: 'Failed to get tool' });
  }
});

/**
 * PUT /api/v1/tools/:toolName
 * Update tool configuration (enable/disable)
 */
router.put('/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const { is_enabled, description, icon } = req.body;
    
    let updateFields = [];
    let values = [];
    let paramIndex = 1;
    
    if (is_enabled !== undefined) {
      updateFields.push(`is_enabled = $${paramIndex}`);
      values.push(is_enabled);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    if (icon !== undefined) {
      updateFields.push(`icon = $${paramIndex}`);
      values.push(icon);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(toolName);
    
    const query = `
      UPDATE tools
      SET ${updateFields.join(', ')}
      WHERE tool_name = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update tool:', error);
    res.status(500).json({ error: 'Failed to update tool' });
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
    
    // Get tool configuration
    const toolResult = await pool.query(`
      SELECT * FROM tools WHERE tool_name = $1
    `, [toolName]);
    
    if (toolResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tool not found' });
    }
    
    const tool = toolResult.rows[0];
    
    if (!tool.is_enabled) {
      return res.status(400).json({ error: 'Tool is disabled' });
    }
    
    // TODO: Implement actual tool execution logic
    // For now, return a mock result
    const result = {
      message: `Tool ${tool.name || tool.display_name} executed successfully`,
      parameters,
      tool: {
        name: tool.display_name || tool.tool_name,
        category: tool.category
      }
    };
    
    // Update usage count
    await pool.query(`
      UPDATE tools 
      SET usage_count = usage_count + 1,
          last_used_at = NOW(),
          updated_at = NOW()
      WHERE tool_name = $1
    `, [toolName]);
    
    res.json({
      tool_name: toolName,
      parameters,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to execute tool:', error);
    res.status(500).json({ error: 'Failed to execute tool' });
  }
});

/**
 * GET /api/v1/tools/:toolName/auth/authorize
 * Get OAuth authorization URL for a tool
 */
router.get('/:toolName/auth/authorize', async (req, res) => {
  try {
    const { toolName } = req.params;
    const userId = req.headers['x-claire-uid'] || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const providerName = req.query.provider || null;
    const redirectUri = req.query.redirect_uri || null;
    
    const authUrl = oauthService.generateAuthUrl(toolName, providerName, redirectUri, userId);
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Failed to generate auth URL:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/tools/:toolName/auth/callback
 * Handle OAuth callback and store tokens
 */
router.get('/:toolName/auth/callback', async (req, res) => {
  try {
    const { toolName } = req.params;
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Extract user ID from state
    const stateParts = state.split(':');
    const userId = stateParts.length >= 2 ? stateParts[1] : null;
    
    if (!userId) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    const providerName = req.query.provider || null;
    const redirectUri = req.query.redirect_uri || null;
    
    // Exchange code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(toolName, code, redirectUri, providerName);
    
    // Store tokens
    await credentialService.storeOAuthTokens(userId, toolName, tokens);
    
    // Redirect to success page
    res.redirect(`${req.headers.origin || 'http://localhost:3000'}/tools?auth=success&tool=${toolName}`);
  } catch (error) {
    console.error('Failed to handle OAuth callback:', error);
    res.redirect(`${req.headers.origin || 'http://localhost:3000'}/tools?auth=error&error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/v1/tools/:toolName/auth/status
 * Check authentication status for a tool
 */
router.get('/:toolName/auth/status', async (req, res) => {
  try {
    const { toolName } = req.params;
    const userId = req.headers['x-claire-uid'] || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const hasValidCredentials = await credentialService.hasValidCredentials(userId, toolName);
    
    res.json({ 
      authenticated: hasValidCredentials,
      toolName,
      userId
    });
  } catch (error) {
    console.error('Failed to check auth status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/tools/:toolName/auth
 * Revoke authentication for a tool
 */
router.delete('/:toolName/auth', async (req, res) => {
  try {
    const { toolName } = req.params;
    const userId = req.headers['x-claire-uid'] || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    await credentialService.deleteCredentials(userId, toolName);
    
    res.json({ 
      success: true,
      message: 'Authentication revoked successfully',
      toolName,
      userId
    });
  } catch (error) {
    console.error('Failed to revoke auth:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

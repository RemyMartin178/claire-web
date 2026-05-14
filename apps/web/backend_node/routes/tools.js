const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const credentialService = require('../services/credentialService');
const oauthService = require('../services/oauthService');
const GoogleCalendarTool = require('../services/tools/googleCalendarTool');

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

    // Get user ID from request
    const userId = req.headers['x-claire-uid'] || req.body.userId;

    // Execute tool based on type
    let result;
    try {
      if (tool.provider === 'internal') {
        // Internal tools (calculator, etc.) - simple mock for now
        result = {
          message: `Tool ${tool.display_name || tool.tool_name} executed successfully`,
          parameters,
          tool: {
            name: tool.display_name || tool.tool_name,
            category: tool.category
          }
        };
      } else if (tool.tool_name === 'google_calendar') {
        // Google Calendar integration
        if (!userId) {
          return res.status(401).json({ error: 'User authentication required' });
        }

        // Check if user has valid credentials
        const hasCredentials = await credentialService.hasValidCredentials(userId, toolName);
        if (!hasCredentials) {
          return res.status(401).json({
            error: `Authentication required. Please configure ${tool.display_name} in the tools page.`
          });
        }

        // Get credentials
        const credentials = await credentialService.getOAuthTokens(userId, toolName);
        if (!credentials) {
          return res.status(401).json({ error: 'Failed to retrieve authentication credentials' });
        }

        // Execute Google Calendar operation
        const googleTool = new GoogleCalendarTool();
        await googleTool.initializeAuth(credentials.access_token);

        const operation = parameters.operation || 'testConnection';

        switch (operation) {
          case 'listEvents':
            result = await googleTool.listEvents(parameters);
            break;
          case 'getUserProfile':
            result = await googleTool.getUserProfile();
            break;
          case 'createEvent':
            result = await googleTool.createEvent(parameters);
            break;
          case 'getEvent':
            result = await googleTool.getEvent(parameters);
            break;
          case 'testConnection':
            result = await googleTool.testConnection();
            break;
          default:
            result = {
              success: false,
              error: `Unknown operation: ${operation}`,
              availableOperations: googleTool.getAvailableOperations()
            };
        }
      } else {
        // Other external tools - not implemented yet
        result = {
          success: false,
          error: `Tool ${tool.display_name || tool.tool_name} is not yet implemented`,
          parameters
        };
      }
    } catch (error) {
      result = {
        success: false,
        error: error.message
      };
    }

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
    const platform = req.query.platform || null;

    const authUrl = oauthService.generateAuthUrl(toolName, providerName, redirectUri, userId, platform);

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

    // Fetch and store the connected Google account email (fire-and-forget)
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` }
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        if (userInfo.email) {
          const { Pool } = require('pg');
          const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
          await p.query(
            `UPDATE user_credentials SET account_email = $1 WHERE user_id = $2 AND tool_name = $3`,
            [userInfo.email, userId, toolName]
          );
          await p.end();
        }
      }
    } catch (e) {
      console.warn('[OAuth] Could not store Google account email:', e.message);
    }

    // Deep Link Handling for Desktop/Electron
    const platform = stateParts.length >= 4 ? stateParts[3] : null;

    if (platform === 'desktop') {
      return res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>Connexion réussie !</h2>
            <p>Le compte Google est maintenant connecté.</p>
            <p>Vous pouvez fermer cette fenêtre, l'application Claire va se mettre à jour.</p>
            <script>
              window.location.href = 'claire://auth-success?tool=${toolName}';
              setTimeout(() => { window.close(); }, 3000);
            </script>
            <button onclick="window.close()" style="padding: 10px 20px; cursor: pointer; border-radius: 8px; border: 1px solid #ccc; background: #eee;">Fermer la fenêtre</button>
          </body>
        </html>
      `);
    }

    // Redirect to success page
    // Detect frontend URL with production safety
    let frontendUrl = req.get('origin') || process.env.FRONTEND_URL;

    // Safety check: Never fallback to localhost in production
    if (!frontendUrl || (process.env.NODE_ENV === 'production' && frontendUrl.includes('localhost'))) {
      frontendUrl = process.env.FRONTEND_URL || 'https://app.clairia.app';
    }

    // Redirect to dedicated auth-success page (closes the popup cleanly)
    res.redirect(`${frontendUrl}/api/auth/popup-close?tool=${toolName}&status=success`);
  } catch (error) {
    const { toolName } = req.params;
    console.error('Failed to handle OAuth callback:', error);

    // Attempt to detect platform from state even on error
    const stateParts = (req.query.state || '').split(':');
    const platform = stateParts.length >= 4 ? stateParts[3] : null;

    if (platform === 'desktop') {
      return res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #dc2626;">Erreur de connexion</h2>
            <p>${error.message}</p>
            <script>
              window.location.href = 'claire://auth-error?error=${encodeURIComponent(error.message)}';
            </script>
            <button onclick="window.close()" style="padding: 10px 20px; cursor: pointer; border-radius: 8px; border: 1px solid #ccc; background: #eee;">Fermer la fenêtre</button>
          </body>
        </html>
      `);
    }

    // Detect frontend URL with production safety
    let frontendUrl = req.get('origin') || process.env.FRONTEND_URL;

    // Safety check: Never fallback to localhost in production
    if (!frontendUrl || (process.env.NODE_ENV === 'production' && frontendUrl.includes('localhost'))) {
      frontendUrl = process.env.FRONTEND_URL || 'https://app.clairia.app';
    }

    res.redirect(`${frontendUrl}/api/auth/popup-close?tool=${toolName}&status=error&error=${encodeURIComponent(error.message)}`);
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

    const authResult = await credentialService.hasValidCredentials(userId, toolName);

    // Fetch connected account email if authenticated
    let accountEmail = null;
    if (authResult.valid) {
      try {
        const emailResult = await pool.query(
          `SELECT account_email FROM user_credentials WHERE user_id = $1 AND tool_name = $2 LIMIT 1`,
          [userId, toolName]
        );
        if (emailResult.rows.length > 0) {
          accountEmail = emailResult.rows[0].account_email;
        }
      } catch (e) {
        console.warn('[auth/status] Could not fetch account email:', e.message);
      }
    }

    res.json({
      authenticated: authResult.valid,
      reason: authResult.reason,
      message: authResult.message,
      accountEmail,
      toolName,
      userId
    });
  } catch (error) {
    console.error('Failed to check auth status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/tools/:toolName/debug
 * Debug endpoint to inspect stored credentials (sensitive data masked)
 */
router.get('/:toolName/debug', async (req, res) => {
  try {
    const { toolName } = req.params;
    const userId = req.headers['x-claire-uid'] || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(`
      SELECT id, user_id, tool_name, token_expires_at, created_at, updated_at,
             (encrypted_access_token IS NOT NULL) as has_access_token,
             (encrypted_refresh_token IS NOT NULL) as has_refresh_token
      FROM user_credentials 
      WHERE user_id = $1 AND tool_name = $2
      ORDER BY updated_at DESC
    `, [userId, toolName]);

    res.json({
      count: result.rows.length,
      rows: result.rows,
      query: { userId, toolName }
    });
  } catch (error) {
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

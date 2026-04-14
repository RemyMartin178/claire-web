/**
 * Tools API Routes - RESTful Endpoints
 * Backend Dev Agent 💻 - Extracted and cleaned up
 * Standalone Backend Service
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();

// Import services and middleware
const ToolService = require('../../services/toolService');
const ToolConfigurationService = require('../../services/toolConfigurationService');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { requirePermission, requireGuestPermission, DEFAULT_USER_PERMISSIONS } = require('../middleware/auth');
const CredentialService = require('../../services/credentialService');
const GenericOAuthService = require('../../services/oauth/genericOAuthService');
const sharedMCPManager = require('../../services/sharedMCPManager');

// Initialize services
const toolService = new ToolService();
const toolConfigService = new ToolConfigurationService();
const credentialService = new CredentialService();
const oauthService = new GenericOAuthService();
const mcpManager = sharedMCPManager;

// Helper function to get appropriate icons for MCP servers
function getMCPServerIcon(serverCategory, serverName) {
  const lowerName = serverName.toLowerCase();
  
  // Specific server icon URLs (relative paths for frontend proxy)
  if (lowerName.includes('gmail')) return '/api/tools/icons/gmail_new_logo_icon.png';
  if (lowerName.includes('github')) return '/api/tools/icons/GitHub-logo-768x432.png';
  if (lowerName.includes('weather')) return '/api/tools/icons/weather_logo.png';
  if (lowerName.includes('calendar') || lowerName.includes('google calendar')) return '/api/tools/icons/Google-Calendar-Logo.png';
  if (lowerName.includes('atlassian')) return '/api/tools/icons/atlassian-logo.png';
  
  // Legacy emoji fallbacks for other servers
  if (lowerName.includes('slack')) return '💬';
  if (lowerName.includes('notion')) return '📝';
  if (lowerName.includes('drive') || lowerName.includes('google drive')) return '☁️';
  if (lowerName.includes('discord')) return '🎮';
  if (lowerName.includes('linear')) return '📋';
  if (lowerName.includes('figma')) return '🎨';
  
  // Category fallbacks
  const categoryIcons = {
    'productivity': '[FAST]',
    'development': '💻', 
    'communication': '💬',
    'document': '📄',
    'design': '🎨',
    'storage': '☁️'
  };
  
  return categoryIcons[serverCategory] || '🔧';
}

/**
 * GET /api/v1/tools
 * List tools with filtering and pagination
 * Guest users only see allowed tools (perplexity, firecrawl, tavily)
 */
router.get('/', requireGuestPermission('tools:read'), asyncHandler(async (req, res) => {
  const {
    category,
    tool_type,
    is_enabled,
    provider,
    limit = 50,
    offset = 0,
    page,
    per_page
  } = req.query;

  // Handle pagination parameters
  const actualLimit = per_page ? parseInt(per_page) : parseInt(limit);
  const actualOffset = page ? (parseInt(page) - 1) * actualLimit : parseInt(offset);

  // Validate limits
  if (actualLimit > 100) {
    throw new ValidationError('Limit cannot exceed 100 items');
  }

  const filters = {
    category,
    tool_type,
    is_enabled: is_enabled !== undefined ? is_enabled === 'true' : undefined,
    provider,
    limit: actualLimit,
    offset: actualOffset
  };

  let tools = await toolService.getTools(filters);

  // Add MCP servers as single tools (better UX - show server, not individual functions)
  try {
    console.log('[SEARCH] DEBUG: Starting MCP server processing...');
    const availableServers = mcpManager.getAvailableServers();
    const runningServers = mcpManager.getRunningServers();
    const runningServerIds = new Set(runningServers.map(s => s.id));
    
    console.log(`[SEARCH] DEBUG: Found ${availableServers.length} available servers, ${runningServers.length} running`);
    console.log(`[SEARCH] DEBUG: Available server IDs:`, availableServers.map(s => s.id));
    
    for (const server of availableServers) {
      console.log(`[SEARCH] DEBUG: Processing server ${server.id} (${server.name})`);
      const isRunning = runningServerIds.has(server.id);
      const requiresAuth = server.authType && server.authType !== 'none';
      
      console.log(`[SEARCH] DEBUG: ${server.id} - isRunning: ${isRunning}, requiresAuth: ${requiresAuth}`);
      
      // For OAuth-based MCP servers, check if they have valid credentials
      let hasCredentials = false;
      if (requiresAuth && (req.user?.uid || req.user?.id)) {
        const userId = req.user.uid || req.user.id;
        try {
          hasCredentials = await credentialService.hasValidCredentials(userId, server.id);
          
          // Only check credentials for the current authenticated user - no cross-user sharing
          // Each user (including guests) has isolated credentials
        } catch (error) {
          console.error(`Failed to check credentials for ${server.id}:`, error.message);
          hasCredentials = false; // Ensure it defaults to false on error
        }
      }
      
      // For OAuth servers, configured means having credentials OR being running
      // For non-auth servers, configured means being running
      const isConfigured = requiresAuth ? (hasCredentials || isRunning) : isRunning;
      
      // Create ONE tool entry per MCP server (not per individual function)
      const mcpServerTool = {
        id: `mcp:${server.id}`,
        name: server.name, // e.g., "Google Calendar" 
        tool_name: server.name,
        description: server.description,
        icon: getMCPServerIcon(server.category, server.name),
        category: 'mcp_tools',
        status: isRunning ? 'active' : (isConfigured ? 'configured' : 'inactive'),
        is_enabled: isRunning, // [OK] FIX: Only enabled when server is actually running
        usage_count: 0,
        last_used: null,
        execution_time_avg: 0,
        success_rate: 100,
        parameters: {}, // Will be populated when server is running
        provider: server.name,
        version: '1.0.0',
        mcp_server_id: server.id,
        mcp_tool: true,
        mcp_server: true, // Flag to identify this as an MCP server
        // MCP-specific fields
        capabilities: server.tools || [],
        tool_count: server.tools ? server.tools.length : 0,
        docker_image: server.dockerImage,
        // Authentication fields
        requires_auth: requiresAuth,
        auth_type: server.authType || 'none',
        is_configured: isConfigured, // Configured if has credentials (OAuth) OR is running
        is_authenticated: hasCredentials, // New field to show auth status
        server_status: isRunning ? 'running' : 'stopped'
      };
      
      tools.push(mcpServerTool);
    }
  } catch (error) {
    console.error('Failed to fetch MCP servers:', error.message);
  }

  // All users (guest and authenticated) now have unified permissions - no filtering needed

  // Set pagination headers
  res.set({
    'X-Total-Count': tools.length.toString(),
    'X-Page': page || Math.floor(actualOffset / actualLimit) + 1,
    'X-Per-Page': actualLimit.toString()
  });

  res.json(tools);
}));

/**
 * GET /api/v1/tools/:toolName
 * Get specific tool configuration by name
 * Guest users can only access allowed tools
 */
router.get('/:toolName', requireGuestPermission('tools:read'), asyncHandler(async (req, res) => {
  const { toolName } = req.params;
  
  const tool = await toolService.getToolByName(toolName);
  if (!tool) {
    throw new NotFoundError('Tool not found');
  }
  
  // All users (guest and authenticated) now have unified permissions - no filtering needed

  res.json(tool);
}));

/**
 * POST /api/v1/tools/:toolName/execute
 * Execute specific tool with parameters
 * Guest users can only execute allowed tools (perplexity, firecrawl, tavily)
 */
router.post('/:toolName/execute', asyncHandler(async (req, res) => {
  const { toolName } = req.params;
  const { parameters } = req.body;

  // All users (guest and authenticated) have unified permissions - credit system controls usage limits

  if (!parameters || Object.keys(parameters).length === 0) {
    throw new ValidationError('Tool parameters are required', { field: 'parameters' });
  }

  let result;
  
  // Check if this is an MCP server tool (format: mcp:serverId)
  if (toolName.startsWith('mcp:')) {
    const parts = toolName.split(':');
    const serverId = parts[1];
    
    if (!serverId) {
      throw new ValidationError('Invalid MCP server tool format');
    }
    
    // For MCP server tools, we need a specific function to execute
    const { functionName, ...toolParams } = parameters;
    if (!functionName) {
      throw new ValidationError('MCP server execution requires "functionName" parameter');
    }
    
    try {
      // Ensure server is running before execution
      const runningServers = mcpManager.getRunningServers();
      const isRunning = runningServers.some(s => s.id === serverId);
      
      if (!isRunning) {
        return res.status(400).json({
          success: false,
          error: 'MCP server is not running. Please start the server first.',
          tool_name: toolName,
          mcp_tool: true,
          server_id: serverId,
          server_status: 'stopped',
          timestamp: new Date().toISOString()
        });
      }
      
      result = await mcpManager.executeTool(serverId, functionName, toolParams);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        tool_name: toolName,
        mcp_tool: true,
        server_id: serverId,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    // Regular tool execution
    const userId = req.user?.uid || req.user?.id || null;
    result = await toolService.executeTool(toolName, parameters, { userId });
  }
  
  res.json({
    tool_name: toolName,
    parameters,
    result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * PUT /api/v1/tools/:toolName/config
 * Update tool configuration
 */
router.put('/:toolName/config', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { toolName } = req.params;
  const configData = req.body;

  // Validate that we're not updating read-only fields
  const readOnlyFields = ['tool_name', 'created_at', 'execution_count', 'last_executed_at'];
  const hasReadOnlyFields = readOnlyFields.some(field => field in configData);
  
  if (hasReadOnlyFields) {
    throw new ValidationError('Cannot update read-only fields', { 
      readOnlyFields,
      providedFields: Object.keys(configData)
    });
  }

  const tool = await toolService.updateToolConfiguration(toolName, configData);
  if (!tool) {
    throw new NotFoundError('Tool not found');
  }

  res.json(tool);
}));

/**
 * POST /api/v1/tools/:toolName/toggle
 * Toggle tool enabled/disabled state
 */
router.post('/:toolName/toggle', requirePermission('tools:manage'), asyncHandler(async (req, res) => {
  const { toolName } = req.params;

  // Check if this is an MCP server
  if (toolName.startsWith('mcp:')) {
    const serverId = toolName.replace('mcp:', '');
    const serverStatus = await mcpManager.getServerStatus(serverId);
    
    if (!serverStatus) {
      throw new NotFoundError('MCP server not found');
    }

    try {
      let result;
      if (serverStatus.is_running) {
        // Stop the server
        result = await mcpManager.stopServer(serverId);
        res.json({
          message: `MCP server ${serverId} stopped successfully`,
          tool_name: toolName,
          is_enabled: false,
          server_status: 'stopped',
          timestamp: new Date().toISOString()
        });
      } else {
        // Start the server with user credentials for OAuth-enabled servers
        const userId = req.user?.uid || req.user?.id;
        result = await mcpManager.startServer(serverId, {}, userId);
        res.json({
          message: `MCP server ${serverId} started successfully`,
          tool_name: toolName,
          is_enabled: true,
          server_status: 'running',
          capabilities: result.capabilities,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Failed to toggle MCP server ${serverId}:`, error);
      res.status(500).json({
        error: 'Failed to toggle MCP server',
        message: error.message,
        tool_name: toolName,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    // Handle regular database tools
    const tool = await toolService.toggleTool(toolName);
    if (!tool) {
      throw new NotFoundError('Tool not found');
    }

    res.json({
      message: `Tool ${tool.is_enabled ? 'enabled' : 'disabled'} successfully`,
      tool_name: toolName,
      is_enabled: tool.is_enabled,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /api/v1/tools/:toolName/analytics
 * Get tool execution analytics
 */
router.get('/:toolName/analytics', requirePermission('tools:analytics'), asyncHandler(async (req, res) => {
  const { toolName } = req.params;

  // Verify tool exists
  const tool = await toolService.getToolByName(toolName);
  if (!tool) {
    throw new NotFoundError('Tool not found');
  }

  const analytics = await toolService.getToolAnalytics(toolName);
  
  res.json(analytics);
}));

/**
 * GET /api/v1/tools/categories
 * Get list of tool categories with counts
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await toolService.getToolCategories();
  
  res.json({
    categories,
    total_categories: categories.length,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/tools/analytics/global
 * Get global tools analytics
 */
router.get('/analytics/global', requirePermission('tools:analytics'), asyncHandler(async (req, res) => {
  const analytics = await toolService.getAllToolsAnalytics();
  
  res.json(analytics);
}));

// ===== ENHANCED TOOL CONFIGURATION MANAGEMENT =====

/**
 * GET /api/v1/tools/:toolName/configuration
 * Get tool configuration with schema validation
 */
router.get('/:toolName/configuration', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { toolName } = req.params;
  const { include_secrets = false } = req.query;

  const config = await toolConfigService.getToolConfiguration(
    toolName, 
    include_secrets === 'true'
  );
  
  res.json(config);
}));

/**
 * PUT /api/v1/tools/:toolName/configuration
 * Update tool configuration with validation
 */
router.put('/:toolName/configuration', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { toolName } = req.params;
  const { validate_only = false, merge_existing = true } = req.query;
  const configData = req.body;

  const result = await toolConfigService.updateToolConfiguration(toolName, configData, {
    validateOnly: validate_only === 'true',
    mergeWithExisting: merge_existing !== 'false'
  });

  if (validate_only === 'true') {
    res.json({
      message: 'Configuration validation completed',
      validation_result: result
    });
  } else {
    res.json({
      message: 'Tool configuration updated successfully',
      tool: result
    });
  }
}));

/**
 * POST /api/v1/tools/:toolName/configuration/validate
 * Validate tool configuration without saving
 */
router.post('/:toolName/configuration/validate', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { toolName } = req.params;
  const { configuration } = req.body;

  const validation = toolConfigService.validateConfiguration(toolName, configuration);
  
  res.json({
    tool_name: toolName,
    validation,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/tools/:toolName/schema
 * Get configuration schema for a tool
 */
router.get('/:toolName/schema', requirePermission('tools:read'), asyncHandler(async (req, res) => {
  const { toolName } = req.params;

  const schema = toolConfigService.getConfigurationSchema(toolName);
  
  res.json({
    tool_name: toolName,
    schema,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/tools/templates
 * Get available configuration templates
 */
router.get('/templates', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const templates = toolConfigService.getConfigurationTemplates();
  
  res.json({
    templates,
    total_templates: templates.length,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/tools/create-from-template
 * Create new tool configuration from template
 */
router.post('/create-from-template', requirePermission('tools:manage'), asyncHandler(async (req, res) => {
  const { tool_name, template_type, custom_config } = req.body;

  if (!tool_name || !template_type) {
    throw new ValidationError('tool_name and template_type are required');
  }

  const tool = await toolConfigService.createToolConfiguration(
    tool_name, 
    template_type, 
    custom_config || {}
  );

  res.status(201).json({
    message: 'Tool configuration created successfully',
    tool,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/tools/bulk-update
 * Bulk update tool configurations
 */
router.post('/bulk-update', requirePermission('tools:manage'), asyncHandler(async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new ValidationError('updates must be a non-empty array');
  }

  const result = await toolConfigService.bulkUpdateConfigurations(updates);
  
  res.json({
    message: 'Bulk update completed',
    ...result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/tools/export
 * Export tool configurations
 */
router.post('/export', requirePermission('tools:admin'), asyncHandler(async (req, res) => {
  const { tool_names, include_secrets = false, format = 'json' } = req.body;

  const configurations = await toolConfigService.exportConfigurations(tool_names, {
    includeSecrets: include_secrets,
    format
  });

  const filename = `tool-configurations-${new Date().toISOString().split('T')[0]}.${format}`;
  
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', format === 'yaml' ? 'text/yaml' : 'application/json');
  
  if (format === 'yaml') {
    res.send(configurations);
  } else {
    res.json({
      export_date: new Date().toISOString(),
      total_tools: configurations.length,
      configurations
    });
  }
}));

/**
 * POST /api/v1/tools/import
 * Import tool configurations
 */
router.post('/import', requirePermission('tools:admin'), asyncHandler(async (req, res) => {
  const { configurations, validate_only = false, overwrite_existing = false } = req.body;

  if (!Array.isArray(configurations) || configurations.length === 0) {
    throw new ValidationError('configurations must be a non-empty array');
  }

  const result = await toolConfigService.importConfigurations(configurations, {
    validateOnly: validate_only,
    overwriteExisting: overwrite_existing
  });

  res.json({
    message: validate_only ? 'Configuration validation completed' : 'Import completed',
    ...result,
    timestamp: new Date().toISOString()
  });
}));

// =====================================
// MCP Server Management Endpoints (Inline with Tools)
// =====================================

/**
 * POST /api/v1/tools/mcp/:serverId/start
 * Start MCP server for a tool
 */
router.post('/mcp/:serverId/start', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { serverId } = req.params;
  const userConfig = req.body || {};

  try {
    const userId = req.user?.uid || req.user?.id;
    const result = await mcpManager.startServer(serverId, userConfig, userId);
    
    res.json({
      success: true,
      message: `${serverId} server started successfully`,
      server_id: serverId,
      tool_id: `mcp:${serverId}`,
      capabilities: result.capabilities,
      started_at: new Date().toISOString()
    });
  } catch (error) {
    if (error.message.includes('already running')) {
      res.status(409).json({
        error: 'Server already running',
        server_id: serverId,
        tool_id: `mcp:${serverId}`,
        message: error.message
      });
    } else {
      throw new ValidationError(`Failed to start MCP server: ${error.message}`);
    }
  }
}));

/**
 * POST /api/v1/tools/mcp/:serverId/stop
 * Stop MCP server for a tool
 */
router.post('/mcp/:serverId/stop', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { serverId } = req.params;

  const result = await mcpManager.stopServer(serverId);
  
  res.json({
    success: true,
    message: `${serverId} server stopped successfully`,
    server_id: serverId,
    tool_id: `mcp:${serverId}`,
    stopped_at: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/tools/mcp/:serverId/status
 * Get MCP server status and capabilities
 */
router.get('/mcp/:serverId/status', requireGuestPermission('tools:read'), asyncHandler(async (req, res) => {
  const { serverId } = req.params;

  try {
    const availableServers = mcpManager.getAvailableServers();
    const server = availableServers.find(s => s.id === serverId);
    
    if (!server) {
      throw new NotFoundError(`MCP server ${serverId} not found`);
    }

    const runningServers = mcpManager.getRunningServers();
    const isRunning = runningServers.some(s => s.id === serverId);
    
    let capabilities = null;
    let toolNames = [];
    if (isRunning) {
      try {
        capabilities = await mcpManager.getServerCapabilities(serverId);
        // Extract tool names for frontend display
        if (capabilities && capabilities.tools) {
          toolNames = capabilities.tools.map(tool => tool.name || 'unnamed_tool');
        }
      } catch (error) {
        console.error(`Failed to get capabilities for ${serverId}:`, error.message);
      }
    }
    
    // Check authentication status for authenticated users
    let authStatus = { is_configured: false, oauth_configured: false };
    if (req.user && !req.user.isGuest && server.authType && server.authType !== 'none') {
      const userId = req.user?.uid || req.user?.id;
      try {
        const hasCredentials = await mcpManager.hasValidCredentials(userId, serverId);
        authStatus.is_configured = hasCredentials;
        
        // For OAuth servers, check OAuth-specific status
        if (server.authType === 'oauth' && hasCredentials) {
          const credentials = await credentialService.getOAuthTokens(userId, serverId);
          if (credentials && credentials.type === 'oauth' && credentials.access_token) {
            authStatus.oauth_configured = true;
            authStatus.oauth_token_expires = credentials.expires_at;
            authStatus.oauth_token_valid = true; // Could add token validation here
          }
        }
      } catch (error) {
        console.error(`Failed to check auth status for ${serverId}:`, error.message);
      }
    }

    res.json({
      server_id: serverId,
      tool_id: `mcp:${serverId}`,
      name: server.name,
      description: server.description,
      status: isRunning ? 'running' : 'stopped',
      is_running: isRunning,
      available_functions: server.tools || [],
      capabilities: toolNames, // Send tool names array for frontend display
      tool_count: toolNames.length,
      raw_capabilities: capabilities, // Keep full capabilities for debugging
      auth_type: server.authType,
      requires_auth: server.authType && server.authType !== 'none',
      is_configured: authStatus.is_configured,
      oauth_configured: authStatus.oauth_configured,
      oauth_token_expires: authStatus.oauth_token_expires,
      oauth_token_valid: authStatus.oauth_token_valid,
      authentication_status: authStatus.is_configured ? 'authenticated' : 'not_configured',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    throw new NotFoundError(`MCP server ${serverId} status check failed: ${error.message}`);
  }
}));

// =====================================
// MCP Server Credential Management Endpoints
// =====================================

/**
 * GET /api/v1/tools/mcp/:serverId/credentials/requirements
 * Get credential requirements for an MCP server
 */
router.get('/mcp/:serverId/credentials/requirements', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { serverId } = req.params;

  try {
    const requirements = mcpManager.getCredentialRequirements(serverId);
    
    res.json({
      server_id: serverId,
      credentials: requirements,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    throw new NotFoundError(`MCP server ${serverId} not found: ${error.message}`);
  }
}));

/**
 * POST /api/v1/tools/mcp/:serverId/credentials
 * Store credentials for an MCP server
 */
router.post('/mcp/:serverId/credentials', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { serverId } = req.params;
  const credentials = req.body;
  const userId = req.user?.uid || req.user?.id;

  if (!userId) {
    throw new ValidationError('User authentication required');
  }

  if (!credentials || Object.keys(credentials).length === 0) {
    throw new ValidationError('Credentials are required');
  }

  try {
    const result = await mcpManager.storeCredentials(userId, serverId, credentials);
    
    res.json({
      success: true,
      message: `Credentials stored securely for ${serverId}`,
      server_id: serverId,
      stored_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      server_id: serverId,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /api/v1/tools/mcp/:serverId/credentials/status
 * Check if user has valid credentials for an MCP server
 */
router.get('/mcp/:serverId/credentials/status', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { serverId } = req.params;
  const userId = req.user?.uid || req.user?.id;

  if (!userId) {
    throw new ValidationError('User authentication required');
  }

  try {
    const hasCredentials = await mcpManager.hasValidCredentials(userId, serverId);
    const requirements = mcpManager.getCredentialRequirements(serverId);
    
    res.json({
      server_id: serverId,
      has_valid_credentials: hasCredentials,
      is_configured: hasCredentials,
      requirements: requirements,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      server_id: serverId,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * DELETE /api/v1/tools/mcp/:serverId/credentials
 * Remove stored credentials for an MCP server
 */
router.delete('/mcp/:serverId/credentials', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { serverId } = req.params;
  const userId = req.user?.uid || req.user?.id;

  if (!userId) {
    throw new ValidationError('User authentication required');
  }

  try {
    await mcpManager.credentialStore.deleteCredentials(userId, serverId);
    
    res.json({
      success: true,
      message: `Credentials removed for ${serverId}`,
      server_id: serverId,
      removed_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      server_id: serverId,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /api/v1/tools/mcp/servers/requiring-configuration
 * Get list of MCP servers that require user configuration
 */
router.get('/mcp/servers/requiring-configuration', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const userId = req.user?.uid || req.user?.id;

  try {
    const servers = mcpManager.getServersRequiringConfiguration(userId);
    
    res.json({
      servers,
      total: servers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * POST /api/v1/tools/mcp/:serverId/start-with-user
 * Start MCP server with user credentials (enhanced version)
 */
router.post('/mcp/:serverId/start-with-user', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { serverId } = req.params;
  const userConfig = req.body || {};
  const userId = req.user?.uid || req.user?.id;

  if (!userId) {
    throw new ValidationError('User authentication required');
  }

  try {
    const result = await mcpManager.startServer(serverId, userConfig, userId);
    
    res.json({
      success: true,
      message: `${serverId} server started successfully with user credentials`,
      server_id: serverId,
      tool_id: `mcp:${serverId}`,
      server_type: result.type,
      capabilities: result.capabilities,
      started_at: new Date().toISOString()
    });
  } catch (error) {
    if (error.message.includes('No valid credentials')) {
      res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Please configure authentication for this server first',
        server_id: serverId,
        requires_configuration: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        server_id: serverId,
        timestamp: new Date().toISOString()
      });
    }
  }
}));


/**
 * GET /api/v1/tools/icons/:iconName
 * Serve tool icons from tool_icons directory
 */
router.get('/icons/:iconName', asyncHandler(async (req, res) => {
  const { iconName } = req.params;
  const iconPath = path.join(__dirname, '../../tool_icons', iconName);
  
  // Check if file exists
  if (!fs.existsSync(iconPath)) {
    return res.status(404).json({ error: 'Icon not found' });
  }
  
  // Set proper CORS and cache headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  
  // Serve the icon file
  res.sendFile(iconPath);
}));

// =====================================
// MCP Server OAuth Endpoints
// =====================================

// =====================================
// TOKEN REFRESH SERVICE MANAGEMENT
// =====================================

/**
 * GET /api/v1/tools/token-refresh/status
 * Get token refresh service status
 */
router.get('/token-refresh/status', requirePermission('admin:read'), asyncHandler(async (req, res) => {
  if (!global.tokenRefreshService) {
    return res.status(503).json({
      error: 'Token refresh service not available',
      status: 'disabled'
    });
  }

  const status = global.tokenRefreshService.getStatus();
  const stats = await global.tokenRefreshService.getStatistics();
  
  res.json({
    service_status: status,
    token_statistics: stats
  });
}));

/**
 * POST /api/v1/tools/token-refresh/manual
 * Manually trigger token refresh job
 */
router.post('/token-refresh/manual', requirePermission('admin:write'), asyncHandler(async (req, res) => {
  if (!global.tokenRefreshService) {
    throw new Error('Token refresh service not available');
  }

  console.log('[LOADING] Manual token refresh triggered by admin');
  const result = await global.tokenRefreshService.refreshExpiredTokens();
  
  res.json({
    success: true,
    message: 'Manual token refresh completed',
    result: result
  });
}));

/**
 * POST /api/v1/tools/:toolName/token-refresh
 * Manually refresh a specific user's token
 */
router.post('/:toolName/token-refresh', requirePermission('tools:configure'), asyncHandler(async (req, res) => {
  const { toolName } = req.params;
  const userId = req.user?.uid || req.user?.id;

  if (!userId) {
    throw new ValidationError('User authentication required');
  }

  if (!global.tokenRefreshService) {
    throw new Error('Token refresh service not available');
  }

  try {
    const result = await global.tokenRefreshService.refreshSpecificToken(userId, toolName);
    
    res.json({
      success: result.success,
      message: result.success ? 'Token refreshed successfully' : `Token refresh failed: ${result.reason}`,
      tool_name: toolName,
      refreshed_at: new Date().toISOString()
    });
  } catch (error) {
    throw new ValidationError(`Token refresh failed: ${error.message}`);
  }
}));

// =====================================
// Legacy MCP OAuth endpoints have been unified into main OAuth endpoints above
// All OAuth requests (both regular tools and MCP servers) now use:
// GET  /api/v1/tools/:toolName/auth/url
// POST /api/v1/tools/:toolName/auth/callback
// This provides consistent behavior and eliminates dual endpoint confusion

module.exports = router;
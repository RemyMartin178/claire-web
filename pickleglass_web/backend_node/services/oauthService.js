/**
 * Generic OAuth Service - Multi-Provider OAuth 2.0 Authentication
 * Uses simple-oauth2 for standardized OAuth flows across all tools
 * 
 * Supports: Google, Microsoft, Slack, Notion, GitHub, Atlassian, and more
 */

const { AuthorizationCode } = require('simple-oauth2');

class OAuthService {
  constructor() {
    // OAuth provider configurations (simple-oauth2 compatible)
    this.providers = {
      google: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID,
          secret: process.env.GOOGLE_CLIENT_SECRET
        },
        auth: {
          tokenHost: 'https://oauth2.googleapis.com',
          tokenPath: '/token',
          authorizePath: '/auth'
        },
        options: {
          bodyFormat: 'json',
          authorizationMethod: 'body'
        }
      },
      slack: {
        client: {
          id: process.env.SLACK_CLIENT_ID,
          secret: process.env.SLACK_CLIENT_SECRET
        },
        auth: {
          tokenHost: 'https://slack.com',
          tokenPath: '/api/oauth.v2.access',
          authorizePath: '/oauth/v2/authorize'
        }
      },
      notion: {
        client: {
          id: process.env.NOTION_CLIENT_ID,
          secret: process.env.NOTION_CLIENT_SECRET
        },
        auth: {
          tokenHost: 'https://api.notion.com',
          tokenPath: '/v1/oauth/token',
          authorizePath: '/v1/oauth/authorize'
        }
      },
      github: {
        client: {
          id: process.env.GITHUB_CLIENT_ID,
          secret: process.env.GITHUB_CLIENT_SECRET
        },
        auth: {
          tokenHost: 'https://github.com',
          tokenPath: '/login/oauth/access_token',
          authorizePath: '/login/oauth/authorize'
        }
      },
      microsoft: {
        client: {
          id: process.env.MICROSOFT_CLIENT_ID,
          secret: process.env.MICROSOFT_CLIENT_SECRET
        },
        auth: {
          tokenHost: 'https://login.microsoftonline.com',
          tokenPath: '/common/oauth2/v2.0/token',
          authorizePath: '/common/oauth2/v2.0/authorize'
        }
      },
      atlassian: {
        client: {
          id: process.env.ATLASSIAN_OAUTH_CLIENT_ID,
          secret: process.env.ATLASSIAN_OAUTH_CLIENT_SECRET
        },
        auth: {
          tokenHost: 'https://auth.atlassian.com',
          tokenPath: '/oauth/token',
          authorizePath: '/authorize'
        },
        options: {
          bodyFormat: 'json',
          authorizationMethod: 'body'
        }
      }
    };

    // Separate scopes object for tools (not passed to simple-oauth2)
    this.toolScopes = {
      // Google scopes
      'google_calendar': ['https://www.googleapis.com/auth/calendar'],
      'gmail': ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
      'google_drive': ['https://www.googleapis.com/auth/drive.readonly'],
      
      // Slack scopes  
      'slack': ['channels:read', 'chat:write', 'users:read'],
      
      // Notion scopes
      'notion': ['read', 'write'],
      
      // GitHub scopes
      'github': ['repo', 'user'],
      
      // Microsoft scopes
      'microsoft_outlook': ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Mail.Send'],
      'microsoft_teams': ['https://graph.microsoft.com/Team.ReadBasic.All', 'https://graph.microsoft.com/Channel.ReadBasic.All'],
      
      // Atlassian scopes
      'atlassian': ['read:jira-user', 'read:jira-work', 'write:jira-work', 'read:confluence-space.summary', 'read:confluence-props', 'write:confluence-props', 'read:confluence-content.all', 'write:confluence-content', 'offline_access'],
      'jira': ['read:jira-user', 'read:jira-work', 'write:jira-work', 'offline_access'],
      'confluence': ['read:confluence-space.summary', 'read:confluence-props', 'write:confluence-props', 'read:confluence-content.all', 'write:confluence-content', 'offline_access']
    };
  }

  /**
   * Detect provider from tool name
   */
  detectProvider(toolName) {
    if (toolName.includes('google')) return 'google';
    if (toolName.includes('slack')) return 'slack';
    if (toolName.includes('notion')) return 'notion';
    if (toolName.includes('github')) return 'github';
    if (toolName.includes('microsoft')) return 'microsoft';
    if (toolName.includes('atlassian') || toolName.includes('jira') || toolName.includes('confluence')) return 'atlassian';
    return 'google'; // Default
  }

  /**
   * Get scopes for a specific tool
   */
  getToolScopes(toolName, providerName = null) {
    const provider = providerName || this.detectProvider(toolName);
    
    // Try exact tool name first
    if (this.toolScopes[toolName]) {
      return this.toolScopes[toolName];
    }
    
    // Try provider-based scopes
    if (toolName.includes('google')) {
      return this.toolScopes[toolName] || ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];
    }
    
    if (toolName.includes('slack')) {
      return this.toolScopes['slack'];
    }
    
    if (toolName.includes('notion')) {
      return this.toolScopes['notion'];
    }
    
    if (toolName.includes('github')) {
      return this.toolScopes['github'];
    }
    
    if (toolName.includes('microsoft')) {
      return this.toolScopes['microsoft_outlook'];
    }
    
    if (toolName.includes('atlassian') || toolName.includes('jira') || toolName.includes('confluence')) {
      return this.toolScopes['atlassian'];
    }
    
    // Default scopes
    return ['read'];
  }

  /**
   * Get OAuth client for a specific provider
   */
  getOAuthClient(providerName) {
    const config = this.providers[providerName];
    if (!config) {
      throw new Error(`OAuth provider '${providerName}' not configured`);
    }

    if (!config.client.id || !config.client.secret) {
      throw new Error(`OAuth credentials missing for provider '${providerName}'`);
    }

    return new AuthorizationCode(config);
  }

  /**
   * Generate OAuth authorization URL for a tool
   */
  generateAuthUrl(toolName, providerName = null, redirectUri = null, userId = null) {
    try {
      // Auto-detect provider from tool name if not provided
      if (!providerName) {
        providerName = this.detectProvider(toolName);
      }

      const client = this.getOAuthClient(providerName);
      const config = this.providers[providerName];
      
      // Get scopes for this specific tool
      const scopes = this.getToolScopes(toolName, providerName);
      
      // Create state with user ID for proper session tracking
      let state = `${toolName}:${Date.now()}`;
      if (userId) {
        state = `${toolName}:${userId}:${Date.now()}`;
      }
      
      const authParams = {
        redirect_uri: redirectUri || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/tools/${toolName}/auth/callback`,
        scope: scopes.join(' '),
        state: state,
      };

      // Add provider-specific parameters
      if (providerName === 'atlassian') {
        // Atlassian-specific OAuth parameters
        authParams.audience = 'api.atlassian.com';
        authParams.response_type = 'code';
        authParams.prompt = 'consent'; // Force consent to ensure offline_access scope is granted
      } else {
        // Google-specific parameters (for other providers)
        authParams.access_type = 'offline'; // Request refresh token
        authParams.prompt = 'consent'; // Force consent screen for refresh token
      }

      const authorizationUri = client.authorizeURL(authParams);

      return authorizationUri;
    } catch (error) {
      throw new Error(`Failed to generate auth URL for ${toolName}: ${error.message}`);
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(toolName, authCode, redirectUri = null, providerName = null) {
    try {
      // Auto-detect provider from tool name if not provided
      if (!providerName) {
        providerName = this.detectProvider(toolName);
      }

      const client = this.getOAuthClient(providerName);
      
      const tokenParams = {
        code: authCode,
        redirect_uri: redirectUri || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/tools/${toolName}/auth/callback`
      };

      const result = await client.getToken(tokenParams);
      
      return {
        access_token: result.token.access_token,
        refresh_token: result.token.refresh_token || null,
        expires_at: result.token.expires_at || null,
        scope: result.token.scope || null,
        token_type: result.token.token_type || 'Bearer'
      };
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens for ${toolName}: ${error.message}`);
    }
  }
}

module.exports = new OAuthService();


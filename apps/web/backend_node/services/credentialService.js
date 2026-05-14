/**
 * Credential Service - Secure API Key and OAuth Token Management
 * Simple, minimal implementation for Claire startup
 */

const crypto = require('crypto');
const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Delay loading oauthService to avoid circular dependency
let oauthService = null;
function getOAuthService() {
  if (!oauthService) {
    oauthService = require('./oauthService');
  }
  return oauthService;
}

class CredentialService {
  constructor() {
    // Simple encryption key derived from environment
    // In production, this should come from secure environment variable
    this.encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || 'claire-default-key-change-in-production';
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    try {
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Store OAuth tokens for a user and tool
   */
  async storeOAuthTokens(userId, toolName, tokens) {
    try {
      const { access_token, refresh_token, expires_at } = tokens;

      // Encrypt tokens
      const encryptedAccessToken = this.encrypt(access_token);
      const encryptedRefreshToken = refresh_token ? this.encrypt(refresh_token) : null;

      // First ensure the table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_credentials (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          tool_name VARCHAR(100) NOT NULL,
          encrypted_access_token JSONB NOT NULL,
          encrypted_refresh_token JSONB,
          token_expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, tool_name)
        )
      `);

      // Migration: add missing columns if table was created with an old schema
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='user_credentials' AND column_name='encrypted_access_token'
          ) THEN
            ALTER TABLE user_credentials ADD COLUMN encrypted_access_token JSONB;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='user_credentials' AND column_name='encrypted_refresh_token'
          ) THEN
            ALTER TABLE user_credentials ADD COLUMN encrypted_refresh_token JSONB;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='user_credentials' AND column_name='token_expires_at'
          ) THEN
            ALTER TABLE user_credentials ADD COLUMN token_expires_at TIMESTAMP;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='user_credentials' AND column_name='account_email'
          ) THEN
            ALTER TABLE user_credentials ADD COLUMN account_email TEXT;
          END IF;
        END $$;
      `);

      // Migration: ensure UNIQUE(user_id, tool_name) constraint exists
      // Required for ON CONFLICT upsert to work. Dedup first to avoid conflict.
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'user_credentials'::regclass
              AND contype = 'u'
              AND conname LIKE '%user_id%tool_name%'
          ) THEN
            -- Remove duplicates first, keep latest row per (user_id, tool_name)
            DELETE FROM user_credentials a
            USING user_credentials b
            WHERE a.id < b.id
              AND a.user_id = b.user_id
              AND a.tool_name = b.tool_name;

            -- Now add the unique constraint
            ALTER TABLE user_credentials
              ADD CONSTRAINT user_credentials_user_id_tool_name_key
              UNIQUE (user_id, tool_name);
          END IF;
        END $$;
      `);

      // Store in database
      await pool.query(`
        INSERT INTO user_credentials 
        (user_id, tool_name, encrypted_access_token, encrypted_refresh_token, token_expires_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, tool_name) 
        DO UPDATE SET
          encrypted_access_token = EXCLUDED.encrypted_access_token,
          encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          updated_at = CURRENT_TIMESTAMP
      `, [
        userId,
        toolName,
        JSON.stringify(encryptedAccessToken),
        encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
        expires_at ? new Date(expires_at) : null
      ]);

      return true;
    } catch (error) {
      throw new Error(`Failed to store OAuth tokens: ${error.message}`);
    }
  }

  /**
   * Retrieve OAuth tokens for a user and tool
   */
  async getOAuthTokens(userId, toolName) {
    try {
      const result = await pool.query(`
        SELECT encrypted_access_token, encrypted_refresh_token, token_expires_at
        FROM user_credentials 
        WHERE user_id = $1 AND tool_name = $2
        ORDER BY updated_at DESC
        LIMIT 1
      `, [userId, toolName]);

      if (result.rows.length === 0) {
        console.log(`[CredentialService] No credentials found for user ${userId} and tool ${toolName}`);
        return null;
      }

      const row = result.rows[0];

      // Decrypt tokens
      // Note: pg driver automatically parses JSONB columns into objects
      const accessTokenData = typeof row.encrypted_access_token === 'string'
        ? JSON.parse(row.encrypted_access_token)
        : row.encrypted_access_token;
      const accessToken = this.decrypt(accessTokenData);

      let refreshToken = null;
      if (row.encrypted_refresh_token) {
        const refreshTokenData = typeof row.encrypted_refresh_token === 'string'
          ? JSON.parse(row.encrypted_refresh_token)
          : row.encrypted_refresh_token;
        refreshToken = this.decrypt(refreshTokenData);
      }

      // CHECK FOR EXPIRATION AND REFRESH
      if (row.token_expires_at) {
        const expiryTime = new Date(row.token_expires_at);
        const now = new Date();
        const buffer = 5 * 60 * 1000; // 5 minute buffer

        if (now.getTime() + buffer > expiryTime.getTime()) {
          if (refreshToken) {
            console.log(`[CredentialService] Token expired or expiring soon for user ${userId} (${toolName}). Refreshing...`);
            try {
              const newTokens = await getOAuthService().refreshAccessToken(toolName, refreshToken);
              // Store new tokens in background (optional await)
              await this.storeOAuthTokens(userId, toolName, newTokens);
              return newTokens;
            } catch (refreshError) {
              console.error(`[CredentialService] Auto-refresh failed for user ${userId} (${toolName}):`, refreshError.message);
              // If refresh fails, we might as well return null to trigger a fresh login
              return null;
            }
          } else {
            console.log(`[CredentialService] Token expired for user ${userId} (${toolName}) and no refresh token available.`);
            return null;
          }
        }
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: row.token_expires_at
      };
    } catch (error) {
      throw new Error(`Failed to retrieve OAuth tokens: ${error.message}`);
    }
  }

  /**
   * Check if user has valid credentials for a tool
   */
  async hasValidCredentials(userId, toolName) {
    try {
      const tokens = await this.getOAuthTokens(userId, toolName);

      if (!tokens) {
        return { valid: false, reason: 'not_found' };
      }

      // Check if token is expired (with 3-minute buffer)
      if (tokens.expires_at) {
        const expiryTime = new Date(tokens.expires_at);
        const now = new Date();
        const buffer = 3 * 60 * 1000; // 3 minutes

        const isExpired = now.getTime() + buffer > expiryTime.getTime();
        if (isExpired) {
          console.log(`[CredentialService] Token expired for user ${userId} (${toolName}). Expiry: ${expiryTime.toISOString()}, Now: ${now.toISOString()}`);
          return { valid: false, reason: 'expired' };
        }
      }

      console.log(`[CredentialService] Valid credentials found for user ${userId} (${toolName})`);
      return { valid: true };
    } catch (error) {
      console.error(`[CredentialService] Error checking credentials: ${error.message}`);
      return { valid: false, reason: 'error', message: error.message };
    }
  }

  /**
   * Delete credentials for a user and tool
   */
  async deleteCredentials(userId, toolName) {
    try {
      await pool.query(`
        DELETE FROM user_credentials 
        WHERE user_id = $1 AND tool_name = $2
      `, [userId, toolName]);

      return true;
    } catch (error) {
      throw new Error(`Failed to delete credentials: ${error.message}`);
    }
  }

  /**
   * List tools that user has credentials for
   */
  async getUserConfiguredTools(userId) {
    try {
      const result = await pool.query(`
        SELECT tool_name, created_at, token_expires_at
        FROM user_credentials
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows.map(row => ({
        tool_name: row.tool_name,
        configured_at: row.created_at,
        expires_at: row.token_expires_at
      }));
    } catch (error) {
      throw new Error(`Failed to get user configured tools: ${error.message}`);
    }
  }
}

module.exports = new CredentialService();


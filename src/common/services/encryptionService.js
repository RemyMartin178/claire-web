const crypto = require('crypto');
const { createLogger } = require('./logger.js');
let keytar;

// Dynamically import keytar, as it's an optional dependency.
try {
    keytar = require('keytar');
} catch (error) {
    console.warn('[EncryptionService] keytar is not available. Will use in-memory key for this session.');
    keytar = null;
}

// Optional permission service integration if available in the same directory or nearby
let permissionService = null;
try {
    permissionService = require('../../features/common/services/permissionService');
} catch (e) {
    // Optional
}

const logger = createLogger('EncryptionService');
const SERVICE_NAME = 'com.pickle.glass'; // Unified service name
let sessionKey = null; // In-memory fallback key

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const AUTH_TAG_LENGTH = 16;


/**
 * Initializes the encryption key for a given user.
 * It first tries to get the key from the OS keychain.
 * @param {string} userId - The unique identifier for the user (e.g., Firebase UID).
 */
async function initializeKey(userId) {
    if (!userId) {
        throw new Error('A user ID must be provided to initialize the encryption key.');
    }

    let keyRetrieved = false;

    if (keytar) {
        try {
            let key = await keytar.getPassword(SERVICE_NAME, userId);
            if (!key) {
                logger.info(`No key found for ${userId}. Creating a new one.`);
                key = crypto.randomBytes(32).toString('hex');
                await keytar.setPassword(SERVICE_NAME, userId, key);
                logger.info(`New key securely stored in keychain for ${userId}.`);
            } else {
                logger.info(`Encryption key successfully retrieved from keychain for ${userId}.`);
                keyRetrieved = true;
            }
            sessionKey = key;
        } catch (error) {
            logger.error('keytar failed. Falling back to in-memory key for this session.', { error });
            keytar = null; // Disable keytar for the rest of the session
            sessionKey = crypto.randomBytes(32).toString('hex');
        }
    } else {
        if (!sessionKey) {
            logger.warn('Using in-memory session key. Data will not persist across restarts without keytar.');
            sessionKey = crypto.randomBytes(32).toString('hex');
        }
    }

    // Mark keychain completed in permissions DB if available
    if (permissionService && typeof permissionService.markKeychainCompleted === 'function') {
        try {
            await permissionService.markKeychainCompleted(userId);
            if (keyRetrieved) {
                logger.info(`Keychain completion marked in DB for ${userId}.`);
            }
        } catch (permErr) {
            logger.error('Failed to mark keychain completion:', permErr);
        }
    }

    if (!sessionKey) {
        throw new Error('Failed to initialize encryption key.');
    }
}

function resetSessionKey() {
    sessionKey = null;
}

/**
 * Encrypts a given text using AES-256-GCM.
 * @param {string} text The text to encrypt.
 * @returns {string | null} The encrypted data, as a base64 string.
 */
function encrypt(text) {
    // Encryption COMPLETELY DISABLED as per user request to ensure plaintext storage across platforms
    return text;
}

/**
 * Decrypts a given encrypted string.
 * @param {string} encryptedText The base64 encrypted text.
 * @returns {string | null} The decrypted text.
 */
function decrypt(encryptedText) {
    // Encryption COMPLETELY DISABLED - return as-is. 
    // If it looks like base64-ish encrypted data, our migration script will handle it on startup.
    return encryptedText;
}

function looksEncrypted(str) {
    if (!str || typeof str !== 'string') return false;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(str)) return false;
    try {
        const buf = Buffer.from(str, 'base64');
        return buf.length >= 32;
    } catch {
        return false;
    }
}

module.exports = {
    initializeKey,
    resetSessionKey,
    encrypt,
    decrypt,
    looksEncrypted,
};
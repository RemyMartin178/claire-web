/**
 * Neon PostgreSQL Repository for Ask Service
 * Uses backend API for authenticated users
 */

const fetch = require('node-fetch');

const BACKEND_URL = (process.env.pickleglass_API_URL || 'http://localhost:3001') + '/api/v1';

/**
 * Get Firebase ID token for authentication
 */
async function getFirebaseToken() {
    try {
        const authService = require('../../../common/services/authService');
        const currentUser = authService.currentUser;
        
        if (currentUser && currentUser.getIdToken) {
            const token = await currentUser.getIdToken(true);
            console.log('[SEARCH] [DEBUG] Firebase token retrieved successfully');
            return token;
        }
        
        console.log('[SEARCH] [WARN] No Firebase user found, using development token');
        return null;
    } catch (error) {
        console.log('[SEARCH] [ERROR] Failed to get Firebase token:', error.message);
        return null;
    }
}

/**
 * Ensure conversation exists in backend, create if it doesn't
 */
async function ensureConversationExists(sessionId, uid, authHeader) {
    try {
        // Try to get the conversation
        const getResponse = await fetch(`${BACKEND_URL}/conversations/${sessionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            }
        });

        if (getResponse.ok) {
            console.log('[SEARCH] [DEBUG] Conversation exists in backend:', sessionId);
            return true;
        }

        if (getResponse.status === 404) {
            // Conversation doesn't exist, create it
            console.log('[SEARCH] [DEBUG] Conversation not found, creating in backend:', sessionId);
            const createResponse = await fetch(`${BACKEND_URL}/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                    'X-User-ID': uid,
                },
                body: JSON.stringify({
                    id: sessionId, // Try to use the sessionId as the conversation ID
                    title: `Session @ ${new Date().toLocaleTimeString()}`,
                    agentType: 'ask',
                    metadata: {}
                })
            });

            if (!createResponse.ok) {
                // If creating with specific ID fails, try without ID (let backend generate one)
                console.log('[SEARCH] [WARN] Failed to create conversation with specific ID, trying without ID');
                const createResponse2 = await fetch(`${BACKEND_URL}/conversations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader,
                        'X-User-ID': uid,
                    },
                    body: JSON.stringify({
                        title: `Session @ ${new Date().toLocaleTimeString()}`,
                        agentType: 'ask',
                        metadata: {}
                    })
                });

                if (!createResponse2.ok) {
                    throw new Error(`Failed to create conversation: ${createResponse2.status} ${createResponse2.statusText}`);
                }

                const created = await createResponse2.json();
                console.log('[SEARCH] [DEBUG] Created new conversation with backend-generated ID:', created.id);
                // Note: The sessionId from Firebase won't match the backend ID, but that's okay
                // The backend will handle this
                return created.id;
            }

            const created = await createResponse.json();
            console.log('[SEARCH] [DEBUG] Created conversation in backend:', created.id || sessionId);
            return true;
        }

        throw new Error(`Failed to check conversation: ${getResponse.status} ${getResponse.statusText}`);
    } catch (error) {
        console.log('[ERROR] [DEBUG] Error ensuring conversation exists:', error.message);
        throw error;
    }
}

async function addAiMessage({ uid, sessionId, role, content, model = 'unknown' }) {
    console.log('[SEARCH] [DEBUG] Neon addAiMessage called with:', {
        uid,
        sessionId,
        role,
        model,
        contentLength: content?.length || 0
    });

    try {
        console.log('[SEARCH] [DEBUG] Attempting to save message to Neon via backend API');
        
        // Get Firebase token for production authentication
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken 
            ? `Bearer ${firebaseToken}` 
            : 'Bearer development_token'; // Fallback for dev mode
        
        // Ensure conversation exists in backend before adding message
        await ensureConversationExists(sessionId, uid, authHeader);
        
        const response = await fetch(`${BACKEND_URL}/conversations/${sessionId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                'X-User-ID': uid,
            },
            body: JSON.stringify({
                role,
                content,
                model,
                uid,
                processingTime: null,
                tokenCount: null
            })
        });

        if (!response.ok) {
            // If still 404, the conversation ID might not match - try to find or create a new one
            if (response.status === 404) {
                console.log('[SEARCH] [WARN] Message add failed with 404, conversation ID mismatch. Creating new conversation.');
                // Create a new conversation and use its ID
                const createResponse = await fetch(`${BACKEND_URL}/conversations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader,
                        'X-User-ID': uid,
                    },
                    body: JSON.stringify({
                        title: `Session @ ${new Date().toLocaleTimeString()}`,
                        agentType: 'ask',
                        metadata: {}
                    })
                });

                if (!createResponse.ok) {
                    throw new Error(`Backend API error: ${createResponse.status} ${createResponse.statusText}`);
                }

                const newConversation = await createResponse.json();
                console.log('[SEARCH] [DEBUG] Created new conversation, retrying message add with ID:', newConversation.id);
                
                // Retry with the new conversation ID
                const retryResponse = await fetch(`${BACKEND_URL}/conversations/${newConversation.id}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader,
                        'X-User-ID': uid,
                    },
                    body: JSON.stringify({
                        role,
                        content,
                        model,
                        uid,
                        processingTime: null,
                        tokenCount: null
                    })
                });

                if (!retryResponse.ok) {
                    throw new Error(`Backend API error: ${retryResponse.status} ${retryResponse.statusText}`);
                }

                const result = await retryResponse.json();
                console.log('[OK] [DEBUG] Successfully saved message to Neon with ID:', result.id);
                return { id: result.id || result.messageId };
            }
            
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[OK] [DEBUG] Successfully saved message to Neon with ID:', result.id);
        
        return { id: result.id || result.messageId };
    } catch (error) {
        console.log('[ERROR] [DEBUG] Neon save failed:', {
            error: error.message,
            sessionId,
            uid
        });
        
        throw new Error(`Neon repository: Backend conversation API error. ${error.message}`);
    }
}

async function getAllAiMessagesBySessionId(sessionId) {
    console.log('[SEARCH] [DEBUG] Getting all messages for session:', sessionId);
    
    try {
        // Get Firebase token for production authentication
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken 
            ? `Bearer ${firebaseToken}` 
            : 'Bearer development_token'; // Fallback for dev mode
        
        const response = await fetch(`${BACKEND_URL}/conversations/${sessionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            }
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[OK] [DEBUG] Retrieved messages from Neon:', result.messages?.length || 0);
        
        return result.messages || [];
    } catch (error) {
        console.log('[ERROR] [DEBUG] Failed to get messages from Neon:', error.message);
        throw new Error(`Neon repository: ${error.message}`);
    }
}

module.exports = {
    addAiMessage,
    getAllAiMessagesBySessionId,
};
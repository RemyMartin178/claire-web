/**
 * Backend API Session Repository
 * Uses backend conversation API instead of Firebase
 */

const fetch = require('node-fetch');
const { createLogger } = require('../../services/logger.js');

const logger = createLogger('Backend.SessionRepository');

const BACKEND_URL = (process.env.pickleglass_API_URL || 'http://localhost:3001') + '/api/v1';

/**
 * Get Firebase ID token for authentication
 */
async function getFirebaseToken() {
    try {
        const authService = require('../../services/authService');
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

async function getById(id) {
    console.log('[SEARCH] [DEBUG] Backend getById called with:', { id });
    
    try {
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken 
            ? `Bearer ${firebaseToken}` 
            : 'Bearer development_token';
        
        const response = await fetch(`${BACKEND_URL}/conversations/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.log('[SEARCH] [DEBUG] Conversation not found:', id);
                return null;
            }
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[OK] [DEBUG] Retrieved conversation from backend:', result.id);
        
        // Convert backend conversation format to session format
        const endedAtSec = result.metadata?.ended_at;
        return {
            id: result.id,
            uid: result.user_id,
            members: [result.user_id],
            title: result.title,
            session_type: result.agentType || 'ask',
            started_at: result.created_at,
            updated_at: result.updated_at,
            ended_at: endedAtSec ? endedAtSec * 1000 : null,
            metadata: result.metadata || {}
        };
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend getById failed:', { error: error.message, id });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

async function create(uid, type = 'ask') {
    console.log('[SEARCH] [DEBUG] Backend create called with:', { uid, type });
    
    try {
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken 
            ? `Bearer ${firebaseToken}` 
            : 'Bearer development_token';
        
        const response = await fetch(`${BACKEND_URL}/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                'X-User-ID': uid,
            },
            body: JSON.stringify({
                title: `Session @ ${new Date().toLocaleTimeString()}`,
                agentType: type,
                metadata: {}
            })
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[OK] [DEBUG] Successfully created conversation with ID:', result.id);
        logger.info(`Backend: Created session ${result.id} for user ${uid}`);
        
        return result.id;
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend create failed:', { error: error.message, uid, type });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

async function getAllByUserId(uid) {
    console.log('[SEARCH] [DEBUG] Backend getAllByUserId called with:', { uid });
    
    try {
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken 
            ? `Bearer ${firebaseToken}` 
            : 'Bearer development_token';
        
        const response = await fetch(`${BACKEND_URL}/conversations?limit=50`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                'X-User-ID': uid,
            }
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        const conversations = await response.json();
        console.log('[OK] [DEBUG] Retrieved conversations from backend:', conversations.length);
        
        // Convert backend conversation format to session format
        return conversations.map(conv => {
            const endedAtSec = conv.metadata?.ended_at;
            return {
                id: conv.id,
                uid: conv.user_id,
                members: [conv.user_id],
                title: conv.title,
                session_type: conv.agentType || 'ask',
                started_at: conv.created_at,
                updated_at: conv.updated_at,
                ended_at: endedAtSec ? endedAtSec * 1000 : null,
                metadata: conv.metadata || {}
            };
        });
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend getAllByUserId failed:', { error: error.message, uid });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

async function updateTitle(id, title) {
    console.log('[SEARCH] [DEBUG] Backend updateTitle called with:', { id, title });
    
    try {
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken 
            ? `Bearer ${firebaseToken}` 
            : 'Bearer development_token';
        
        const response = await fetch(`${BACKEND_URL}/conversations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify({ title })
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        console.log('[OK] [DEBUG] Successfully updated conversation title');
        return { changes: 1 };
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend updateTitle failed:', { error: error.message, id, title });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

async function deleteWithRelatedData(id) {
    console.log('[SEARCH] [DEBUG] Backend deleteWithRelatedData called with:', { id });
    
    try {
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken 
            ? `Bearer ${firebaseToken}` 
            : 'Bearer development_token';
        
        const response = await fetch(`${BACKEND_URL}/conversations/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.log('[SEARCH] [DEBUG] Conversation not found for deletion:', id);
                return { success: true };
            }
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        console.log('[OK] [DEBUG] Successfully deleted conversation and related data');
        return { success: true };
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend deleteWithRelatedData failed:', { error: error.message, id });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

async function end(id, endedAtMs = null) {
    console.log('[SEARCH] [DEBUG] Backend end called with:', { id });

    try {
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken
            ? `Bearer ${firebaseToken}`
            : 'Bearer development_token';

        const endedAtSec = Math.floor((endedAtMs ?? Date.now()) / 1000);

        // Backend doesn't currently support ending sessions, but we can update metadata
        const response = await fetch(`${BACKEND_URL}/conversations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify({
                metadata: { ended_at: endedAtSec }
            })
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        console.log('[OK] [DEBUG] Successfully ended session');
        return { changes: 1 };
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend end failed:', { error: error.message, id });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

async function updateType(id, type) {
    console.log('[SEARCH] [DEBUG] Backend updateType called with:', { id, type });
    
    try {
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken 
            ? `Bearer ${firebaseToken}` 
            : 'Bearer development_token';
        
        const response = await fetch(`${BACKEND_URL}/conversations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify({ 
                metadata: { session_type: type }
            })
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        console.log('[OK] [DEBUG] Successfully updated session type');
        return { changes: 1 };
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend updateType failed:', { error: error.message, id, type });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

async function touch(id) {
    console.log('[SEARCH] [DEBUG] Backend touch called with:', { id });
    
    try {
        const firebaseToken = await getFirebaseToken();
        const authHeader = firebaseToken 
            ? `Bearer ${firebaseToken}` 
            : 'Bearer development_token';
        
        // Touch by updating metadata with current timestamp
        const response = await fetch(`${BACKEND_URL}/conversations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify({ 
                metadata: { last_touched: Math.floor(Date.now() / 1000) }
            })
        });

        if (!response.ok) {
            // If session doesn't exist (404), silently ignore - it will be created when needed
            if (response.status === 404) {
                console.log('[WARNING] [DEBUG] Session does not exist - will be created when needed:', { id });
                return { changes: 0 };
            }
            throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
        }

        console.log('[OK] [DEBUG] Successfully touched session');
        return { changes: 1 };
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend touch failed:', { error: error.message, id });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

async function getOrCreateActive(uid, requestedType = 'ask') {
    console.log('[SEARCH] [DEBUG] Backend getOrCreateActive called with:', { uid, requestedType });
    
    try {
        // Get all conversations for the user
        const conversations = await getAllByUserId(uid);
        
        const MAX_SESSION_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours — beyond this, a session is considered stale

        // Find a recent active session (no ended_at AND created less than 4h ago)
        const activeSession = conversations.find(session => {
            if (session.ended_at || session.metadata?.ended_at) return false;
            const age = Date.now() - new Date(session.started_at).getTime();
            return age < MAX_SESSION_AGE_MS;
        });

        // Close any stale sessions (no ended_at but older than 4h) with duration = 0
        const staleSessions = conversations.filter(session => {
            if (session.ended_at || session.metadata?.ended_at) return false;
            const age = Date.now() - new Date(session.started_at).getTime();
            return age >= MAX_SESSION_AGE_MS;
        });
        if (staleSessions.length > 0) {
            logger.warn(`Closing ${staleSessions.length} stale session(s) with 0 duration`);
            await Promise.all(staleSessions.map(s =>
                end(s.id, new Date(s.started_at).getTime()) // ended_at = started_at → duration 0
            ));
        }

        if (activeSession) {
            console.log('[OK] [DEBUG] Found active backend session:', activeSession.id);
            logger.info('Found active Backend session');

            // Update session type if needed and touch it
            if (activeSession.session_type === 'ask' && requestedType === 'listen') {
                await updateType(activeSession.id, 'listen');
                logger.info(`Promoted Backend session ${activeSession.id} to 'listen' type.`);
            }

            try {
                await touch(activeSession.id);
                return activeSession.id;
            } catch (touchError) {
                console.log('[WARNING] [DEBUG] Active session not found in backend, creating new session');
                logger.warn('Active session not found in backend, creating new session');
                return await create(uid, requestedType);
            }
        } else {
            console.log('[OK] [DEBUG] No active backend session for user. Creating new.');
            logger.info('No active Backend session for user. Creating new.');
            return await create(uid, requestedType);
        }
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend getOrCreateActive failed:', { error: error.message, uid, requestedType });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

async function endAllActiveSessions(uid) {
    console.log('[SEARCH] [DEBUG] Backend endAllActiveSessions called with:', { uid });
    
    try {
        const conversations = await getAllByUserId(uid);
        
        // Find active sessions (no ended_at)
        const activeSessions = conversations.filter(session => {
            return !session.ended_at && !session.metadata?.ended_at;
        });

        if (activeSessions.length === 0) {
            return { changes: 0 };
        }

        // End all active sessions at current time
        await Promise.all(activeSessions.map(session => end(session.id)));

        console.log('[OK] [DEBUG] Ended all active sessions for user');
        logger.info(`Ended ${activeSessions.length} active session(s) for user.`);
        return { changes: activeSessions.length };
    } catch (error) {
        console.log('[ERROR] [DEBUG] Backend endAllActiveSessions failed:', { error: error.message, uid });
        throw new Error(`Backend session repository: ${error.message}`);
    }
}

module.exports = {
    getById,
    create,
    getAllByUserId,
    updateTitle,
    deleteWithRelatedData,
    end,
    updateType,
    touch,
    getOrCreateActive,
    endAllActiveSessions,
};
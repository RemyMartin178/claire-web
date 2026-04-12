/**
 * Neon PostgreSQL Repository for Ask Service
 * Uses Firebase as primary storage - Neon/backend integration is disabled for now
 * TODO: Re-enable when backend conversation API properly supports authenticated users
 */

const firebaseRepository = require('./firebase.repository');

async function addAiMessage({ uid, sessionId, role, content, model = 'unknown' }) {
    console.log('[SEARCH] [DEBUG] Neon repository redirecting to Firebase (backend API not yet ready)');
    
    // For now, just use Firebase repository directly
    // The backend conversation API needs proper implementation first
    return firebaseRepository.addAiMessage({ uid, sessionId, role, content, model });
}

async function getAllAiMessagesBySessionId(uid, sessionId) {
    console.log('[SEARCH] [DEBUG] Neon repository redirecting to Firebase (backend API not yet ready)');
    
    // For now, just use Firebase repository directly
    return firebaseRepository.getAllAiMessagesBySessionId(uid, sessionId);
}

module.exports = {
    addAiMessage,
    getAllAiMessagesBySessionId,
};
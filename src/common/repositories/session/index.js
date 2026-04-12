// Prefer Firebase repository for sessions in production to avoid backend 404s
const firebaseRepository = require('./firebase.repository');

let authService = null;

function setAuthService(service) {
    authService = service;
}

function getBaseRepository() {
    return firebaseRepository;
}

// The adapter layer that injects the UID into all repository methods
const sessionRepositoryAdapter = {
    setAuthService, // Expose the setter

    getById: (id) => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().getById(uid, id);
    },
    
    create: (type = 'ask') => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().create(uid, type);
    },
    
    getAllByUserId: () => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().getAllByUserId(uid);
    },

    updateTitle: (id, title) => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().updateTitle(uid, id, title);
    },
    
    deleteWithRelatedData: (id) => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().deleteWithRelatedData(uid, id);
    },

    end: (id) => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().end(uid, id);
    },

    updateType: (id, type) => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().updateType(uid, id, type);
    },

    touch: (id) => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().touch(uid, id);
    },

    getOrCreateActive: (requestedType = 'ask') => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().getOrCreateActive(uid, requestedType);
    },

    endAllActiveSessions: () => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().endAllActiveSessions(uid);
    },
};

module.exports = sessionRepositoryAdapter; 
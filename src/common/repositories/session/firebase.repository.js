const { doc, getDoc, collection, addDoc, query, where, getDocs, writeBatch, orderBy, limit, updateDoc, Timestamp } = require('firebase/firestore');
const { getFirestoreInstance } = require('../../services/firebaseClient');
const { createEncryptedConverter } = require('../firestoreConverter');
const encryptionService = require('../../services/encryptionService');
const { createLogger } = require('../../services/logger.js');

const logger = createLogger('Firebase.repository');

const sessionConverter = createEncryptedConverter(['title']);

// ✅ Changed to match web app structure: /users/{uid}/sessions
function sessionsCol(uid) {
    const db = getFirestoreInstance();
    return collection(db, 'users', uid, 'sessions').withConverter(sessionConverter);
}

// Sub-collection references now use user-scoped path
function subCollections(uid, sessionId) {
    const db = getFirestoreInstance();
    const sessionPath = `users/${uid}/sessions/${sessionId}`;
    return {
        transcripts: collection(db, `${sessionPath}/transcripts`),
        ai_messages: collection(db, `${sessionPath}/ai_messages`),
        summary: collection(db, `${sessionPath}/summary`),
    }
}

async function getById(uid, id) {
    const docRef = doc(sessionsCol(uid), id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}

async function create(uid, type = 'ask') {
    const now = Timestamp.now();
    const newSession = {
        title: `Session @ ${new Date().toLocaleTimeString()}`,
        sessionType: type, // Match web app field naming
        startedAt: now, // Match web app field naming (camelCase)
        updatedAt: now,
        endedAt: null,
    };
    const docRef = await addDoc(sessionsCol(uid), newSession);
    logger.info(`Firebase: Created session ${docRef.id} for user ${uid} in /users/${uid}/sessions/`);
    return docRef.id;
}

async function getAllByUserId(uid) {
    const q = query(sessionsCol(uid), orderBy('startedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function updateTitle(uid, id, title) {
    const docRef = doc(sessionsCol(uid), id);
    await updateDoc(docRef, {
        title: encryptionService.encrypt(title),
        updatedAt: Timestamp.now()
    });
    return { changes: 1 };
}

async function deleteWithRelatedData(uid, id) {
    const db = getFirestoreInstance();
    const batch = writeBatch(db);

    const { transcripts, ai_messages, summary } = subCollections(uid, id);
    const [transcriptsSnap, aiMessagesSnap, summarySnap] = await Promise.all([
        getDocs(query(transcripts)),
        getDocs(query(ai_messages)),
        getDocs(query(summary)),
    ]);
    
    transcriptsSnap.forEach(d => batch.delete(d.ref));
    aiMessagesSnap.forEach(d => batch.delete(d.ref));
    summarySnap.forEach(d => batch.delete(d.ref));

    const sessionRef = doc(sessionsCol(uid), id);
    batch.delete(sessionRef);

    await batch.commit();
    return { success: true };
}

async function end(uid, id) {
    const docRef = doc(sessionsCol(uid), id);
    await updateDoc(docRef, { endedAt: Timestamp.now() });
    return { changes: 1 };
}

async function updateType(uid, id, type) {
    const docRef = doc(sessionsCol(uid), id);
    await updateDoc(docRef, { sessionType: type });
    return { changes: 1 };
}

async function touch(uid, id) {
    const docRef = doc(sessionsCol(uid), id);
    await updateDoc(docRef, { updatedAt: Timestamp.now() });
    return { changes: 1 };
}

async function getOrCreateActive(uid, requestedType = 'ask') {
    // ✅ Removed orderBy to avoid needing composite index in Firestore
    // Simply find any active session (endedAt == null)
    const findQuery = query(
        sessionsCol(uid),
        where('endedAt', '==', null),
        limit(1)
    );

    const activeSessionSnap = await getDocs(findQuery);
    
    if (!activeSessionSnap.empty) {
        const activeSessionDoc = activeSessionSnap.docs[0];
        const sessionRef = doc(sessionsCol(uid), activeSessionDoc.id);
        const activeSession = activeSessionDoc.data();

        logger.info('Found active Firebase session');
        
        const updates = { updatedAt: Timestamp.now() };
        if (activeSession.sessionType === 'ask' && requestedType === 'listen') {
            updates.sessionType = 'listen';
            logger.info(`Promoted Firebase session ${activeSessionDoc.id} to 'listen' type.`);
        }
        
        await updateDoc(sessionRef, updates);
        return activeSessionDoc.id;
    } else {
        logger.info('No active Firebase session for user. Creating new.');
        return create(uid, requestedType);
    }
}

async function endAllActiveSessions(uid) {
    const q = query(sessionsCol(uid), where('endedAt', '==', null));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return { changes: 0 };

    const batch = writeBatch(getFirestoreInstance());
    const now = Timestamp.now();
    snapshot.forEach(d => {
        batch.update(d.ref, { endedAt: now });
    });
    await batch.commit();

    logger.info(`Ended ${snapshot.size} active session(s) for user.`);
    return { changes: snapshot.size };
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
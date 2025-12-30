const { collection, addDoc, query, getDocs, orderBy, Timestamp } = require('firebase/firestore');
const { getFirestoreInstance } = require('../../../../common/services/firebaseClient');
const { createEncryptedConverter } = require('../../../../common/repositories/firestoreConverter');

const transcriptConverter = createEncryptedConverter(['text']);

// ✅ Updated to match web app structure: /users/{uid}/sessions/{sessionId}/transcripts
function transcriptsCol(uid, sessionId) {
    if (!uid) throw new Error("User ID is required to access transcripts.");
    if (!sessionId) throw new Error("Session ID is required to access transcripts.");
    const db = getFirestoreInstance();
    return collection(db, `users/${uid}/sessions/${sessionId}/transcripts`).withConverter(transcriptConverter);
}

async function addTranscript({ uid, sessionId, speaker, text }) {
    const now = Timestamp.now();
    const newTranscript = {
        startAt: now, // Match web app camelCase naming
        speaker,
        text,
        createdAt: now,
    };
    const docRef = await addDoc(transcriptsCol(uid, sessionId), newTranscript);
    return { id: docRef.id };
}

async function getAllTranscriptsBySessionId(uid, sessionId) {
    const q = query(transcriptsCol(uid, sessionId), orderBy('startAt', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
    addTranscript,
    getAllTranscriptsBySessionId,
}; 
const { collection, doc, setDoc, getDoc, Timestamp } = require('firebase/firestore');
const { getFirestoreInstance } = require('../../../../common/services/firebaseClient');
const { createEncryptedConverter } = require('../../../../common/repositories/firestoreConverter');
const encryptionService = require('../../../../common/services/encryptionService');

const fieldsToEncrypt = ['tldr', 'text', 'bullet_json', 'action_json'];
const summaryConverter = createEncryptedConverter(fieldsToEncrypt);

// ✅ Updated to match web app structure: /users/{uid}/sessions/{sessionId}/summary/data
function summaryDocRef(uid, sessionId) {
    if (!uid) throw new Error("User ID is required to access summary.");
    if (!sessionId) throw new Error("Session ID is required to access summary.");
    const db = getFirestoreInstance();
    const docPath = `users/${uid}/sessions/${sessionId}/summary/data`;
    return doc(db, docPath).withConverter(summaryConverter);
}

async function saveSummary({ uid, sessionId, tldr, text, bullet_json, action_json, model = 'unknown' }) {
    const now = Timestamp.now();
    const summaryData = {
        generatedAt: now, // Match web app camelCase naming
        model,
        text,
        tldr,
        bulletJson: bullet_json, // camelCase
        actionJson: action_json, // camelCase
        updatedAt: now,
    };
    
    // The converter attached to summaryDocRef will handle encryption via its `toFirestore` method.
    const docRef = summaryDocRef(uid, sessionId);
    await setDoc(docRef, summaryData, { merge: true });

    return { changes: 1 };
}

async function getSummaryBySessionId(uid, sessionId) {
    const docRef = summaryDocRef(uid, sessionId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
}

module.exports = {
    saveSummary,
    getSummaryBySessionId,
}; 
const { getFirestoreInstance } = require('../common/services/firebaseClient');
const { collection, getDocs, setDoc } = require('firebase/firestore');
const { createEncryptedConverter } = require('../common/repositories/firestoreConverter');
const fs = require('fs');
const path = require('path');

function logItem(msg) {
    console.log(msg);
}

const transcriptConverter = createEncryptedConverter(['text', 'content']);
const aiMessageConverter = createEncryptedConverter(['content', 'text']);
const summaryConverter = createEncryptedConverter(['tldr', 'text', 'bulletPoints', 'actionItems', 'bullet_json', 'action_json', 'bullet_points', 'action_items', 'content']);
const sessionConverter = createEncryptedConverter(['title', 'content']);

async function decryptUserData(uid) {
    if (!uid || uid === 'default_user') {
        logItem('[Migration] Skipping decryption migration: no real Firebase user.');
        return;
    }

    logItem(`\n\n[Migration] === Starting decryption migration for user: ${uid} ===`);
    const db = getFirestoreInstance();

    try {
        // 1. Sessions
        const sessionsRef = collection(db, `users/${uid}/sessions`).withConverter(sessionConverter);
        const sessionsSnap = await getDocs(sessionsRef);
        logItem(`[Migration] Found ${sessionsSnap.size} sessions.`);

        for (const sessionDoc of sessionsSnap.docs) {
            const sessionData = sessionDoc.data();
            const sessionId = sessionDoc.id;
            logItem(`[Migration] Decrypting session ${sessionId}...`);

            // Rewrite session (saves as plaintext now because of our converter change)
            await setDoc(sessionDoc.ref, sessionData);

            // 2. Transcripts
            const transcriptsRef = collection(db, `users/${uid}/sessions/${sessionId}/transcripts`).withConverter(transcriptConverter);
            const transcriptsSnap = await getDocs(transcriptsRef);
            for (const msgDoc of transcriptsSnap.docs) {
                await setDoc(msgDoc.ref, msgDoc.data());
            }

            // 3. AI Messages (snake_case)
            const aiMessagesRef = collection(db, `users/${uid}/sessions/${sessionId}/ai_messages`).withConverter(aiMessageConverter);
            const aiMessagesSnap = await getDocs(aiMessagesRef);
            for (const msgDoc of aiMessagesSnap.docs) {
                await setDoc(msgDoc.ref, msgDoc.data());
            }

            // 4. Summary
            const summaryRef = collection(db, `users/${uid}/sessions/${sessionId}/summary`).withConverter(summaryConverter);
            const summarySnap = await getDocs(summaryRef);
            for (const sumDoc of summarySnap.docs) {
                let data = sumDoc.data();
                const sumId = sumDoc.id;
                logItem(`[Migration] Decrypting summary doc: ${sumId}...`);

                // Map old/encrypted fields to fields the web app expects (both formats for safety)
                if (data.bullet_json && !data.bulletPoints) data.bulletPoints = data.bullet_json;
                if (data.action_json && !data.actionItems) data.actionItems = data.action_json;
                if (data.bullet_points && !data.bulletPoints) data.bulletPoints = data.bullet_points;
                if (data.action_items && !data.actionItems) data.actionItems = data.action_items;

                // Also ensure the original fields are now plaintext
                // (Already handled by the converter when we do setDoc)
                await setDoc(sumDoc.ref, data);
            }
        }

        logItem(`[Migration] Decryption migration completed successfully!`);
    } catch (e) {
        logItem(`[Migration] Error during decryption: ${e.message}\n${e.stack}`);
    }
}

module.exports = { decryptUserData };

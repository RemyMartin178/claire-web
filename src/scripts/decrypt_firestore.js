const { getFirestoreInstance } = require('../common/services/firebaseClient');
const { collection, getDocs, setDoc } = require('firebase/firestore');
const { createEncryptedConverter } = require('../common/repositories/firestoreConverter');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../migration_progress.log');
function logItem(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

const transcriptConverter = createEncryptedConverter(['text']);
const aiMessageConverter = createEncryptedConverter(['content']);
const summaryConverter = createEncryptedConverter(['tldr', 'bulletPoints', 'actionItems', 'prompt', 'text']);
const sessionConverter = createEncryptedConverter(['title']);

async function decryptUserData(uid) {
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

            // 3b. AI Messages (camelCase fallback)
            const aiMessagesLegacyRef = collection(db, `users/${uid}/sessions/${sessionId}/aiMessages`).withConverter(aiMessageConverter);
            const aiMessagesLegacySnap = await getDocs(aiMessagesLegacyRef);
            for (const msgDoc of aiMessagesLegacySnap.docs) {
                await setDoc(msgDoc.ref, msgDoc.data());
            }

            // 4. Summary
            const summaryRef = collection(db, `users/${uid}/sessions/${sessionId}/summary`).withConverter(summaryConverter);
            const summarySnap = await getDocs(summaryRef);
            for (const sumDoc of summarySnap.docs) {
                await setDoc(sumDoc.ref, sumDoc.data());
            }
        }

        logItem(`[Migration] Decryption migration completed successfully!`);
    } catch (e) {
        logItem(`[Migration] Error during decryption: ${e.message}\n${e.stack}`);
    }
}

module.exports = { decryptUserData };

const admin = require('firebase-admin');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('✅ ENV loaded. Project ID:', process.env.FIREBASE_PROJECT_ID);

if (!admin.apps.length) {
    const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "dedale-database",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_EMAIL
            ? `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
            : undefined
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
    });
}

const db = admin.firestore();

async function clearSessions() {
    const targetEmail = 'pantherg719@gmail.com';

    console.log(`🔍 Finding user with email: ${targetEmail}`);
    const usersSnapshot = await db.collection('users').where('email', '==', targetEmail).limit(1).get();

    if (usersSnapshot.empty) {
        console.error(`❌ User not found with email: ${targetEmail}`);
        process.exit(1);
    }

    const uid = usersSnapshot.docs[0].id;
    console.log(`✅ Found UID: ${uid}`);

    const sessionsRef = db.collection('users').doc(uid).collection('sessions');
    const sessionsSnapshot = await sessionsRef.get();

    if (sessionsSnapshot.empty) {
        console.log('ℹ️ No sessions found to delete.');
    } else {
        console.log(`🗑️ Deleting ${sessionsSnapshot.size} sessions...`);
        const batch = db.batch();
        
        for (const sessionDoc of sessionsSnapshot.docs) {
            const sessionId = sessionDoc.id;
            
            // Delete subcollections first
            const transcripts = await sessionsRef.doc(sessionId).collection('transcripts').get();
            transcripts.forEach(d => batch.delete(d.ref));
            
            const aiMessages = await sessionsRef.doc(sessionId).collection('ai_messages').get();
            aiMessages.forEach(d => batch.delete(d.ref));
            
            const summaryData = await sessionsRef.doc(sessionId).collection('summary').get();
            summaryData.forEach(d => batch.delete(d.ref));

            batch.delete(sessionDoc.ref);
        }

        await batch.commit();
        console.log('✅ All sessions and related data deleted.');
    }

    process.exit(0);
}

clearSessions().catch(err => {
    console.error(err);
    process.exit(1);
});

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK once per process
let isInitialized = false;
function initFirebaseAdmin() {
	if (isInitialized) return admin;
	try {
		if (admin.apps.length === 0) {
			let credential;
			
			// Try to load credentials from environment variables
			if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
				console.log('[Firebase Admin] Using GOOGLE_APPLICATION_CREDENTIALS_JSON');
				const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
				credential = admin.credential.cert(serviceAccount);
			} else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
				console.log('[Firebase Admin] Using individual Firebase env vars');
				credential = admin.credential.cert({
					projectId: process.env.FIREBASE_PROJECT_ID,
					clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
					privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
				});
			} else {
				console.log('[Firebase Admin] Using Application Default Credentials');
				credential = admin.credential.applicationDefault();
			}
			
			admin.initializeApp({
				credential: credential,
				projectId: process.env.FIREBASE_PROJECT_ID || 'dedale-database'
			});
			
			console.log('[Firebase Admin] ✅ Initialized successfully');
		}
		isInitialized = true;
		return admin;
	} catch (err) {
		console.error('[Firebase Admin] ❌ Failed to initialize:', err.message);
		throw err;
	}
}

module.exports = { initFirebaseAdmin };



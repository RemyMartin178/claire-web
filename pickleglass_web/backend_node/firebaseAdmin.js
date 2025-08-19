const admin = require('firebase-admin');

// Initialize Firebase Admin SDK once per process
let isInitialized = false;
function initFirebaseAdmin() {
	if (isInitialized) return admin;
	try {
		if (admin.apps.length === 0) {
			admin.initializeApp({
				// Prefer Application Default Credentials; set GOOGLE_APPLICATION_CREDENTIALS in env for prod
				credential: admin.credential.applicationDefault(),
			});
		}
		isInitialized = true;
		return admin;
	} catch (err) {
		console.error('[Auth] Failed to initialize Firebase Admin SDK:', err.message);
		throw err;
	}
}

module.exports = { initFirebaseAdmin };



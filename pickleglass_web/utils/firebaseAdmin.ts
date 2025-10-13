import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK only if credentials are available
let adminAuth: ReturnType<typeof getAuth> | null = null;

if (!getApps().length) {
  // Use environment variables for Firebase Admin
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
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
  };

  // Only initialize if we have the required credentials
  if (serviceAccount.private_key && serviceAccount.client_email) {
    initializeApp({
      credential: cert(serviceAccount as any),
      projectId: serviceAccount.project_id,
    });
    adminAuth = getAuth();
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('Firebase Admin credentials not found - admin features will be disabled');
  }
} else {
  adminAuth = getAuth();
}

export const auth = adminAuth as ReturnType<typeof getAuth>;

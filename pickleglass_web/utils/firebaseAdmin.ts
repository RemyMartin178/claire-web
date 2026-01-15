import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK only if credentials are available
let adminAuth: ReturnType<typeof getAuth> | null = null;

const initFirebaseAdminIfNeeded = () => {
  if (getApps().length) {
    adminAuth = getAuth();
    auth = adminAuth as ReturnType<typeof getAuth>;
    return;
  }

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

  const hasKey = !!serviceAccount.private_key && serviceAccount.private_key.includes('BEGIN PRIVATE KEY');
  const hasEmail = !!serviceAccount.client_email;
  const hasProject = !!serviceAccount.project_id;

  console.log('Admin creds check:', {
    hasKey,
    hasEmail,
    hasProject,
    appsCount: getApps().length,
    projectId: serviceAccount.project_id,
    keyLen: serviceAccount.private_key?.length || 0,
    emailDomainOk: hasEmail ? serviceAccount.client_email!.endsWith('@dedale-database.iam.gserviceaccount.com') : false
  });

  if (!hasKey || !hasEmail || !hasProject) {
    console.error('Firebase Admin credentials missing/invalid');
    adminAuth = null;
    auth = adminAuth as any;
    return;
  }

  try {
    initializeApp({
      credential: cert(serviceAccount as any),
      projectId: serviceAccount.project_id,
    });
    adminAuth = getAuth();
    auth = adminAuth as ReturnType<typeof getAuth>;
    console.log('Firebase Admin initialized successfully');
  } catch (e) {
    console.error('Firebase Admin init failed:', e);
    adminAuth = null;
    auth = adminAuth as any;
  }
}

// Export a live binding so late init updates are visible to importers
export let auth: ReturnType<typeof getAuth> | null = adminAuth;

export const ensureFirebaseAdminInitialized = () => {
  initFirebaseAdminIfNeeded();
  return auth;
}

// Best-effort init on module load
initFirebaseAdminIfNeeded();

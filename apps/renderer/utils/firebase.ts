"use client"

// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDZz5iEcMo6eBpt5cZ4Hz4TaE4aDiWMqho',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'auth.clairia.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dedale-database',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'dedale-database.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '100635676468',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:100635676468:web:46fdecfad3133fef4b5f61',
}

const isConfigValid = !!(firebaseConfig.apiKey &&
                       firebaseConfig.authDomain &&
                       firebaseConfig.projectId &&
                       firebaseConfig.storageBucket &&
                       firebaseConfig.messagingSenderId &&
                       firebaseConfig.appId)

if (!isConfigValid) {
  console.error('❌ Firebase configuration is invalid - missing required values')
}

// Initialize Firebase only if not already initialized
let app: any = null
let auth: any = null
let db: any = null

if (typeof window !== 'undefined') {
  // Only initialize on client side
  if (!getApps().length) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }

  auth = getAuth(app)
  db = getFirestore(app)
}

export { auth, db }
export default app

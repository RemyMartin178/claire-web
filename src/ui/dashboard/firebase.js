import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDZz5iEcMo6eBpt5cZ4Hz4TaE4aDiWMqho',
  authDomain: 'auth.clairia.app',
  projectId: 'dedale-database',
  storageBucket: 'dedale-database.firebasestorage.app',
  messagingSenderId: '100635676468',
  appId: '1:100635676468:web:46fdecfad3133fef4b5f61',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export default app

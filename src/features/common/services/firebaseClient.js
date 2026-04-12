const { initializeApp } = require('firebase/app');
const { initializeAuth } = require('firebase/auth');
const Store = require('electron-store');
const { getFirestore, setLogLevel } = require('firebase/firestore');

// setLogLevel('debug');

/**
 * Firebase Auth expects the `persistence` option passed to `initializeAuth()` to be *classes*,
 * not instances. It then calls `new PersistenceClass()` internally.  
 *
 * The helper below returns such a class, pre-configured with an `electron-store` instance that
 * will be shared across all constructed objects. This mirrors the pattern used by Firebase's own
 * `browserLocalPersistence` implementation as well as community solutions for NodeJS.
 */
function createElectronStorePersistence(storeName = 'firebase-auth-session') {
    // Create a single `electron-store` behind the scenes – all Persistence instances will use it.
    const sharedStore = new Store({ name: storeName });

    return class ElectronStorePersistence {
        constructor() {
            this.store = sharedStore;
            this.type = 'LOCAL';
        }

        /**
         * Firebase calls this to check whether the persistence is usable in the current context.
         */
        _isAvailable() {
            return Promise.resolve(true);
        }

        async _set(key, value) {
            this.store.set(key, value);
        }

        async _get(key) {
            return this.store.get(key) ?? null;
        }

        async _remove(key) {
            this.store.delete(key);
        }

        /**
         * These are used by Firebase to react to external storage events (e.g. multi-tab).
         * Electron apps are single-renderer per process, so we can safely provide no-op
         * implementations.
         */
        _addListener(_key, _listener) {
            // no-op
        }

        _removeListener(_key, _listener) {
            // no-op
        }
    };
}

const firebaseConfig = {
    apiKey: 'AIzaSyDZz5iEcMo6eBpt5cZ4Hz4TaE4aDiWMqho',
    authDomain: 'auth.clairia.app',
    projectId: 'dedale-database',
    storageBucket: 'dedale-database.firebasestorage.app',
    messagingSenderId: '100635676468',
    appId: '1:100635676468:web:46fdecfad3133fef4b5f61',
};

let firebaseApp = null;
let firebaseAuth = null;
let firestoreInstance = null; // To hold the specific DB instance

function initializeFirebase() {
    if (firebaseApp) {
        console.log('[FirebaseClient] Firebase already initialized.');
        return;
    }
    try {
        firebaseApp = initializeApp(firebaseConfig);
        
        // Build a *class* persistence provider and hand it to Firebase.
        const ElectronStorePersistence = createElectronStorePersistence('firebase-auth-session');

        firebaseAuth = initializeAuth(firebaseApp, {
            // `initializeAuth` accepts a single class or an array – we pass an array for future
            // extensibility and to match Firebase examples.
            persistence: [ElectronStorePersistence],
        });

        // Initialize Firestore (default DB for dedale-database)
        firestoreInstance = getFirestore(firebaseApp);

        console.log('[FirebaseClient] Firebase initialized for dedale-database with electron-store persistence.');
    } catch (error) {
        console.error('[FirebaseClient] Firebase initialization failed:', error);
    }
}

function getFirebaseAuth() {
    if (!firebaseAuth) {
        throw new Error("Firebase Auth has not been initialized. Call initializeFirebase() first.");
    }
    return firebaseAuth;
}

function getFirestoreInstance() {
    if (!firestoreInstance) {
        throw new Error("Firestore has not been initialized. Call initializeFirebase() first.");
    }
    return firestoreInstance;
}

module.exports = {
    initializeFirebase,
    getFirebaseAuth,
    getFirestoreInstance,
}; 
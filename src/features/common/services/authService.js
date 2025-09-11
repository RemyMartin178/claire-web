const { onAuthStateChanged, signInWithCustomToken, signOut, setPersistence, browserLocalPersistence } = require('firebase/auth');
const { BrowserWindow, shell } = require('electron');
const { getFirebaseAuth } = require('./firebaseClient');
const fetch = require('node-fetch');
const encryptionService = require('./encryptionService');
const migrationService = require('./migrationService');
const sessionRepository = require('../repositories/session');
const providerSettingsRepository = require('../repositories/providerSettings');

class AuthService {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('[AuthService] Initializing Firebase persistence...');
            const auth = getFirebaseAuth();

            // Configurer la persistance pour 4-5 jours (browserLocalPersistence garde la session)
            await setPersistence(auth, browserLocalPersistence);
            console.log('[AuthService] Firebase persistence configured for 4-5 days');

            // Écouter les changements d'état d'authentification
            onAuthStateChanged(auth, (user) => {
                console.log('[AuthService] Auth state changed:', user ? 'LOGGED_IN' : 'LOGGED_OUT');
                this.currentUser = user;

                if (user) {
                    console.log('[AuthService] User authenticated:', user.email);
                }

                // Diffuser le changement d'état
                this.broadcastUserState();
            });

            this.initialized = true;
            console.log('[AuthService] AuthService initialized successfully');
        } catch (error) {
            console.error('[AuthService] Error initializing AuthService:', error);
        }
    }

    async signInWithCustomToken(token) {
        const auth = getFirebaseAuth();
        try {
            const userCredential = await signInWithCustomToken(auth, token);
            console.log('[AuthService] User signed in with custom token:', userCredential.user.email);
            return userCredential;
        } catch (error) {
            console.error('[AuthService] Error signing in with custom token:', error);
            throw error;
        }
    }

    async signOut() {
        const auth = getFirebaseAuth();
        try {
            // Nettoyer complètement les données utilisateur
            console.log('[AuthService] Starting complete user data cleanup...');

            // Nettoyer le cache local
            await this.clearLocalCache();

            // Déconnexion Firebase
            await signOut(auth);
            console.log('[AuthService] User sign-out and complete cleanup successful.');
        } catch (error) {
            console.error('[AuthService] Error during sign out:', error);
        }

        // Forcer la mise à jour de l'état même si Firebase échoue
        setTimeout(() => {
            this.broadcastUserState({ isLoggedIn: false });
        }, 100);
    }

    async clearLocalCache() {
        try {
            console.log('[AuthService] Clearing local cache...');

            // Nettoyer les données locales si nécessaire
            if (typeof window !== 'undefined' && window.localStorage) {
                // Nettoyer les clés liées à l'utilisateur
                const keysToRemove = [];
                for (let i = 0; i < window.localStorage.length; i++) {
                    const key = window.localStorage.key(i);
                    if (key && (key.includes('firebase') || key.includes('auth') || key.includes('user'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => {
                    console.log(`[AuthService] Removing localStorage key: ${key}`);
                    window.localStorage.removeItem(key);
                });
            }

            // Nettoyer sessionStorage aussi
            if (typeof window !== 'undefined' && window.sessionStorage) {
                const sessionKeysToRemove = [];
                for (let i = 0; i < window.sessionStorage.length; i++) {
                    const key = window.sessionStorage.key(i);
                    if (key && (key.includes('firebase') || key.includes('auth') || key.includes('user'))) {
                        sessionKeysToRemove.push(key);
                    }
                }
                sessionKeysToRemove.forEach(key => {
                    console.log(`[AuthService] Removing sessionStorage key: ${key}`);
                    window.sessionStorage.removeItem(key);
                });
            }

            console.log('[AuthService] Local cache cleared successfully');
        } catch (error) {
            console.error('[AuthService] Error clearing local cache:', error);
        }
    }

    broadcastUserState(previousState = null) {
        const userState = this.getCurrentUser();
        console.log('[AuthService] Broadcasting user state change:', userState);

        // Déclencher les animations appropriées
        if (userState.isLoggedIn && (!previousState || !previousState.isLoggedIn)) {
            console.log('[AuthService] Triggering header appearance animation');
            this.triggerHeaderAppearanceAnimation();
        } else if (!userState.isLoggedIn && previousState && previousState.isLoggedIn) {
            console.log('[AuthService] Triggering header disappearance animation');
            this.triggerHeaderDisappearanceAnimation();
        }

        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                win.webContents.send('user-state-changed', userState);
            }
        });
    }

    getCurrentUser() {
        const user = this.currentUser;
        return {
            isLoggedIn: !!user,
            email: user?.email || null,
            uid: user?.uid || null,
            displayName: user?.displayName || null,
            photoURL: user?.photoURL || null,
            // Ajouter des informations supplémentaires pour une meilleure synchronisation
            firstName: user?.displayName?.split(' ')[0] || null,
            lastName: user?.displayName?.split(' ').slice(1).join(' ') || null,
        };
    }

    getCurrentUserId() {
        return this.currentUser?.uid || null;
    }

    triggerHeaderAppearanceAnimation() {
        const headerWindow = BrowserWindow.getAllWindows().find(win =>
            win.getTitle().includes('header') || win.getTitle().includes('Header')
        );

        if (headerWindow) {
            headerWindow.webContents.executeJavaScript(`
                document.documentElement.classList.add('appearing');
                setTimeout(() => {
                    document.documentElement.classList.remove('appearing');
                }, 600);
            `).catch(err => console.log('[Animation] Header appearance animation triggered'));
        }
    }

    triggerHeaderDisappearanceAnimation() {
        const headerWindow = BrowserWindow.getAllWindows().find(win =>
            win.getTitle().includes('header') || win.getTitle().includes('Header')
        );

        if (headerWindow) {
            headerWindow.webContents.executeJavaScript(`
                document.documentElement.classList.add('disconnecting');
                setTimeout(() => {
                    document.documentElement.classList.remove('disconnecting');
                }, 400);
            `).catch(err => console.log('[Animation] Header disappearance animation triggered'));
        }
    }
}

// Créer et exporter une instance unique
const authServiceInstance = new AuthService();

// Initialiser automatiquement lors de l'import
authServiceInstance.initialize().catch(error => {
    console.error('[AuthService] Failed to initialize:', error);
});

module.exports = authServiceInstance;

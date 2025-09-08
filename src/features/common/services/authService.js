const { onAuthStateChanged, signInWithCustomToken, signOut } = require('firebase/auth');
const { BrowserWindow, shell } = require('electron');
const { getFirebaseAuth } = require('./firebaseClient');
const fetch = require('node-fetch');
const encryptionService = require('./encryptionService');
const migrationService = require('./migrationService');
const sessionRepository = require('../repositories/session');
const providerSettingsRepository = require('../repositories/providerSettings');
const permissionService = require('./permissionService');

async function getVirtualKeyByEmail(email, idToken) {
    if (!idToken) {
        throw new Error('Firebase ID token is required for virtual key request');
    }

    const resp = await fetch('https://serverless-api-sf3o.vercel.app/api/virtual_key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        redirect: 'follow',
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        console.error('[VK] API request failed:', json.message || 'Unknown error');
        throw new Error(json.message || `HTTP ${resp.status}: Virtual key request failed`);
    }

    const vKey = json?.data?.virtualKey || json?.data?.virtual_key || json?.data?.newVKey?.slug;

    if (!vKey) throw new Error('virtual key missing in response');
    return vKey;
}

class AuthService {
    constructor() {
        this.currentUserId = 'default_user';
        this.currentUserMode = 'local'; // 'local' or 'firebase'
        this.currentUser = null;
        this.isInitialized = false;

        // This ensures the key is ready before any login/logout state change.
        this.initializationPromise = null;

        sessionRepository.setAuthService(this);
    }

    initialize() {
        if (this.isInitialized) return this.initializationPromise;

        this.initializationPromise = new Promise((resolve) => {
            const auth = getFirebaseAuth();
            onAuthStateChanged(auth, async (user) => {
                try {
                    console.log('[authService] onAuthStateChanged user=', !!user, 'uid=', user ? user.uid : undefined);
                } catch {}
                const previousUser = this.currentUser;
                const previousState = this.getCurrentUser();

                if (user) {
                    // User signed IN
                    console.log(`[AuthService] Firebase user signed in:`, user.uid);
                    this.currentUser = user;
                    this.currentUserId = user.uid;
                    this.currentUserMode = 'firebase';

                    // Clean up any zombie sessions from a previous run for this user.
                    await sessionRepository.endAllActiveSessions();

                    // ** Initialize encryption key for the logged-in user if permissions are already granted **
                    if (process.platform === 'darwin' && !(await permissionService.checkKeychainCompleted(this.currentUserId))) {
                        console.warn('[AuthService] Keychain permission not yet completed for this user. Deferring key initialization.');
                    } else {
                        await encryptionService.initializeKey(user.uid);
                    }

                    // ** Check for and run data migration for the user **
                    // No 'await' here, so it runs in the background without blocking startup.
                    migrationService.checkAndRunMigration(user);

                    // ***** CRITICAL: Wait for the virtual key and model state update to complete *****
                    try {
                        const idToken = await user.getIdToken(true);
                        const virtualKey = await getVirtualKeyByEmail(user.email, idToken);

                        if (global.modelStateService) {
                            // The model state service now writes directly to the DB, no in-memory state.
                            await global.modelStateService.setFirebaseVirtualKey(virtualKey);
                        }
                        console.log(`[AuthService] Virtual key for ${user.email} has been processed and state updated.`);

                    } catch (error) {
                        console.error('[AuthService] Failed to fetch or save virtual key:', error);
                        // This is not critical enough to halt the login, but we should log it.
                    }

                } else {
                    // User signed OUT
                    console.log(`[AuthService] No Firebase user.`);
                    if (previousUser) {
                        console.log(`[AuthService] Clearing API key for logged-out user: ${previousUser.uid}`);
                        if (global.modelStateService) {
                            // The model state service now writes directly to the DB.
                            await global.modelStateService.setFirebaseVirtualKey(null);
                        }
                    }
                    this.currentUser = null;
                    this.currentUserId = 'default_user';
                    this.currentUserMode = 'local';

                    // End active sessions for the local/default user as well.
                    await sessionRepository.endAllActiveSessions();

                    encryptionService.resetSessionKey();
                }
                this.broadcastUserState(previousState);
                
                if (!this.isInitialized) {
                    this.isInitialized = true;
                    console.log('[AuthService] Initialized and resolved initialization promise.');
                    resolve();
                }
            });
        });

        return this.initializationPromise;
    }

    async startFirebaseAuthFlow() {
        try {
            // Utiliser la même logique que openLoginPage pour éviter les conflits
            const webUrl = process.env.NODE_ENV === 'development'
                ? 'http://localhost:3000'
                : 'https://app.clairia.app';
            const authUrl = `${webUrl}/login?mode=electron`;
            console.log(`[AuthService] Opening Firebase auth URL in browser: ${authUrl}`);
            await shell.openExternal(authUrl);
            return { success: true };
        } catch (error) {
            console.error('[AuthService] Failed to open Firebase auth URL:', error);
            return { success: false, error: error.message };
        }
    }

    async signInWithCustomToken(token) {
        const auth = getFirebaseAuth();
        try {
            const userCredential = await signInWithCustomToken(auth, token);
            console.log(`[AuthService] Successfully signed in with custom token for user:`, userCredential.user.uid);
            // onAuthStateChanged will handle the state update and broadcast
        } catch (error) {
            console.error('[AuthService] Error signing in with custom token:', error);
            throw error; // Re-throw to be handled by the caller
        }
    }

    async signOut() {
        const auth = getFirebaseAuth();
        try {
            // End all active sessions for the current user BEFORE signing out.
            await sessionRepository.endAllActiveSessions();

            await signOut(auth);
            console.log('[AuthService] User sign-out initiated successfully.');
            // onAuthStateChanged will handle the state update and broadcast,
            // which will also re-evaluate the API key status.
        } catch (error) {
            console.error('[AuthService] Error signing out:', error);
        }
    }
    
    broadcastUserState(previousState = null) {
        const userState = this.getCurrentUser();
        console.log('[AuthService] Broadcasting user state change:', userState);

        // Déclencher les animations appropriées
        if (userState.isLoggedIn && (!previousState || !previousState.isLoggedIn)) {
            // Animation d'apparition lors de la connexion
            console.log('[AuthService] Triggering header appearance animation');
            this.triggerHeaderAppearanceAnimation();
        } else if (!userState.isLoggedIn && previousState && previousState.isLoggedIn) {
            // Animation de disparition lors de la déconnexion
            console.log('[AuthService] Triggering header disappearance animation');
            this.triggerHeaderDisappearanceAnimation();
        }

        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                win.webContents.send('user-state-changed', userState);
            }
        });
    }

    // Méthodes pour déclencher les animations
    triggerHeaderAppearanceAnimation() {
        const { BrowserWindow } = require('electron');
        const headerWindow = BrowserWindow.getAllWindows().find(win =>
            win.getTitle().includes('header') || win.getTitle().includes('Header')
        );

        if (headerWindow) {
            // Ajouter la classe CSS pour l'animation
            headerWindow.webContents.executeJavaScript(`
                document.documentElement.classList.add('appearing');
                setTimeout(() => {
                    document.documentElement.classList.remove('appearing');
                }, 600);
            `).catch(err => console.log('[Animation] Header appearance animation triggered'));

            // Utiliser le SmoothMovementManager pour l'animation
            try {
                const smoothMovementManager = require('../../../window/smoothMovementManager');
                if (smoothMovementManager.default) {
                    const manager = new smoothMovementManager.default([headerWindow]);
                    manager.animateHeaderAppearance(headerWindow, {
                        duration: 600,
                        onComplete: () => console.log('[Animation] Header appearance completed')
                    });
                }
            } catch (error) {
                console.log('[Animation] Could not use SmoothMovementManager for appearance animation');
            }
        }
    }

    triggerHeaderDisappearanceAnimation() {
        const { BrowserWindow } = require('electron');
        const headerWindow = BrowserWindow.getAllWindows().find(win =>
            win.getTitle().includes('header') || win.getTitle().includes('Header')
        );

        if (headerWindow) {
            // Ajouter la classe CSS pour l'animation
            headerWindow.webContents.executeJavaScript(`
                document.documentElement.classList.add('disconnecting');
                setTimeout(() => {
                    document.documentElement.classList.remove('disconnecting');
                }, 400);
            `).catch(err => console.log('[Animation] Header disappearance animation triggered'));

            // Utiliser le SmoothMovementManager pour l'animation
            try {
                const smoothMovementManager = require('../../../window/smoothMovementManager');
                if (smoothMovementManager.default) {
                    const manager = new smoothMovementManager.default([headerWindow]);
                    manager.animateHeaderDisappearance(headerWindow, {
                        duration: 400,
                        onComplete: () => console.log('[Animation] Header disappearance completed')
                    });
                }
            } catch (error) {
                console.log('[Animation] Could not use SmoothMovementManager for disappearance animation');
            }
        }
    }

    getCurrentUserId() {
        return this.currentUserId;
    }

    getCurrentUser() {
        const isLoggedIn = !!(this.currentUserMode === 'firebase' && this.currentUser);

        if (isLoggedIn) {
            return {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                displayName: this.currentUser.displayName,
                mode: 'firebase',
                isLoggedIn: true,
                //////// before_modelStateService ////////
                // hasApiKey: this.hasApiKey // Always true for firebase users, but good practice
                //////// before_modelStateService ////////
            };
        }
        return {
            uid: this.currentUserId, // returns 'default_user'
            email: 'contact@pickle.com',
            displayName: 'Default User',
            mode: 'local',
            isLoggedIn: false,
            //////// before_modelStateService ////////
            // hasApiKey: this.hasApiKey
            //////// before_modelStateService ////////
        };
    }
}

const authService = new AuthService();
module.exports = authService; 
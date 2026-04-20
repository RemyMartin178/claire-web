const { onAuthStateChanged, signInWithCustomToken, signOut } = require('firebase/auth');
const { BrowserWindow, shell, app } = require('electron');
const { getFirebaseAuth } = require('./firebaseClient');
const fetch = require('node-fetch');
const crypto = require('crypto');
const encryptionService = require('./encryptionService');
const migrationService = require('./migrationService');
const sessionRepository = require('../repositories/session');
const providerSettingsRepository = require('../repositories/providerSettings');
const userModelSelectionsRepository = require('../repositories/userModelSelections');
const { createLogger } = require('./logger.js');
const { resourcePoolManager } = require('./resource-pool-manager.js');

const logger = createLogger('AuthService');
const DEFAULT_WEB_APP_URL = 'https://app.clairia.app';
const DASHBOARD_CUSTOM_TOKEN_TTL_MS = 50 * 60 * 1000;

// CSRF state storage: maps sessionId -> expected state token
const pendingAuthStates = new Map();


class AuthService {
    constructor() {
        this.currentUserId = 'default_user';
        this.currentUserMode = 'local'; // 'local' or 'firebase'
        this.currentUser = null;
        this.isInitialized = false;
        this.authPollingInterval = null;
        this.isFirebaseClientReady = false; // Track Firebase client readiness
        this._stateChangeCallbacks = [];
        this._lastCustomToken = null;
        this._lastCustomTokenAt = 0;
        this._lastDashboardReloadAt = 0;

        // This ensures the key is ready before any login/logout state change.
        encryptionService.initializeKey(this.currentUserId);
        this.initializationPromise = null;

        sessionRepository.setAuthService(this);
        providerSettingsRepository.setAuthService(this);
        userModelSelectionsRepository.setAuthService(this);
    }

    onUserStateChanged(cb) {
        this._stateChangeCallbacks.push(cb);
    }

    async initialize() {
        if (this.isInitialized) return this.initializationPromise;

        this.initializationPromise = new Promise(async (resolve) => {
            // Initialize Firebase client FIRST
            const { initializeFirebase } = require('./firebaseClient');
            await initializeFirebase();
            logger.info('[AuthService] Firebase client initialized');

            const auth = getFirebaseAuth();
            let resolved = false;

            // Add timeout to prevent infinite hang when Firebase is inaccessible
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    logger.warn('[AuthService] Firebase initialization timeout - continuing in local mode');

                    // Set up local/guest mode
                    this.currentUser = null;
                    this.currentUserId = 'default_user';
                    this.currentUserMode = 'local';
                    this.isFirebaseClientReady = false;

                    // Initialize encryption for local user
                    encryptionService.initializeKey(this.currentUserId).then(() => {
                        this.broadcastUserState();
                        this.isInitialized = true;
                        logger.info('[AuthService] Initialized in local mode after timeout.');
                        resolve();
                    }).catch((error) => {
                        logger.error('[AuthService] Error initializing encryption in timeout fallback:', { error });
                        this.isInitialized = true;
                        resolve();
                    });
                }
            }, 2000); // 2 second timeout - faster startup

            onAuthStateChanged(auth, async (user) => {
                const previousUser = this.currentUser;

                if (user) {
                    // User signed IN
                    logger.info('Firebase user signed in:', { uid: user.uid });
                    this.currentUser = user;
                    this.currentUserId = user.uid;
                    this.currentUserMode = 'firebase';
                    this.isFirebaseClientReady = true; // Mark Firebase client as ready

                    // Clean up any zombie sessions from a previous run for this user (non-blocking)
                    try {
                        await sessionRepository.endAllActiveSessions();
                        logger.info('[AuthService] Sessions cleaned up');
                    } catch (sessionError) {
                        logger.warn('[AuthService] Session cleanup failed (non-critical):', sessionError.message);
                    }

                    // ** Initialize encryption key for the logged-in user **
                    await encryptionService.initializeKey(user.uid);

                    // --- DECRYPTION MIGRATION INJECTION ---
                    try {
                        logger.info(`[AuthService] Running decryption migration for UID: ${user.uid}`);
                        const { decryptUserData } = require('../../scripts/decrypt_firestore');
                        decryptUserData(user.uid); // run async in background
                    } catch (e) {
                        logger.error('[AuthService] Decryption migration failed to start:', e);
                    }
                    // --------------------------------------

                    // ** Check for and run data migration for the user **
                    // No 'await' here, so it runs in the background without blocking startup.
                    migrationService.checkAndRunMigration(user);

                    // ** Preload user subscription in the background **
                    // This ensures the first Ask request doesn't have to wait 3-4 seconds
                    try {
                        const subscriptionService = require('./subscriptionService');
                        subscriptionService.getUserSubscription().then(() => {
                            logger.info('[AuthService] Subscription preloaded successfully');
                        }).catch(err => {
                            logger.warn('[AuthService] Subscription preload failed (non-critical):', err.message);
                        });
                    } catch (subError) {
                        logger.warn('[AuthService] Subscription service not available:', subError.message);
                    }

                } else {
                    // User signed OUT
                    logger.info('No Firebase user.');
                    this.currentUser = null;
                    this.currentUserId = 'default_user';
                    this.currentUserMode = 'local';
                    this.isFirebaseClientReady = false; // Reset Firebase client readiness

                    // End active sessions for the local/default user as well (non-blocking)
                    try {
                        await sessionRepository.endAllActiveSessions();
                        logger.info('[AuthService] Local sessions cleaned up');
                    } catch (sessionError) {
                        logger.warn('[AuthService] Local session cleanup failed (non-critical):', sessionError.message);
                    }

                    // ** Initialize encryption key for the default/local user **
                    await encryptionService.initializeKey(this.currentUserId);
                }

                // ALWAYS broadcast user state changes, not just during initialization
                this.broadcastUserState();

                // Resolve initialization promise only once
                if (!this.isInitialized && !resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    this.isInitialized = true;
                    logger.info('[AuthService] Initialized and resolved initialization promise.');
                    resolve();
                }
            });
        });

        return this.initializationPromise;
    }

    async startFirebaseAuthFlow() {
        try {
            // Use production URL when packaged, localhost in dev
            const { app } = require('electron');
            const isPackaged = app.isPackaged;
            const webUrl = isPackaged
                ? 'https://app.clairia.app'
                : (process.env.pickleglass_WEB_URL || 'https://app.clairia.app');

            // Generate unique session ID before opening browser
            const sessionId = 'sess-' + Math.random().toString(36).slice(2, 15);
            logger.info('[Auth] Created session ID:', sessionId);

            // Generate CSRF state token and store it for later validation
            const state = crypto.randomBytes(16).toString('hex');
            pendingAuthStates.set(sessionId, state);
            logger.info('[Auth] CSRF state token generated for session:', sessionId);

            // Open login page with mobile flow, session ID and CSRF state
            const authUrl = `${webUrl}/auth/login?flow=mobile&session_id=${sessionId}&state=${state}`;
            logger.info('[Auth] Opening login page with mobile flow:', authUrl);
            await shell.openExternal(authUrl);
            logger.info('[Auth] Opened login URL - waiting for deeplink callback');

            return { success: true };
        } catch (error) {
            logger.error('[Auth] Failed to open login URL:', { error });
            return { success: false, error: error.message };
        }
    }

    /**
     * Validates the CSRF state token for a given session and removes it.
     * Returns true if the state matches, false otherwise.
     */
    validateAndConsumeState(sessionId, state) {
        // We validate that the sessionId was initiated by this app (exists in pendingAuthStates).
        // We do NOT compare the state string value because the web auth flow (Firebase/Google OAuth)
        // generates its own state token (e.g. "st-xxxx") instead of echoing back ours.
        // The session_id itself is unguessable and Firestore exchange is single-use + 2-min TTL.
        const exists = pendingAuthStates.has(sessionId);
        pendingAuthStates.delete(sessionId);
        if (!exists) {
            logger.warn('[Auth] CSRF state validation failed - unknown session:', sessionId);
            return false;
        }
        logger.info('[Auth] Session validated successfully:', sessionId);
        return true;
    }

    _getWebAppUrl() {
        return app.isPackaged
            ? DEFAULT_WEB_APP_URL
            : (process.env.pickleglass_WEB_URL || DEFAULT_WEB_APP_URL);
    }

    _getFirebaseConfig() {
        return {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDZz5iEcMo6eBpt5cZ4Hz4TaE4aDiWMqho',
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'auth.clairia.app',
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dedale-database',
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'dedale-database.appspot.com',
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '100635676468',
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:100635676468:web:46fdecfad3133fef4b5f61',
        };
    }

    _rememberCustomToken(token) {
        if (!token || typeof token !== 'string') return;
        this._lastCustomToken = token;
        this._lastCustomTokenAt = Date.now();
    }

    async _getDashboardWindow(targetWindow = null) {
        if (targetWindow && !targetWindow.isDestroyed()) {
            return targetWindow;
        }

        const windowManager = require('../../window/windowManager');
        return windowManager.getDashboardWindow();
    }

    async _waitForWindowLoad(win, timeoutMs = 10000) {
        if (!win || win.isDestroyed()) return false;

        const webContents = win.webContents;
        if (!webContents || webContents.isDestroyed()) return false;

        const isLoading = typeof webContents.isLoadingMainFrame === 'function'
            ? webContents.isLoadingMainFrame()
            : webContents.isLoading();

        if (!isLoading) return true;

        return new Promise((resolve) => {
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                webContents.removeListener('did-finish-load', onLoad);
                webContents.removeListener('did-fail-load', onFail);
                resolve(value);
            };
            const onLoad = () => finish(true);
            const onFail = (_event, _errorCode, _errorDescription, _validatedURL, isMainFrame) => {
                if (typeof isMainFrame === 'boolean' && !isMainFrame) return;
                finish(false);
            };
            const timer = setTimeout(() => finish(false), timeoutMs);

            webContents.once('did-finish-load', onLoad);
            webContents.once('did-fail-load', onFail);
        });
    }

    async _fetchFreshCustomTokenForDashboardSync() {
        if (!this.currentUser || typeof this.currentUser.getIdToken !== 'function') {
            logger.warn('[Auth] Cannot mint dashboard custom token without an authenticated Firebase user');
            return null;
        }

        const idToken = await this.currentUser.getIdToken();
        if (!idToken) {
            logger.warn('[Auth] getIdToken() returned an empty token during dashboard sync');
            return null;
        }

        const associateUrl = `${this._getWebAppUrl()}/api/mobile-auth/associate`;
        logger.info('[Auth] Minting fresh dashboard custom token via associate endpoint');

        const response = await fetch(associateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Dashboard associate failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const customToken = data.customToken || data.custom_token;
        if (!customToken) {
            throw new Error('Associate endpoint did not return a custom token');
        }

        this._rememberCustomToken(customToken);
        return customToken;
    }

    async _getCustomTokenForDashboardSync(explicitToken = null) {
        if (explicitToken) {
            this._rememberCustomToken(explicitToken);
            return explicitToken;
        }

        if (
            this._lastCustomToken &&
            (Date.now() - this._lastCustomTokenAt) < DASHBOARD_CUSTOM_TOKEN_TTL_MS
        ) {
            return this._lastCustomToken;
        }

        return this._fetchFreshCustomTokenForDashboardSync();
    }

    _buildDashboardAuthSyncScript({ action, customToken, expectedUid }) {
        return `
            (async () => {
                const action = ${JSON.stringify(action)};
                const config = ${JSON.stringify(this._getFirebaseConfig())};
                const customToken = ${JSON.stringify(customToken || null)};
                const expectedUid = ${JSON.stringify(expectedUid || null)};
                const syncState = {
                    action,
                    href: window.location.href,
                    origin: window.location.origin,
                    expectedUid,
                };

                try {
                    const [{ initializeApp, getApps, getApp }, authMod] = await Promise.all([
                        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
                        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
                    ]);
                    const {
                        browserLocalPersistence,
                        getAuth,
                        onAuthStateChanged,
                        setPersistence,
                        signInWithCustomToken,
                        signOut,
                    } = authMod;

                    const firebaseApp = getApps().length ? getApp() : initializeApp(config);
                    const auth = getAuth(firebaseApp);

                    if (typeof auth.authStateReady === 'function') {
                        await auth.authStateReady();
                    } else {
                        await new Promise((resolve) => {
                            let settled = false;
                            const finish = () => {
                                if (settled) return;
                                settled = true;
                                clearTimeout(timer);
                                resolve();
                            };
                            const timer = setTimeout(finish, 1500);
                            const unsub = onAuthStateChanged(auth, () => {
                                try { unsub(); } catch (_) {}
                                finish();
                            }, finish);
                        });
                    }

                    syncState.beforeUid = auth.currentUser ? auth.currentUser.uid : null;

                    if (action === 'signOut') {
                        if (auth.currentUser) {
                            await signOut(auth);
                            syncState.changed = true;
                        } else {
                            syncState.changed = false;
                        }
                        syncState.afterUid = auth.currentUser ? auth.currentUser.uid : null;
                        window.__CLAIRE_ELECTRON_DASHBOARD_AUTH_SYNC__ = syncState;
                        return { success: true, ...syncState };
                    }

                    await setPersistence(auth, browserLocalPersistence);

                    if (expectedUid && syncState.beforeUid === expectedUid) {
                        syncState.changed = false;
                        syncState.afterUid = syncState.beforeUid;
                        window.__CLAIRE_ELECTRON_DASHBOARD_AUTH_SYNC__ = syncState;
                        return { success: true, ...syncState };
                    }

                    if (!customToken) {
                        throw new Error('Missing custom token for dashboard auth sync');
                    }

                    const credential = await signInWithCustomToken(auth, customToken);
                    syncState.changed = syncState.beforeUid !== credential.user.uid;
                    syncState.afterUid = credential.user.uid;
                    syncState.email = credential.user.email || null;

                    window.__CLAIRE_ELECTRON_DASHBOARD_AUTH_SYNC__ = syncState;
                    window.dispatchEvent(new CustomEvent('claire-electron-auth-synced', { detail: syncState }));

                    return { success: true, ...syncState };
                } catch (error) {
                    syncState.error = error && error.message ? error.message : String(error);
                    syncState.stack = error && error.stack ? error.stack : null;
                    window.__CLAIRE_ELECTRON_DASHBOARD_AUTH_SYNC__ = syncState;
                    return { success: false, ...syncState };
                }
            })();
        `;
    }

    async syncDashboardBrowserAuth(options = {}) {
        const {
            action = 'signIn',
            customToken = null,
            reloadOnChange = false,
            reason = 'unspecified',
            targetWindow = null,
        } = options;

        const dashboardWindow = await this._getDashboardWindow(targetWindow);
        if (!dashboardWindow || dashboardWindow.isDestroyed()) {
            logger.info('[Auth] Dashboard auth sync skipped - dashboard window is unavailable');
            return { skipped: true, reason: 'no-dashboard-window' };
        }

        const loaded = await this._waitForWindowLoad(dashboardWindow);
        if (!loaded) {
            logger.warn('[Auth] Dashboard auth sync skipped - dashboard window did not finish loading in time');
            return { skipped: true, reason: 'dashboard-not-ready' };
        }

        let tokenForSync = null;
        const expectedUid = this.currentUser && this.currentUser.uid ? this.currentUser.uid : null;

        if (action === 'signIn') {
            tokenForSync = await this._getCustomTokenForDashboardSync(customToken);
            if (!tokenForSync) {
                logger.warn('[Auth] Dashboard auth sync skipped - no custom token available');
                return { skipped: true, reason: 'no-custom-token' };
            }
        }

        const result = await dashboardWindow.webContents.executeJavaScript(
            this._buildDashboardAuthSyncScript({
                action,
                customToken: tokenForSync,
                expectedUid,
            }),
            true
        );

        if (result && result.success) {
            logger.info('[Auth] Dashboard browser auth sync completed', {
                action,
                reason,
                beforeUid: result.beforeUid,
                afterUid: result.afterUid,
                changed: result.changed,
            });

            if (
                reloadOnChange &&
                action === 'signOut' &&
                result.changed &&
                (Date.now() - this._lastDashboardReloadAt) > 3000
            ) {
                // Sign-in must stay in the current page context so the remote dashboard
                // can react to Firebase auth listeners without being reset mid-flow.
                this._lastDashboardReloadAt = Date.now();
                logger.info('[Auth] Reloading dashboard after browser auth sync', { action, reason });
                dashboardWindow.webContents.reloadIgnoringCache();
            }

            return result;
        }

        logger.warn('[Auth] Dashboard browser auth sync failed', {
            action,
            reason,
            error: result && result.error ? result.error : 'unknown',
        });
        return result || { success: false, error: 'unknown dashboard auth sync failure' };
    }

    async handleDashboardDidFinishLoad(targetWindow = null) {
        const userState = this.getCurrentUser();

        if (!userState.isLoggedIn) {
            await this.syncDashboardBrowserAuth({
                action: 'signOut',
                reloadOnChange: true,
                reason: 'dashboard-load-no-user',
                targetWindow,
            });
            return;
        }

        await this.syncDashboardBrowserAuth({
            action: 'signIn',
            reason: 'dashboard-load-authenticated-user',
            targetWindow,
        });
    }

    startAuthPolling(webUrl) {
        if (this.authPollingInterval) {
            clearInterval(this.authPollingInterval);
        }

        logger.info('[Auth] Starting localStorage polling as fallback...');
        let pollAttempts = 0;
        const maxAttempts = 60; // Poll for 5 minutes (60 * 5s intervals)

        const pollForAuth = async () => {
            pollAttempts++;

            if (pollAttempts > maxAttempts) {
                logger.info('[Auth] Polling timeout - stopping auth polling');
                clearInterval(this.authPollingInterval);
                this.authPollingInterval = null;
                return;
            }

            try {
                // Use a hidden BrowserWindow to check localStorage
                const { BrowserWindow } = require('electron');
                const tempWindow = new BrowserWindow({
                    show: false,
                    icon: path.join(__dirname, '../../../build/icon.ico'),
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                });

                await tempWindow.loadURL(webUrl);

                const authResult = await tempWindow.webContents.executeJavaScript(`
                    localStorage.getItem('electron_auth_result')
                `);

                tempWindow.destroy();

                if (authResult) {
                    logger.info('[Auth] Found authentication result in localStorage fallback!');
                    clearInterval(this.authPollingInterval);
                    this.authPollingInterval = null;

                    const authData = JSON.parse(authResult);

                    // Clear the localStorage item
                    const clearWindow = new BrowserWindow({
                        show: false,
                        icon: path.join(__dirname, '../../../build/icon.ico'),
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true
                        }
                    });
                    await clearWindow.loadURL(webUrl);
                    await clearWindow.webContents.executeJavaScript(`
                        localStorage.removeItem('electron_auth_result')
                    `);
                    clearWindow.destroy();

                    // Process the authentication - handle ID token directly
                    await this.handleIdTokenAuthentication(authData);
                    logger.info('[Auth] Successfully processed authentication from localStorage fallback');
                }
            } catch (error) {
                logger.error('[Auth] Error during polling:', { error: error.message });
            }
        };

        // Check immediately first, then start interval
        pollForAuth();
        this.authPollingInterval = setInterval(pollForAuth, 5000); // Poll every 5 seconds
    }


    async signInWithCustomToken(token) {
        const auth = getFirebaseAuth();
        try {
            logger.info('[Auth] Signing in with custom token...');
            this._rememberCustomToken(token);
            const userCredential = await signInWithCustomToken(auth, token);
            logger.info('[Auth] signInWithCustomToken completed, user:', { uid: userCredential.user.uid, email: userCredential.user.email });

            // MANUALLY update state immediately (don't wait for onAuthStateChanged)
            this.currentUser = userCredential.user;
            this.currentUserId = userCredential.user.uid;
            this.currentUserMode = 'firebase';
            this.isFirebaseClientReady = true;

            logger.info('[Auth] User state manually updated');

            // Initialize encryption for the logged-in user
            await encryptionService.initializeKey(userCredential.user.uid);
            logger.info('[Auth] Encryption key initialized');

            // Clean up zombie sessions (with error handling for Firestore permissions)
            try {
                await sessionRepository.endAllActiveSessions();
                logger.info('[Auth] Sessions cleaned up');
            } catch (sessionError) {
                logger.warn('[Auth] Session cleanup failed (non-critical):', sessionError.message);
            }

            try {
                await this.syncDashboardBrowserAuth({
                    action: 'signIn',
                    customToken: token,
                    reason: 'main-signInWithCustomToken',
                });
            } catch (syncError) {
                logger.warn('[Auth] Dashboard browser auth sync failed after main sign-in:', syncError.message);
            }

            logger.info('[Auth] signInWithCustomToken completed successfully');
        } catch (error) {
            logger.error('[Auth] Error signing in with custom token:', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    async applyAuthenticatedUser(authData) {
        const idToken = authData?.idToken || authData?.accessToken || null;
        const pseudoUser = {
            uid: authData.uid,
            email: authData.email || 'no-email@example.com',
            displayName: authData.displayName || 'User',
            photoURL: authData.photoURL || null,
            accessToken: idToken,
            refreshToken: authData.refreshToken || null,
            async getIdToken() {
                return idToken;
            },
        };

        this.currentUser = pseudoUser;
        this.currentUserId = pseudoUser.uid;
        this.currentUserMode = 'firebase';
        this.isFirebaseClientReady = true;

        await encryptionService.initializeKey(this.currentUserId);

        try {
            await sessionRepository.endAllActiveSessions();
            logger.info('[Auth] Sessions cleaned up');
        } catch (sessionError) {
            logger.warn('[Auth] Session cleanup failed (non-critical):', sessionError.message);
        }

        if (this.authPollingInterval) {
            clearInterval(this.authPollingInterval);
            this.authPollingInterval = null;
        }

        this.broadcastUserState();
        try {
            await this.syncDashboardBrowserAuth({
                action: 'signIn',
                reason: 'applyAuthenticatedUser',
            });
        } catch (syncError) {
            logger.warn('[Auth] Dashboard browser auth sync failed after applyAuthenticatedUser:', syncError.message);
        }
    }

    async handleIdTokenAuthentication(authData) {
        try {
            logger.info('[Auth] [TARGET] Starting ID token authentication for:', { uid: authData.uid, email: authData.email });

            if (authData?.customToken) {
                logger.info('[Auth] [SECURE] Firebase custom token received');
                await this.signInWithCustomToken(authData.customToken);
                this.broadcastUserState();
                logger.info('[Auth] [OK] Custom token authentication completed through Firebase client');
                return;
            }

            if (authData?.idToken) {
                logger.info('[Auth] [SECURE] Firebase ID token received - applying local authenticated user context');
                await this.applyAuthenticatedUser(authData);
                logger.info('[Auth] [OK] ID token authentication completed through local authenticated context');
                return;
            }

            // Set user state and mark ready for the repositories to use
            // The repositories will handle the Firebase client authentication internally
            logger.info('[Auth] [TEXT] Step 1: Setting authenticated user state');
            this.currentUser = {
                uid: authData.uid,
                email: authData.email,
                displayName: authData.displayName,
                photoURL: null,
            };
            this.currentUserId = authData.uid;
            this.currentUserMode = 'firebase';
            this.isFirebaseClientReady = true; // This tells repositories the user is authenticated

            logger.info('[Auth] [SECURE] Step 2: Initializing encryption key');
            await encryptionService.initializeKey(this.currentUserId);
            logger.info('[Auth] [OK] Encryption key initialized successfully');

            logger.info('[Auth] [CLEAN] Step 3: Cleaning up zombie sessions');
            try {
                await sessionRepository.endAllActiveSessions();
                logger.info('[Auth] [OK] Sessions cleaned up successfully');
            } catch (sessionError) {
                logger.warn('[Auth] [WARNING] Session cleanup failed (non-critical):', { error: sessionError.message });
            }

            logger.info('[Auth] Step 4: Stopping any active polling');
            if (this.authPollingInterval) {
                clearInterval(this.authPollingInterval);
                this.authPollingInterval = null;
                logger.info('[Auth] [OK] Auth polling stopped');
            }

            logger.info('[Auth] [SIGNAL] Step 5: Broadcasting user state');
            this.broadcastUserState();
            try {
                await this.syncDashboardBrowserAuth({
                    action: 'signIn',
                    reason: 'handleIdTokenAuthentication-fallback',
                });
            } catch (syncError) {
                logger.warn('[Auth] Dashboard browser auth sync failed after fallback auth context:', syncError.message);
            }
            logger.info('[Auth] [OK] User state broadcast completed');

            logger.info('[Auth] ID token authentication completed successfully');

        } catch (error) {
            logger.error('[Auth] [ERROR] Error in ID token authentication:', { error: error.message });
            throw error;
        }
    }

    async signOut() {
        try {
            const auth = getFirebaseAuth();

            // Clear any ongoing auth polling
            if (this.authPollingInterval) {
                clearInterval(this.authPollingInterval);
                this.authPollingInterval = null;
                logger.info('[AuthService] Cleared auth polling interval on sign out');
            }

            // End all active sessions for the current user BEFORE signing out (non-blocking)
            try {
                await sessionRepository.endAllActiveSessions();
                logger.info('[AuthService] Sessions ended before sign out');
            } catch (sessionError) {
                logger.warn('[AuthService] Session cleanup failed during sign out (non-critical):', sessionError.message);
            }

            await signOut(auth);
            logger.info('[AuthService] User sign-out successful');

            // Manually update state to local mode
            this.currentUser = null;
            this.currentUserId = 'default_user';
            this.currentUserMode = 'local';
            this.isFirebaseClientReady = false;
            this._lastCustomToken = null;
            this._lastCustomTokenAt = 0;

            try {
                await this.syncDashboardBrowserAuth({
                    action: 'signOut',
                    reloadOnChange: true,
                    reason: 'main-signOut',
                });
            } catch (syncError) {
                logger.warn('[AuthService] Dashboard browser sign-out sync failed:', syncError.message);
            }

            // Broadcast the state change (will trigger HeaderController)
            this.broadcastUserState();
            logger.info('[AuthService] User state broadcast after sign out');

        } catch (error) {
            logger.error('[AuthService] Error signing out:', { error: error.message });
            // Even if sign out fails, reset to local mode
            this.currentUser = null;
            this.currentUserId = 'default_user';
            this.currentUserMode = 'local';
            this.isFirebaseClientReady = false;
            this._lastCustomToken = null;
            this._lastCustomTokenAt = 0;
            this.broadcastUserState();
        }
    }

    broadcastUserState() {
        const userState = this.getCurrentUser();
        logger.info('[AuthService] Broadcasting user state change:', userState);
        // Include nested `user` field so renderer.clairia.app gets same format as dashboard:getUser
        const payload = {
            ...userState,
            user: userState.isLoggedIn ? { uid: userState.uid, email: userState.email, displayName: userState.displayName, photoURL: null } : null,
        };
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                win.webContents.send('user-state-changed', payload);
            }
        });

        // Notify main-process listeners (e.g. modelStateService reload)
        this._stateChangeCallbacks.forEach(cb => { try { cb(userState); } catch {} });

        // NOTE: Removed automatic domain auth refresh to prevent memory issues
        // Auth will be initialized lazily when API calls are made
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
            email: 'contact@xerus.ai',
            displayName: 'Default User',
            mode: 'local',
            isLoggedIn: false,
            //////// before_modelStateService ////////
            // hasApiKey: this.hasApiKey
            //////// before_modelStateService ////////
        };
    }

    isFirebaseReady() {
        return this.isFirebaseClientReady;
    }
}

const authService = new AuthService();
module.exports = authService; 

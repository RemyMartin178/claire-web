// Sentry must be loaded before anything else
require('./instrument.js');

// try {
//     const reloader = require('electron-reloader');
//     reloader(module, {
//     });
// } catch (err) {
// }

// COMPREHENSIVE error handlers (CRITICAL FIX)
process.on('unhandledRejection', (reason, promise) => {
    console.log('[UNHANDLED-REJECTION] Caught unhandled promise rejection:', reason);
    console.log('[UNHANDLED-REJECTION] Promise:', promise);
    // Don't exit - just log and continue
});

process.on('uncaughtException', (error) => {
    console.log('[UNCAUGHT-EXCEPTION] Caught uncaught exception:', error.message);
    console.log('[UNCAUGHT-EXCEPTION] Stack:', error.stack);
    // Don't exit - just log and continue
    return true;
});

console.log('[STARTUP] Comprehensive error handlers installed');

if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain, dialog, desktopCapturer, session, protocol, net } = require('electron');

// Register app://renderer as a privileged scheme BEFORE app is ready (required by Electron)
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

// Disable Windows text suggestions / ink UI / IME candidate bar that shows below inputs
app.commandLine.appendSwitch('disable-features', 'TextInputUI,TextInputKeyboard,IMEInputContextInBrowser,AutofillServerTypePredictions,AutofillUseConsistentPopupSettings,AutofillPopupStays');
const path = require('path');
const fs = require('fs');

// Set app name and AppUserModelId for Windows (CRITICAL for branding and taskbar grouping)
app.setName('Claire');
if (process.platform === 'win32') {
    app.setAppUserModelId('com.pickle.claire');
}

// Load .env file BEFORE anything else (CRITICAL for API keys)
const dotenv = require('dotenv');
const isDev = !app.isPackaged;

if (isDev) {
    // In dev, load .env from root
    dotenv.config({ path: path.join(__dirname, '..', '.env') });
    console.log('[STARTUP] Dev mode: loaded .env from root');
} else {
    // In prod, .env is in resources folder (via extraResources in electron-builder.yml)
    const envPath = path.join(process.resourcesPath, '.env');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log('[STARTUP] Prod mode: loaded .env from', envPath);
    } else {
        console.warn('[STARTUP] .env not found at', envPath);
    }
}

// Claire routes AI/STT through api.clairia.app (server-side keys),
// so local .env keys are only used as a BYOK fallback for power users.
console.log('[STARTUP] AI provider: claire-api (server-side, via Vercel proxy)');

const { createDashboardWindow, createSplashWindow, closeSplashWindow, getDashboardWindow } = require('./window/windowManager.js');

const listenService = require('./features/listen/listenService');
const sharedStateService = require('./common/services/sharedStateService');
const recallService = require('./common/services/recallService');

const { initializeFirebase } = require('./common/services/firebaseClient');
// const databaseInitializer = require('./common/services/databaseInitializer'); // Phase 1 Fix: SQLite removed

const authService = require('./common/services/authService');

const express = require('express');

const fetch = require('node-fetch');

const { resourcePoolManager } = require('./common/services/resource-pool-manager.js');

const { autoUpdater } = require('electron-updater');

const { EventEmitter } = require('events');

const askService = require('./features/ask/askService');

const settingsService = require('./features/settings/settingsService');

const sessionRepository = require('./common/repositories/session');

const modelStateService = require('./common/services/modelStateService');

const featureBridge = require('./bridge/featureBridge');
const windowReconciler = require('./window/windowReconciler');

const windowBridge = require('./bridge/windowBridge');
// Import context IPC handlers for context management functionality  
// const { ContextIpcHandlers } = require('./bridge/context-ipc-handlers'); // Temporarily disabled due to circular dependency

const { enhancedScreenCapture } = require('./main/enhanced-screen-capture');

const { privacyManager } = require('./main/privacy-manager');

const { configManager } = require('./main/config-manager');
// Dependency injection removed - using direct imports instead

// Global variables
const eventBridge = new EventEmitter();
let WEB_PORT = null;
let isShuttingDown = false; // Flag to prevent infinite shutdown loop
global.isQuitting = false; // Set to true only during real quit (not hide)

const ALLOWED_DEEPLINK_ACTIONS = ['auth', 'login', 'auth-success', 'local-mode', 'personalize', 'billing-success'];

//////// after_modelStateService ////////
global.modelStateService = modelStateService;
//////// after_modelStateService ////////

const { createLogger } = require('./common/services/logger.js');

const logger = createLogger('Index');
const DEFAULT_WEB_APP_URL = 'https://app.clairia.app';
let auxiliaryWebStackPromise = null;

function ensureAuxiliaryWebStackStarted() {
    if (auxiliaryWebStackPromise) {
        return auxiliaryWebStackPromise;
    }

    auxiliaryWebStackPromise = (async () => {
        WEB_PORT = await startWebStack();
        logger.info('Auxiliary web front-end listening on', WEB_PORT);

        const meetingNotifier = require('./main/meeting-notifier');
        meetingNotifier.start(WEB_PORT, async () => {
            try {
                return await authService.getCurrentUser()?.getIdToken();
            } catch {
                return null;
            }
        });

        return WEB_PORT;
    })().catch((error) => {
        auxiliaryWebStackPromise = null;
        logger.warn('[Index] Auxiliary web stack not available:', { error: error.message });
        throw error;
    });

    return auxiliaryWebStackPromise;
}

// Safe webContents.send wrapper to handle EPIPE errors
function safeWebContentsSend(webContents, channel, ...args) {
    try {
        if (webContents && !webContents.isDestroyed()) {
            webContents.send(channel, ...args);
        }
    } catch (error) {
        if (error.code === 'EPIPE' || error.message.includes('broken pipe')) {
            logger.warn('[SafeIPC] EPIPE error in webContents.send, ignoring...', {
                channel,
                error: error.message
            });
        } else {
            logger.error('[SafeIPC] Error in webContents.send:', {
                channel,
                error: error.message
            });
        }
    }
}

// Make safe sender globally available
global.safeWebContentsSend = safeWebContentsSend;

// Global error handling for uncaught exceptions and broken pipes
process.on('uncaughtException', (error) => {
    // Handle EPIPE (Broken pipe) errors gracefully
    if (error.code === 'EPIPE' || error.message.includes('Broken pipe')) {
        logger.warn('[Process] EPIPE error caught (broken pipe/write), continuing...', {
            error: error.message,
            code: error.code
        });
        return; // Don't crash the app for broken pipe errors
    }

    // Handle other uncaught exceptions
    logger.error('[Process] Uncaught exception:', {
        error: error.message,
        stack: error.stack,
        code: error.code
    });

    // Attempt graceful shutdown for critical errors
    if (!isShuttingDown) {
        logger.error('[Process] Attempting graceful shutdown due to uncaught exception...');
        app.quit();
    }
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('[Process] Unhandled promise rejection:', {
        reason: reason?.message || reason,
        stack: reason?.stack
    });
});

// Native deep link handling - cross-platform compatible
let pendingDeepLinkUrl = null;

function setupProtocolHandling() {
    // Register pickleglass:// and claire:// protocol handlers for deep linking
    logger.info('[Protocol] Registering pickleglass:// and claire:// custom URL schemes...');

    try {
        // In dev mode on Windows, must pass execPath + argv[1] explicitly or registry
        // points to wrong electron.exe and second-instance never fires.
        const extraArgs = !app.isPackaged ? [path.resolve(process.argv[1])] : [];
        const execPath = !app.isPackaged ? process.execPath : undefined;

        const pgSuccess = execPath
            ? app.setAsDefaultProtocolClient('pickleglass', execPath, extraArgs)
            : app.setAsDefaultProtocolClient('pickleglass');
        logger.info(`[Protocol] pickleglass:// registration: ${pgSuccess ? 'OK' : 'FAILED (may need admin rights)'}`);

        const claireSuccess = execPath
            ? app.setAsDefaultProtocolClient('claire', execPath, extraArgs)
            : app.setAsDefaultProtocolClient('claire');
        logger.info(`[Protocol] claire:// registration: ${claireSuccess ? 'OK' : 'FAILED (may need admin rights)'}`);
    } catch (error) {
        logger.error('[Protocol] Error registering protocol:', { error: error.message });
    }

    // Handle second instance (Windows/Linux) - receives protocol URLs via command line
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        logger.info('[Protocol] Second instance detected, command line:', commandLine);
        focusMainWindow();

        // Find pickleglass:// or claire:// URL in command line arguments
        const protocolUrl = commandLine.find(arg => arg.startsWith('pickleglass://') || arg.startsWith('claire://'));
        if (protocolUrl) {
            logger.info('[Protocol] Found protocol URL in second instance:', protocolUrl);
            handleCustomUrl(protocolUrl);
        }
    });

    // Handle protocol URL on macOS - receives URLs directly
    app.on('open-url', (event, url) => {
        event.preventDefault();
        logger.info('[Protocol] Received protocol URL on macOS:', url);

        if (url.startsWith('pickleglass://') || url.startsWith('claire://')) {
            focusMainWindow();
            handleCustomUrl(url);
        } else {
            logger.warn('[Protocol] Received unsupported URL, ignoring:', url);
        }
    });
}

function focusMainWindow() {
    const { windowPool, getOverlayWindow, startOverlayPolling } = require('./window/windowManager.js');

    // Show overlay window if hidden (background mode)
    const overlay = getOverlayWindow ? getOverlayWindow() : null;
    if (overlay && !overlay.isDestroyed()) {
        if (!overlay.isVisible()) {
            overlay.show();
            // Restart cursor-tracking polling that was stopped when hiding to background
            if (startOverlayPolling) startOverlayPolling();
        }
        overlay.setAlwaysOnTop(true, 'screen-saver'); // re-assert after show
        if (overlay.isMinimized()) overlay.restore();
        overlay.focus();
        return true;
    }

    if (windowPool) {
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            if (!header.isVisible()) header.show();
            if (header.isMinimized()) header.restore();
            header.focus();
            return true;
        }
    }

    // Fallback: focus any available window
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        const mainWindow = windows[0];
        if (!mainWindow.isDestroyed()) {
            if (!mainWindow.isVisible()) mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            return true;
        }
    }

    return false;
}

// Check for protocol URL in startup arguments (Windows/Linux)
const startupProtocolUrl = process.argv.find(arg => arg.startsWith('pickleglass://') || arg.startsWith('claire://'));
if (startupProtocolUrl) {
    logger.info('[Protocol] Found startup protocol URL:', startupProtocolUrl);
    pendingDeepLinkUrl = startupProtocolUrl;
}

// Check for force start flag in development
const forceStart = process.argv.includes('--force-start') || process.env.XERUS_FORCE_START === 'true';

console.log('[STARTUP] Requesting single instance lock...');
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    console.log('[STARTUP] CRITICAL: Single instance lock failed!');
    console.log('[STARTUP] Another Claire instance is already running.');

    if (forceStart) {
        console.log('[STARTUP] WARNING: Force start enabled - bypassing single instance lock');
        console.log('[STARTUP] This may cause issues if another instance is actually running');
        logger && logger.warn('[SingleInstance] Force start enabled - bypassing single instance lock');
    } else {
        console.log('[STARTUP] This instance will now exit.');
        logger && logger.error('[SingleInstance] Failed to acquire single instance lock - another instance is running');

        // Check if we're in development mode and provide helpful guidance
        if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
            console.log('[STARTUP] TIP: In development, make sure no other npm start processes are running');
            console.log('[STARTUP] TIP: You can kill all Electron processes with: taskkill /f /im electron.exe');
            console.log('[STARTUP] TIP: Or use force start: npm start -- --force-start');
            console.log('[STARTUP] TIP: Or set environment: XERUS_FORCE_START=true npm start');
        }

        app.quit();
        process.exit(1); // Use exit code 1 to indicate error, not normal exit
    }
} else {
    console.log('[STARTUP] Single instance lock acquired successfully');
}

// setup protocol after single instance lock
setupProtocolHandling();


// Block DevTools in production — applied to every web contents (overlay, header, feature windows)
app.on('web-contents-created', (_, contents) => {
    contents.on('before-input-event', (event, input) => {
        if (!app.isPackaged) return;
        const isDevToolsShortcut =
            (input.control && input.shift && input.key === 'I') ||
            (input.meta && input.alt && input.key === 'I') ||
            input.key === 'F12';
        if (isDevToolsShortcut) event.preventDefault();
    });
    contents.on('devtools-opened', () => {
        if (app.isPackaged) contents.closeDevTools();
    });
});

// ── Boot IPC handlers (registered once, before any window loads) ─────────────
let _bootPhase = 'idle'; // 'idle' | 'booting' | 'done'

function _resolveBoot() {
    if (_bootPhase === 'done') return;
    _bootPhase = 'done';
    logger.info('[Boot] Resolving boot — closing splash, desktop gap, then showing dashboard');
    closeSplashWindow();
    setTimeout(() => {
        const dash = getDashboardWindow();
        if (!dash || dash.isDestroyed()) return;
        dash.setOpacity(0);
        dash.show();
        setTimeout(() => { if (!dash.isDestroyed()) { dash.setOpacity(1); dash.focus(); } }, 30);
    }, 700);
}

ipcMain.handle('electron-boot:dashboard-ready', () => {
    logger.info('[Boot] Renderer → dashboardReady');
    _resolveBoot();
});

ipcMain.handle('electron-boot:needs-login', () => {
    logger.info('[Boot] Renderer → needsLogin');
    _resolveBoot();
});

ipcMain.handle('electron-boot:login-success', () => {
    logger.info('[Boot] Renderer → loginSuccess (no-op, auth flow handles navigation)');
});

async function bootApp() {
    // Only run on cold start
    if (_bootPhase !== 'idle') {
        createDashboardWindow();
        return;
    }
    _bootPhase = 'booting';

    // Reset any persisted panel visibility from the previous session
    sharedStateService.patch({ showHeader: false, showListen: false, showChat: false, showDashboard: false });

    logger.info('[Boot] Cold start — creating splash window');
    createSplashWindow();

    logger.info('[Boot] Creating dashboard window (hidden)');
    createDashboardWindow({ skipAutoShow: true });

    // Timeout fallback: if renderer doesn't signal within 15s, force show
    setTimeout(() => {
        if (_bootPhase !== 'done') {
            logger.warn('[Boot] Timeout — forcing boot resolution');
            _resolveBoot();
        }
    }, 15000);
}

app.whenReady().then(async () => {

    // Serve the static Next.js export via app://renderer/
    const rendererDir = app.isPackaged
        ? path.join(process.resourcesPath, 'out')
        : path.join(__dirname, '..', 'apps', 'renderer', 'out');

    protocol.handle('app', (request) => {
        const url = new URL(request.url);
        if (url.hostname !== 'renderer') return new Response('Not found', { status: 404 });
        let filePath = decodeURIComponent(url.pathname);
        // Map / → /electron-login (default entry point for dashboard)
        if (filePath === '/' || filePath === '') filePath = '/electron-login';
        // Try exact path first, then with .html extension, then index.html inside dir
        const candidates = [
            path.join(rendererDir, filePath),
            path.join(rendererDir, filePath + '.html'),
            path.join(rendererDir, filePath.replace(/\/$/, ''), 'index.html'),
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return net.fetch('file://' + candidate);
            }
        }
        // SPA fallback: return the requested page HTML (Next.js static export)
        const pageHtml = path.join(rendererDir, filePath.replace(/\/$/, '') + '.html');
        if (fs.existsSync(pageHtml)) return net.fetch('file://' + pageHtml);
        const fallbackCandidates = [
            path.join(rendererDir, 'electron-login.html'),
            path.join(rendererDir, 'electron-login', 'index.html'),
            path.join(rendererDir, 'index.html'),
        ];
        for (const candidate of fallbackCandidates) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return net.fetch('file://' + candidate);
            }
        }
        return new Response('Renderer page not found', { status: 404 });
    });

    // Allow app://renderer to call app.clairia.app APIs without CORS errors
    session.defaultSession.webRequest.onHeadersReceived({ urls: ['https://app.clairia.app/*'] }, (details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Access-Control-Allow-Origin': ['app://renderer'],
                'Access-Control-Allow-Credentials': ['true'],
            },
        });
    });

    // Setup native loopback audio capture for Windows
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
            // Grant access to the first screen found with loopback audio
            callback({ video: sources[0], audio: 'loopback' });
        }).catch((error) => {
            logger.error('Error occurred', { error });
            callback({});
        });
    });

    // Initialize configuration manager
    logger.info('[Index] Configuration Manager initialized');
    logger.info('[Index] Configuration summary:', configManager.getSummary());

    // Dependency injection removed - services use direct imports
    logger.info('[Index] Services use direct imports (DI container removed)');

    // Initialize core services
    initializeFirebase();

    try {
        // Phase 1 Fix: Temporarily disable SQLite database initialization
        // This prevents SQLite module errors while we migrate to unified Neon database
        // await databaseInitializer.initialize();
        logger.info('>>> [index.js] SQLite database initialization disabled (Phase 1 Fix)');

        // Clean up zombie sessions from previous runs first - MOVED TO authService
        // sessionRepository.endAllActiveSessions();

        logger.info('[Index] DEBUG: About to initialize authService...');
        try {
            await authService.initialize();
            logger.info('[Index] DEBUG: authService.initialize() completed');

            if (process.env.RUN_DECRYPTION_MIGRATION === 'true') {
                const id = authService.getCurrentUserId ? authService.getCurrentUserId() : (authService.getCurrentUser()?.uid);
                if (id && id !== 'default_user') {
                    logger.info(`[Migration] Starting opt-in decryption migration for userUID: ${id}`);
                    const { decryptUserData } = require('./scripts/decrypt_firestore');
                    decryptUserData(id).then(() => {
                        logger.info(`[Migration] Decryption migration attempt finished for user: ${id}`);
                    }).catch((error) => {
                        logger.warn('[Migration] Opt-in migration failed', { error: error.message });
                    });
                }
            }

        } catch (error) {
            logger.error('[Index] ERROR: authService.initialize() failed:', error.message);
            logger.info('[Index] Continuing with limited functionality...');
        }

        //////// after_modelStateService ////////
        logger.info('[Index] DEBUG: About to initialize modelStateService...');
        await modelStateService.initialize();
        logger.info('[Index] DEBUG: modelStateService.initialize() completed');
        //////// after_modelStateService ////////

        // Init shared state BEFORE featureBridge — featureBridge subscribes to it
        // and exposes get/patch IPC handlers that other services may use.
        try {
            await sharedStateService.init();
            logger.info('[Index] DEBUG: sharedStateService.init() completed');
        } catch (err) {
            logger.warn('[Index] sharedStateService.init() failed (continuing):', err.message);
        }
        windowReconciler.initialize();

        logger.info('[Index] DEBUG: About to initialize featureBridge and windowBridge...');
        featureBridge.initialize();  // [Korean comment translated]: featureBridge Initialize
        windowBridge.initialize();
        // Initialize context IPC handlers for context management functionality
        // const contextIpcHandlers = new ContextIpcHandlers(); // Temporarily disabled due to circular dependency
        setupWebDataHandlers();
        logger.info('[Index] DEBUG: featureBridge, windowBridge, and setupWebDataHandlers completed');

        // Initialize listen service and IPC handlers
        logger.info('[Index] DEBUG: About to initialize listenService...');
        listenService.initialize();
        logger.info('[Index] Listen service initialized');

        ensureAuxiliaryWebStackStarted().catch(() => {});

        // ── Boot orchestration (Cluely-style splash) ──────────────────────────
        await bootApp();

    } catch (err) {
        logger.error('>>> [index.js] Database initialization failed - some features may not work', {
            error: err.message,
            stack: err.stack,
            name: err.name
        });
        dialog.showErrorBox(
            'Initialization Error',
            `Failed to initialize the application: ${err.message}`
        );
    }

    // Auto-updater will be initialized after user authentication
    // Start periodic check for authenticated user to initialize auto-updater
    const autoUpdaterRetryInterval = setInterval(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.isLoggedIn && !autoUpdaterInitialized) {
            logger.info('[AutoUpdater] User authenticated, initializing auto-updater...');
            initAutoUpdaterOnAuth();
            clearInterval(autoUpdaterRetryInterval);
        }
    }, 2000); // Check every 2 seconds

    // Stop trying after 60 seconds to avoid infinite polling
    setTimeout(() => {
        clearInterval(autoUpdaterRetryInterval);
        if (!autoUpdaterInitialized) {
            logger.info('[AutoUpdater] Timeout reached, skipping auto-updater initialization');
        }
    }, 60000);

    // Process any pending protocol URL from startup
    if (pendingDeepLinkUrl) {
        logger.info('[Protocol] Processing pending startup protocol URL:', pendingDeepLinkUrl);
        handleCustomUrl(pendingDeepLinkUrl);
        pendingDeepLinkUrl = null;
    }
});

// Keep process alive when all windows are closed (background mode)
app.on('window-all-closed', () => { /* stay in background */ });

app.on('before-quit', async (event) => {
    global.isQuitting = true;
    // Prevent infinite loop by checking if shutdown is already in progress
    if (isShuttingDown) {
        logger.info('[Shutdown] [LOADING] Shutdown already in progress, allowing quit...');
        return;
    }

    logger.info('[Shutdown] App is about to quit. Starting graceful shutdown...');

    // Set shutdown flag to prevent infinite loop
    isShuttingDown = true;

    // Prevent immediate quit to allow graceful shutdown
    event.preventDefault();

    try {
        // 0. Stop meeting notifier
        try { require('./main/meeting-notifier').stop(); } catch {}

        // 0bis. Flush any pending shared-state write so we don't lose persisted flags
        try { await sharedStateService.flush(); } catch (e) {
            logger.warn('[Shutdown] sharedStateService.flush() failed:', e.message);
        }

        // 1. Stop Recall SDK before closing local audio/session services
        try { await recallService.shutdown(); } catch (e) {
            logger.warn('[Shutdown] recallService.shutdown() failed:', e.message);
        }

        // 2. Stop audio capture
        await listenService.closeSession();
        logger.info('[Shutdown] Audio capture stopped');

        // 3. End all active sessions (database operations) - with error handling
        try {
            await sessionRepository.endAllActiveSessions();
            logger.info('[Shutdown] Active sessions ended');
        } catch (dbError) {
            logger.warn('Could not end active sessions (database may be closed):', { error: dbError.message });
        }

        // 3. Close database connections (final cleanup) - SQLite removed
        logger.info('[Shutdown] SQLite database close skipped (migrated to Neon)');

        logger.info('[Shutdown] Graceful shutdown completed successfully');

    } catch (error) {
        logger.error('Error during graceful shutdown:', { error });
        // Continue with shutdown even if there were errors
    } finally {
        // Actually quit the app now
        logger.info('[Shutdown] Exiting application...');
        app.exit(0); // Use app.exit() instead of app.quit() to force quit
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createDashboardWindow();
    }
});

function setupWebDataHandlers() {
    const sessionRepository = require('./common/repositories/session');
    const sttRepository = require('./features/listen/stt/repositories');
    const summaryRepository = require('./features/listen/summary/repositories');
    const askRepository = require('./features/ask/repositories');
    const userRepository = require('./common/repositories/user');
    const presetRepository = require('./common/repositories/preset');

    const handleRequest = async (channel, responseChannel, payload) => {
        let result;
        // const currentUserId = authService.getCurrentUserId(); // No longer needed here
        try {
            switch (channel) {
                // SESSION
                case 'get-sessions':
                    // Adapter injects UID
                    result = await sessionRepository.getAllByUserId();
                    break;
                case 'get-session-details':
                    const session = await sessionRepository.getById(payload);
                    if (!session) {
                        result = null;
                        break;
                    }
                    const [transcripts, ai_messages, summary] = await Promise.all([
                        sttRepository.getAllTranscriptsBySessionId(payload),
                        askRepository.getAllAiMessagesBySessionId(payload),
                        summaryRepository.getSummaryBySessionId(payload)
                    ]);
                    result = { session, transcripts, ai_messages, summary };
                    break;
                case 'delete-session':
                    result = await sessionRepository.deleteWithRelatedData(payload);
                    break;
                case 'create-session':
                    // Adapter injects UID
                    const id = await sessionRepository.create('ask');
                    if (payload && payload.title) {
                        await sessionRepository.updateTitle(id, payload.title);
                    }
                    result = { id };
                    break;

                // USER
                case 'get-user-profile':
                    // Adapter injects UID
                    result = await userRepository.getById();
                    break;
                case 'update-user-profile':
                    // Adapter injects UID
                    result = await userRepository.update(payload);
                    break;
                case 'find-or-create-user':
                    result = await userRepository.findOrCreate(payload);
                    break;
                case 'save-api-key':
                    // Use ModelStateService as the single source of truth for API key management
                    result = await modelStateService.setApiKey(payload.provider, payload.apiKey);
                    break;
                case 'check-api-key-status':
                    // Use ModelStateService to check API key status
                    const hasApiKey = await modelStateService.hasValidApiKey();
                    result = { hasApiKey };
                    break;
                case 'get-all-api-key-status':
                    // Get status for all API key providers
                    result = {
                        openai: await modelStateService.hasValidApiKey('openai'),
                        gemini: await modelStateService.hasValidApiKey('gemini'),
                        anthropic: await modelStateService.hasValidApiKey('anthropic'),
                        ollama: await modelStateService.hasValidApiKey('ollama'),
                        whisper: await modelStateService.hasValidApiKey('whisper')
                    };
                    break;
                case 'get-all-api-keys':
                    // Get all API keys (masked for security)
                    result = {
                        openai: await modelStateService.getApiKey('openai') ? '••••••••' : null,
                        gemini: await modelStateService.getApiKey('gemini') ? '••••••••' : null,
                        anthropic: await modelStateService.getApiKey('anthropic') ? '••••••••' : null,
                        ollama: await modelStateService.getApiKey('ollama') ? '••••••••' : null,
                        whisper: await modelStateService.getApiKey('whisper') ? '••••••••' : null
                    };
                    break;
                case 'remove-api-key':
                    // Remove specific API key
                    result = await modelStateService.handleRemoveApiKey(payload.provider);
                    break;
                case 'delete-account':
                    // Adapter injects UID
                    result = await userRepository.deleteById();
                    break;

                // PRESET
                case 'get-presets':
                    // Adapter injects UID
                    result = await presetRepository.getPresets();
                    break;
                case 'create-preset':
                    // Adapter injects UID
                    result = await presetRepository.create(payload);
                    settingsService.notifyPresetUpdate('created', result.id, payload.title);
                    break;
                case 'update-preset':
                    // Adapter injects UID
                    result = await presetRepository.update(payload.id, payload.data);
                    settingsService.notifyPresetUpdate('updated', payload.id, payload.data.title);
                    break;
                case 'delete-preset':
                    // Adapter injects UID
                    result = await presetRepository.delete(payload);
                    settingsService.notifyPresetUpdate('deleted', payload);
                    break;

                // BATCH
                case 'get-batch-data':
                    const includes = payload ? payload.split(',').map(item => item.trim()) : ['profile', 'presets', 'sessions'];
                    const promises = {};

                    if (includes.includes('profile')) {
                        // Adapter injects UID
                        promises.profile = userRepository.getById();
                    }
                    if (includes.includes('presets')) {
                        // Adapter injects UID
                        promises.presets = presetRepository.getPresets();
                    }
                    if (includes.includes('sessions')) {
                        // Adapter injects UID
                        promises.sessions = sessionRepository.getAllByUserId();
                    }

                    const batchResult = {};
                    const promiseResults = await Promise.all(Object.values(promises));
                    Object.keys(promises).forEach((key, index) => {
                        batchResult[key] = promiseResults[index];
                    });

                    result = batchResult;
                    break;

                default:
                    throw new Error(`Unknown web data channel: ${channel}`);
            }
            eventBridge.emit(responseChannel, { success: true, data: result });
        } catch (error) {
            logger.error('Error occurred', { error: `Error handling web data request for ${channel}:`, error });
            eventBridge.emit(responseChannel, { success: false, error: error.message });
        }
    };

    eventBridge.on('web-data-request', handleRequest);
}

async function handleCustomUrl(url) {
    try {
        console.log('========================================');
        console.log('DEEPLINK INTERCEPTED!');
        console.log('URL:', url);
        console.log('========================================');
        logger.info('[Custom URL] Processing URL:', url);

        // Validate and clean URL
        if (!url || typeof url !== 'string' || !(url.startsWith('pickleglass://') || url.startsWith('claire://'))) {
            console.log('INVALID URL FORMAT:', url);
            logger.error('Invalid URL format:', { url });
            return;
        }

        // Clean up URL by removing problematic characters
        const cleanUrl = url.replace(/[\\₩]/g, '');

        // Additional validation
        if (cleanUrl !== url) {
            logger.info('[Custom URL] Cleaned URL from:', url, 'to:', cleanUrl);
            url = cleanUrl;
        }

        const urlObj = new URL(url);
        const action = urlObj.hostname;
        const params = Object.fromEntries(urlObj.searchParams);

        logger.info('[Custom URL] Action:', action, 'Params:', params);

        // Handle auth with subpath (e.g., pickleglass://auth/callback)
        if (action === 'auth') {
            const subPath = (urlObj.pathname || '').replace(/^\//, '');
            logger.info('[deeplink] AUTH ACTION DETECTED - subPath:', subPath);
            if (subPath === 'callback') {
                const code = params.code;
                const state = params.state;
                logger.info('[deeplink] received auth callback', { code, state });

                // CSRF state validation: reject callback if state does not match
                if (!authService.validateAndConsumeState(code, state)) {
                    logger.warn('[deeplink] CSRF state validation failed - rejecting auth callback');
                    return;
                }

                // Focus the app window
                const { windowPool } = require('./window/windowManager.js');
                const header = windowPool.get('header');
                if (header) {
                    if (header.isMinimized()) header.restore();
                    header.focus();
                }

                // Send to renderer process
                const { BrowserWindow } = require('electron');
                BrowserWindow.getAllWindows().forEach(win => {
                    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                        win.webContents.send('mobile-auth:callback', { code, state });
                        // Notify header controller about deep link
                        win.webContents.send('header-controller:deep-link-received', { action: 'auth', subPath: 'callback' });
                    }
                });

                await handleMobileAuthCallback(params);
            }
            return;
        }

        // Reject unknown deeplink hostnames
        if (!ALLOWED_DEEPLINK_ACTIONS.includes(action)) {
            logger.warn('[deeplink] Rejected unknown deeplink action:', action);
            return;
        }

        switch (action) {
            case 'login':
            case 'auth-success':
                if (params.tool) {
                    logger.info('[Protocol] Tool authentication success:', params.tool);
                    // Broadcast to all windows that a tool was successfully connected
                    const { BrowserWindow } = require('electron');
                    BrowserWindow.getAllWindows().forEach(win => {
                        if (win && !win.isDestroyed()) {
                            win.webContents.send('oauth:success', { tool: params.tool });
                        }
                    });
                } else {
                    await handleFirebaseAuthCallback(params);
                }
                break;
            case 'local-mode':
                handleLocalModeFromUrl();
                break;
            case 'personalize':
                handlePersonalizeFromUrl(params);
                break;
            case 'billing-success': {
                logger.info('[deeplink] billing-success received');
                // Force-refresh Firebase token so new subscription claims are picked up
                const firebaseUser = authService.getCurrentUser()?.firebaseUser;
                if (firebaseUser) {
                    try { await firebaseUser.getIdToken(true); } catch (e) { logger.warn('[deeplink] token refresh failed', e); }
                }
                // Fetch subscription status from web API
                const bsWebUrl = app.isPackaged ? DEFAULT_WEB_APP_URL : (process.env.pickleglass_WEB_URL || DEFAULT_WEB_APP_URL);
                let isPremium = false;
                try {
                    const idToken = firebaseUser ? await firebaseUser.getIdToken() : null;
                    if (idToken) {
                        const res = await fetch(`${bsWebUrl}/api/app/subscription`, { headers: { Authorization: `Bearer ${idToken}` } });
                        if (res.ok) { const data = await res.json(); isPremium = !!(data.isPremium || data.isActive); }
                    }
                } catch (e) { logger.warn('[deeplink] subscription fetch failed', e); }
                // Focus main window
                try {
                    const { windowPool } = require('./window/windowManager.js');
                    const header = windowPool.get('header');
                    if (header && !header.isDestroyed()) { if (header.isMinimized()) header.restore(); header.focus(); }
                } catch (e) {}
                // Broadcast pro-unlocked to all renderers
                const { BrowserWindow: BSBrowserWindow } = require('electron');
                BSBrowserWindow.getAllWindows().forEach(win => {
                    if (win && !win.isDestroyed()) safeWebContentsSend(win.webContents, 'pro-unlocked', { isPremium });
                });
                break;
            }
        }

    } catch (error) {
        logger.error('Error parsing URL:', { error });
    }
}

async function handleMobileAuthCallback(params) {
    try {
        const { code, state } = params;
        console.log('========================================');
        console.log('STARTING MOBILE AUTH CALLBACK');
        console.log('Session ID:', code);
        console.log('========================================');
        logger.info('[Auth] Processing deep link - session_id:', code);

        // The exchange endpoint lives on Vercel (has Firebase Admin + creates custom token from uid)
        const isPackaged = app.isPackaged;
        const webUrl = isPackaged
            ? DEFAULT_WEB_APP_URL
            : (process.env.pickleglass_WEB_URL || DEFAULT_WEB_APP_URL);
        const exchangeUrl = `${webUrl}/api/mobile-auth/exchange`;

        console.log('app.isPackaged:', isPackaged);
        console.log('webUrl:', webUrl);

        console.log('Calling exchange API:', exchangeUrl);
        logger.info('[Auth] Exchanging session via web API:', exchangeUrl);

        const fetch = require('node-fetch');
        const response = await fetch(exchangeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: code })
        });

        console.log('Exchange API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('Exchange API error:', errorText);
            logger.error('[Auth] Exchange API failed:', errorText);
            throw new Error(`Exchange failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('Exchange API success:', data.success);

        if (!data.success || !data.custom_token) {
            console.log('No custom token in response');
            logger.error('[Auth] No custom token in response:', data);
            throw new Error('No custom token received');
        }

        const custom_token = data.custom_token;
        console.log('Got custom token, signing in...');
        logger.info('[Auth] Got custom token, signing in...');

        // Initialize Firebase client if not already done
        const { initializeFirebase } = require('./common/services/firebaseClient');
        await initializeFirebase();
        console.log('Firebase client initialized');

        // Sign in with the custom token (waits for onAuthStateChanged internally)
        await authService.signInWithCustomToken(custom_token);

        console.log('Sign in successful!');
        logger.info('[Auth] signInWithCustomToken successful - user should be connected');

        // Force broadcast to ensure UI updates
        console.log('Broadcasting user state...');
        authService.broadcastUserState();
        console.log('User state broadcast sent');

    } catch (e) {
        console.log('AUTH CALLBACK FAILED:', e?.message);
        logger.error('[Auth] FAIL:', e?.message, e?.stack);
        // Notify renderer so UI can reset "Signing in..." state
        const { BrowserWindow } = require('electron');
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed()) {
                win.webContents.send('auth-failed', { message: e?.message });
            }
        });
    }
}

async function handleFirebaseAuthCallback(params) {
    const userRepository = require('./common/repositories/user');
    const { token: idToken } = params;

    if (!idToken) {
        logger.error('Firebase auth callback is missing ID token.');
        // No need to send IPC, the UI won't transition without a successful auth state change.
        return;
    }

    logger.info('[Auth] Received ID token from deep link, exchanging for custom token...');

    try {
        const functionUrl = 'https://us-west1-pickle-3651a.cloudfunctions.net/pickleGlassAuthCallback';
        // Use ResourcePoolManager to prevent EPIPE errors
        logger.debug('[Auth] Making Firebase auth callback request via ResourcePoolManager');
        const response = await resourcePoolManager.queuedFetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to exchange token.');
        }

        const { customToken, user } = data;
        logger.info('[Auth] Successfully received custom token for user:', user.uid);

        const firebaseUser = {
            uid: user.uid,
            email: user.email || 'no-email@example.com',
            displayName: user.name || 'User',
            photoURL: user.picture
        };

        // 1. Sync user data to local DB
        userRepository.findOrCreate(firebaseUser);
        logger.info('[Auth] User data synced with local DB.');

        // 2. Sign in using the authService in the main process
        await authService.signInWithCustomToken(customToken);
        logger.info('[Auth] Main process sign-in initiated. Waiting for onAuthStateChanged...');

        // 3. Focus the app window
        const { windowPool } = require('./window/windowManager.js');
        const header = windowPool.get('header');
        if (header) {
            if (header.isMinimized()) header.restore();
            header.focus();
        } else {
            logger.error('Header window not found after auth callback.');
        }

    } catch (error) {
        logger.error('Error during custom token exchange or sign-in:', { error });
        // The UI will not change, and the user can try again.
        // Optionally, send a generic error event to the renderer.
        const { windowPool } = require('./window/windowManager.js');
        const header = windowPool.get('header');
        if (header) {
            safeWebContentsSend(header.webContents, 'auth-failed', { message: error.message });
        }
    }
}

function handlePersonalizeFromUrl(params) {
    logger.info('[Custom URL] Personalize params:', params);

    const { windowPool } = require('./window/windowManager.js');
    const header = windowPool.get('header');

    if (header) {
        if (header.isMinimized()) header.restore();
        header.focus();

        const personalizeUrl = WEB_PORT
            ? `http://localhost:${WEB_PORT}/settings`
            : `${process.env.pickleglass_WEB_URL || DEFAULT_WEB_APP_URL}/settings`;
        logger.info('Navigating to personalize page:');
        header.webContents.loadURL(personalizeUrl);

        BrowserWindow.getAllWindows().forEach(win => {
            safeWebContentsSend(win.webContents, 'enter-personalize-mode', {
                message: 'Personalization mode activated',
                params: params
            });
        });
    } else {
        logger.error('Header window not found for personalize');
    }
}

function handleLocalModeFromUrl() {
    logger.info('[Custom URL] Local mode activation requested via protocol');

    const { windowPool } = require('./window/windowManager.js');
    const header = windowPool.get('header');

    if (header) {
        if (header.isMinimized()) header.restore();
        header.focus();

        logger.info('[Custom URL] Focusing main window for local mode');

        // Send event to renderer to confirm local mode activation
        BrowserWindow.getAllWindows().forEach(win => {
            safeWebContentsSend(win.webContents, 'local-mode-activated', {
                message: 'Local mode activated via deep link'
            });
        });
    } else {
        logger.error('Header window not found for local mode activation');
    }
}


async function startWebStack() {
    logger.info('NODE_ENV =', process.env.NODE_ENV);
    const isDev = !app.isPackaged;

    const getAvailablePort = () => {
        return new Promise((resolve, reject) => {
            const server = require('net').createServer();
            server.listen(0, (err) => {
                if (err) reject(err);
                const port = server.address().port;
                server.close(() => resolve(port));
            });
        });
    };

    // Use consistent ports for API and frontend to avoid conflicts
    const apiPort = process.env.BACKEND_PORT || process.env.pickleglass_API_PORT || 3001;
    const frontendPort = await getAvailablePort();

    logger.info(`[TOOL] Allocated ports: API=${apiPort}, Frontend=${frontendPort}`);

    const defaultProdApiUrl = 'https://backend-production-ba2c.up.railway.app';
    const defaultProdWebUrl = 'https://app.clairia.app';
    const defaultApiUrl = app.isPackaged ? defaultProdApiUrl : `http://localhost:${apiPort}`;
    const defaultWebUrl = app.isPackaged ? defaultProdWebUrl : `http://localhost:${frontendPort}`;

    // Set environment variables for inter-service communication (compatible with Glass/pickleglass)
    if (app.isPackaged) {
        if (!process.env.pickleglass_API_URL) {
            process.env.pickleglass_API_URL = defaultApiUrl;
        }
        if (!process.env.pickleglass_WEB_URL) {
            process.env.pickleglass_WEB_URL = defaultWebUrl;
        }
        if (!process.env.xerus_API_URL) {
            process.env.xerus_API_URL = defaultApiUrl;
        }
        if (!process.env.XERUS_WEB_URL) {
            process.env.XERUS_WEB_URL = defaultWebUrl;
        }
    } else {
        // In local development, override the WEB URL to localhost so the auth callback
        // returns to the Electron deeplink handler instead of production.
        // The API URL is preserved from .env if already set (it points to Railway backend).
        if (!process.env.pickleglass_API_URL) {
            process.env.pickleglass_API_URL = defaultApiUrl;
        }
        process.env.pickleglass_WEB_URL = defaultWebUrl;
        if (!process.env.xerus_API_URL) {
            process.env.xerus_API_URL = process.env.pickleglass_API_URL;
        }
        process.env.XERUS_WEB_URL = defaultWebUrl;
    }

    logger.info(`Environment variables set:`, {
        pickleglass_API_URL: process.env.pickleglass_API_URL,
        pickleglass_WEB_URL: process.env.pickleglass_WEB_URL
    });

    // Backend is now running as standalone service on localhost:3001 (Glass) or localhost:5001 (new backend)
    // No need to embed backend within Electron process

    const staticDir = app.isPackaged
        ? path.join(process.resourcesPath, 'out')
        : path.resolve(__dirname, '..', 'apps', 'renderer', 'out');
    const devFrontendOrigin = 'http://127.0.0.1:3000';
    let useLiveDevFrontend = false;

    const fs = require('fs');

    if (!app.isPackaged) {
        try {
            const devFrontendResponse = await fetch(`${devFrontendOrigin}/auth/login`, {
                method: 'GET',
                headers: { 'Accept': 'text/html' }
            });
            useLiveDevFrontend = devFrontendResponse.ok;
            if (useLiveDevFrontend) {
                logger.info(`[Web] Using live local frontend from ${devFrontendOrigin}`);
            }
        } catch (error) {
            logger.info('[Web] Live local frontend not detected - falling back to static out build');
        }
    }

    if (!useLiveDevFrontend && !fs.existsSync(staticDir)) {
        throw new Error(`Auxiliary web frontend build directory not found: ${staticDir}`);
    }

    const runtimeConfig = {
        API_URL: `http://localhost:${apiPort}/api/v1`,
        WEB_URL: `http://localhost:${frontendPort}`,
        timestamp: Date.now(),
        // Firebase environment variables for web app
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    // [Korean comment translated] [Korean comment translated] [Korean comment translated] [Korean comment translated] [Korean comment translated] Settings File [Korean comment translated]
    const tempDir = app.getPath('temp');
    const configPath = path.join(tempDir, 'runtime-config.json');
    fs.writeFileSync(configPath, JSON.stringify(runtimeConfig, null, 2));
    logger.info(`[TEXT] Runtime config created in temp location: ${configPath}`);

    const frontSrv = express();

    // Enable JSON body parsing for auth endpoints
    frontSrv.use(express.json());

    // [Korean comment translated] /runtime-config.json[Korean comment translated] Request[Korean comment translated] [Korean comment translated] [Korean comment translated] File[Korean comment translated] [Korean comment translated]
    frontSrv.get('/runtime-config.json', (req, res) => {
        res.sendFile(configPath);
    });

    // Handle authentication callback from browser
    frontSrv.post('/electron-auth-callback', async (req, res) => {
        try {
            const authData = req.body;
            logger.info('[Auth HTTP] [TARGET] Received authentication data from browser:', {
                uid: authData.uid,
                email: authData.email,
                hasToken: !!authData.idToken,
                timestamp: authData.timestamp
            });

            if (!authData.idToken) {
                logger.error('[Auth HTTP] [ERROR] Missing ID token in request');
                return res.status(400).json({ error: 'Missing ID token' });
            }

            logger.info('[Auth HTTP] [LOADING] Processing ID token authentication directly');

            const userRepository = require('./common/repositories/user');

            // Create user object from auth data
            const firebaseUser = {
                uid: authData.uid,
                email: authData.email || 'no-email@example.com',
                displayName: authData.displayName || 'User',
                photoURL: null
            };

            // 1. Sync user data to local DB
            await userRepository.findOrCreate(firebaseUser);
            logger.info('[Auth HTTP] User data synced with local DB.');

            // 2. Use the new ID token authentication method
            await authService.handleIdTokenAuthentication(authData);
            logger.info('[Auth HTTP] [OK] Successfully processed ID token authentication via HTTP');

            // Force broadcast user state to ensure UI updates immediately
            logger.info('[Auth HTTP] [SIGNAL] Broadcasting user state to all windows...');
            setTimeout(() => {
                authService.broadcastUserState();
                logger.info('[Auth HTTP] [AUDIO] User state broadcast completed');

                // Initialize auto-updater now that user is authenticated
                initAutoUpdaterOnAuth();
            }, 500);

            res.json({ success: true, message: 'Authentication processed successfully' });
        } catch (error) {
            logger.error('[Auth HTTP] [ERROR] Error processing authentication:', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // Handle local mode confirmation from browser
    frontSrv.post('/electron-local-mode', (req, res) => {
        try {
            logger.info('[Local Mode HTTP] Local mode confirmation received from browser');

            // Local mode is already the default state, just acknowledge
            res.json({ success: true, message: 'Local mode confirmed' });

            // Focus the main window
            focusMainWindow();
        } catch (error) {
            logger.error('[Local Mode HTTP] Error processing local mode:', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    if (useLiveDevFrontend) {
        frontSrv.use(async (req, res, next) => {
            try {
                const targetUrl = `${devFrontendOrigin}${req.originalUrl}`;
                const upstreamHeaders = {
                    accept: req.headers.accept || '*/*',
                };

                if (req.headers['content-type']) {
                    upstreamHeaders['content-type'] = req.headers['content-type'];
                }

                const upstreamResponse = await fetch(targetUrl, {
                    method: req.method,
                    headers: upstreamHeaders,
                    body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
                });

                res.status(upstreamResponse.status);
                upstreamResponse.headers.forEach((value, key) => {
                    if (key.toLowerCase() === 'content-encoding') return;
                    res.setHeader(key, value);
                });

                const bodyBuffer = await upstreamResponse.buffer();
                res.send(bodyBuffer);
            } catch (error) {
                logger.warn('[Web] Live frontend proxy failed, falling back to static handler', {
                    path: req.originalUrl,
                    error: error.message
                });
                next();
            }
        });
    }

    if (!useLiveDevFrontend) {
        frontSrv.use((req, res, next) => {
            if (req.path.indexOf('.') === -1 && req.path !== '/') {
                const htmlCandidates = [
                    path.join(staticDir, req.path + '.html'),
                    path.join(staticDir, req.path, 'index.html'),
                ];
                for (const htmlPath of htmlCandidates) {
                    if (fs.existsSync(htmlPath)) {
                        return res.sendFile(htmlPath);
                    }
                }
            }
            next();
        });

        frontSrv.use(express.static(staticDir));
    }

    const frontendServer = await new Promise((resolve, reject) => {
        const server = frontSrv.listen(frontendPort, '127.0.0.1', () => resolve(server));
        server.on('error', (error) => {
            // Handle EPIPE errors gracefully for frontend server
            if (error.code === 'EPIPE') {
                logger.warn('[Frontend Server] EPIPE error (broken pipe/write), continuing...', { error: error.message });
                return;
            }
            reject(error);
        });
        app.once('before-quit', () => server.close());
    });

    logger.info(`[OK] Frontend server started on http://localhost:${frontendPort}`);

    // Check if external backend service is running
    try {
        // Use ResourcePoolManager to prevent EPIPE errors during health check
        logger.debug('[Index] Making backend health check request via ResourcePoolManager');
        const response = await resourcePoolManager.queuedFetch(`http://localhost:${apiPort}/health`);
        if (response.ok) {
            logger.info(`[OK] External backend service detected on http://localhost:${apiPort}`);
        } else {
            logger.warn(`[WARNING] Backend service health check failed - status: ${response.status}`);
        }
    } catch (error) {
        logger.warn(`[WARNING] Cannot connect to external backend service on port ${apiPort}`);
        logger.warn(`   Make sure to start the backend service: cd backend && npm start`);
    }

    logger.info(`[START] Electron services ready:`);
    logger.info(`   Frontend: http://localhost:${frontendPort}`);
    logger.info(`   Expected Backend: http://localhost:${apiPort} (external service)`);

    return frontendPort;
}

// Auto-update initialization (called after user authentication)
let autoUpdaterInitialized = false;

async function initAutoUpdaterOnAuth() {
    // Only initialize once and only when user is authenticated
    if (autoUpdaterInitialized) {
        return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.isLoggedIn) {
        logger.info('[AutoUpdater] Skipped - user not authenticated');
        return;
    }

    try {
        const autoUpdateEnabled = await settingsService.getAutoUpdateSetting();
        if (!autoUpdateEnabled) {
            logger.info('[AutoUpdater] Skipped because auto-updates are disabled in settings');
            autoUpdaterInitialized = true; // Mark as initialized even if disabled
            return;
        }

        // Skip auto-updater in development mode
        if (!app.isPackaged) {
            logger.info('[AutoUpdater] Skipped in development (app is not packaged)');
            autoUpdaterInitialized = true; // Mark as initialized even if skipped
            return;
        }

        // Feed URL comes from app-update.yml embedded by electron-builder at build time
        // (configured via publish.owner/repo in electron-builder.yml)

        // Don't auto-download — let the user trigger it via the toast action button
        autoUpdater.autoDownload = false;

        autoUpdater.checkForUpdates()
            .catch(err => {
                logger.error('Error checking for updates:', { err });
            });

        const sendUpdateToast = (data) => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (!win.isDestroyed()) win.webContents.send('show-toast', data);
            });
        };

        autoUpdater.on('checking-for-update', () => {
            logger.info('[AutoUpdater] Checking for updates…');
        });

        autoUpdater.on('update-available', (info) => {
            logger.info('[AutoUpdater] Update available:', info.version);
            sendUpdateToast({
                icon: 'info',
                subtitle: 'Mise à jour disponible',
                title: `v${info.version} est disponible`,
                duration: 0,
                action: { label: 'Télécharger', channel: 'updater:download' },
            });
        });

        autoUpdater.on('update-not-available', () => {
            logger.info('[AutoUpdater] Application is up-to-date');
        });

        autoUpdater.on('error', (err) => {
            logger.error('[AutoUpdater] Error:', { err });
            sendUpdateToast({
                icon: 'warn',
                subtitle: 'Mise à jour',
                title: 'Erreur lors de la vérification des mises à jour',
                duration: 6000,
            });
        });

        autoUpdater.on('download-progress', (progress) => {
            logger.info(`[AutoUpdater] Downloading… ${Math.round(progress.percent)}%`);
        });

        autoUpdater.on('update-downloaded', (info) => {
            logger.info('[AutoUpdater] Update downloaded:', info.version);
            sendUpdateToast({
                icon: 'ok',
                subtitle: 'Prêt à installer',
                title: `v${info.version} téléchargée — redémarrez pour installer`,
                duration: 0,
                action: { label: 'Installer', channel: 'updater:install' },
            });
        });

        autoUpdaterInitialized = true;
        logger.info('[AutoUpdater] [OK] Auto-updater initialized successfully');
    } catch (e) {
        logger.error('[AutoUpdater] [ERROR] Failed to initialize:', { e });
    }
}

// Updater IPC handlers (called from toast action buttons)
ipcMain.handle('updater:download', () => {
    autoUpdater.downloadUpdate().catch(err => logger.error('[AutoUpdater] Download error:', { err }));
});

ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall();
});

// Dev-only: test update toasts from DevTools console
// Usage: window.api.invoke('updater:test', 'available') or 'downloaded'
ipcMain.handle('updater:test', (_event, type = 'available') => {
    if (app.isPackaged) return;
    const sendToast = (data) => BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) win.webContents.send('show-toast', data);
    });
    if (type === 'available') {
        sendToast({ icon: 'info', subtitle: 'Mise à jour disponible', title: 'v1.2.0 est disponible', duration: 0, action: { label: 'Télécharger', channel: 'updater:download' } });
    } else if (type === 'downloaded') {
        sendToast({ icon: 'ok', subtitle: 'Prêt à installer', title: 'v1.2.0 téléchargée — redémarrez pour installer', duration: 0, action: { label: 'Installer', channel: 'updater:install' } });
    } else if (type === 'error') {
        sendToast({ icon: 'warn', subtitle: 'Mise à jour', title: 'Erreur lors de la vérification des mises à jour', duration: 6000 });
    }
});

// Multi-provider API key management for web dashboard
ipcMain.handle('get-all-api-key-status', async (event, { userId }) => {
    try {
        // Returns { openai: true, gemini: false, ... }
        return await modelStateService.getAllApiKeyStatus(userId);
    } catch (err) {
        return { error: err.message };
    }
});
ipcMain.handle('get-all-api-keys', async (event, { userId }) => {
    try {
        return await modelStateService.getAllApiKeys(userId);
    } catch (err) {
        return { error: err.message };
    }
});
ipcMain.handle('remove-api-key', async (event, { userId, provider }) => {
    try {
        await modelStateService.removeApiKey(provider, userId);
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
});


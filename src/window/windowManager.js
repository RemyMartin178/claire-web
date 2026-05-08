const { BrowserWindow, globalShortcut, screen, app, shell } = require('electron');
const WindowLayoutManager = require('./windowLayoutManager');
const SmoothMovementManager = require('./smoothMovementManager');
const path = require('node:path');
const os = require('os');
const fs = require('fs');
const shortcutsService = require('../features/shortcuts/shortcutsService');
const internalBridge = require('../bridge/internalBridge');
const permissionRepository = require('../common/repositories/permission');
const { themeService } = require('../domains/ui');

/* ────────────────[ ENHANCED GLASS SYSTEM ]─────────────── */
const { platformManager } = require('../main/platform-manager');
const { createLogger } = require('../common/services/logger.js');

const logger = createLogger('WindowManager');

// FIX: Flag global pour désactiver updateLayout pendant le drag
let isDraggingHeader = false;

let liquidGlass;
let shouldUseLiquidGlass = platformManager.capabilities.liquidGlass;

if (shouldUseLiquidGlass) {
    try {
        liquidGlass = require('electron-liquid-glass');
        logger.info('[WindowManager] Liquid glass support initialized via platform manager');
    } catch (e) {
        logger.warn('Could not load optional dependency "electron-liquid-glass". The feature will be disabled.');
        shouldUseLiquidGlass = false;
    }
}

logger.info('Platform:');
logger.info('Liquid glass supported:');
logger.info('Platform capabilities:', { capabilities: platformManager.capabilities });

/* ────────────────[ LIQUID GLASS API ]─────────────── */
const liquidGlassAPI = {
    async addView() {
        if (!shouldUseLiquidGlass || !liquidGlass) {
            return { success: false, error: 'Liquid glass not supported' };
        }

        try {
            const mainWindow = getMainWindow();
            if (!mainWindow) {
                return { success: false, error: 'Main window not found' };
            }

            const viewId = liquidGlass.addView(mainWindow.getNativeWindowHandle());
            if (viewId !== -1) {
                return { success: true, viewId };
            } else {
                return { success: false, error: 'Failed to create liquid glass view' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async removeView(viewId) {
        if (!shouldUseLiquidGlass || !liquidGlass) {
            return { success: false, error: 'Liquid glass not supported' };
        }

        try {
            liquidGlass.removeView(viewId);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async setVariant(viewId, variant) {
        if (!shouldUseLiquidGlass || !liquidGlass) {
            return { success: false, error: 'Liquid glass not supported' };
        }

        try {
            const variantMap = {
                'default': liquidGlass.GlassMaterialVariant.bubbles,
                'bubbles': liquidGlass.GlassMaterialVariant.bubbles,
                'ultra-dark': liquidGlass.GlassMaterialVariant.ultra_dark,
                'light': liquidGlass.GlassMaterialVariant.light,
                'vibrant': liquidGlass.GlassMaterialVariant.vibrant
            };

            const glassVariant = variantMap[variant] || liquidGlass.GlassMaterialVariant.bubbles;
            liquidGlass.unstable_setVariant(viewId, glassVariant);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async setScrim(viewId, scrim) {
        if (!shouldUseLiquidGlass || !liquidGlass) {
            return { success: false, error: 'Liquid glass not supported' };
        }

        try {
            liquidGlass.unstable_setScrim(viewId, scrim);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async setSubdued(viewId, subdued) {
        if (!shouldUseLiquidGlass || !liquidGlass) {
            return { success: false, error: 'Liquid glass not supported' };
        }

        try {
            liquidGlass.unstable_setSubdued(viewId, subdued);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

function getMainWindow() {
    for (const [name, window] of windowPool.entries()) {
        if (name === 'main' || name === 'listen') {
            return window;
        }
    }
    return null;
}
/* ────────────────[ LIQUID GLASS API ]─────────────── */

let isContentProtectionOn = true;
let lastVisibleWindows = new Set(['header']);

let currentHeaderState = 'apikey';
const windowPool = new Map();

let dashboardWindow = null;
// Dev: override via DASHBOARD_DEV_URL. Prod: load from renderer.clairia.app.
const DASHBOARD_URL = process.env.DASHBOARD_DEV_URL || 'https://renderer.clairia.app/electron-login';

let settingsHideTimer = null;
let agentSelectorHideTimer = null;

// État centralisé pour la fenêtre Settings (source de vérité unique côté Main)
const settingsState = {
    visibleDesired: false,
    pinned: false,             // ouvert par un clic explicite
    suppressAutoHideUntil: 0,  // timestamp : ignore les auto-hide pendant ce délai
};


let layoutManager = null;

// ─── Overlay (Fix 5: single fullscreen transparent window) ────────────────────
let overlayMode = false;
let overlayWindow = null;
let overlayPillPos = null; // pill position tracked for layout calculations

// Polling: hit-test rects sent by renderer; main process toggles setIgnoreMouseEvents
// directly without any IPC round-trip latency.
let _overlayHitRects = [];   // [{x,y,width,height}] in logical screen pixels
let _overlayInteractive = false; // current state (true = NOT ignoring)
let _overlayDragging = false; // locked interactive during drag
let _cursorTrackTimer = null;
let _dragSafetyTimer = null;  // reset _overlayDragging si setDragging(false) n'arrive jamais

/**
 * Virtual window proxy — maps one of the named panels (ask, listen, settings…)
 * to a React-rendered panel inside the single overlay BrowserWindow.
 * All OS-level window methods become safe no-ops or IPC delegates.
 */
class OverlayPanel {
    constructor(name, overlayWin) {
        this.name = name;
        this._overlayWin = overlayWin;
        this._visible = false;
        this.__lockedByButton = false;
    }
    isDestroyed() { return !this._overlayWin || this._overlayWin.isDestroyed(); }
    get webContents() { return this._overlayWin.webContents; }
    isVisible() { return this._visible; }
    show() {
        this._visible = true;
        if (!this._overlayWin.isDestroyed())
            this._overlayWin.webContents.send('overlay:panel-visibility', { name: this.name, visible: true });
    }
    hide() {
        this._visible = false;
        if (!this._overlayWin.isDestroyed())
            this._overlayWin.webContents.send('overlay:panel-visibility', { name: this.name, visible: false });
    }
    // Geometry: OverlayRoot handles layout — these are safe no-ops
    getBounds() { return { x: 0, y: 0, width: 600, height: 400 }; }
    setBounds() { }
    setPosition() { }
    setOpacity() { }
    setAlwaysOnTop() { }
    moveTop() { }
    focus() { if (!this._overlayWin.isDestroyed()) this._overlayWin.focus(); }
    setIgnoreMouseEvents() { }
    // Height resize: tell OverlayRoot to resize the panel div
    setContentSize(w, h) {
        if (!this._overlayWin.isDestroyed())
            this._overlayWin.webContents.send('overlay:panel-resize', { name: this.name, width: w, height: h });
    }
    getContentBounds() { return this.getBounds(); }
    getMinimumSize() { return [200, 100]; }
    getMaximumSize() { return [1200, 900]; }
    isMinimized() { return false; }
    restore() { }
    isResizable() { return true; }
    setResizable() { }
    setVisibleOnAllWorkspaces() { }
    setContentProtection() { }
    setWindowButtonVisibility() { }
    on(ev, fn) { if (!this._overlayWin.isDestroyed()) this._overlayWin.on(ev, fn); }
    once(ev, fn) { if (!this._overlayWin.isDestroyed()) this._overlayWin.once(ev, fn); }
}

function createOverlayWindow() {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        logger.info('[Overlay] Already exists, skipping creation');
        return overlayWindow;
    }
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x: dX, y: dY, width: dW, height: dH } = primaryDisplay.bounds;

    overlayWindow = new BrowserWindow({
        x: dX, y: dY, width: dW, height: dH,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        vibrancy: false,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        resizable: false,
        movable: false,
        focusable: true,
        acceptFirstMouse: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            backgroundThrottling: false,
            webSecurity: false,
            enableRemoteModule: false,
            devTools: !app.isPackaged,
            spellcheck: false,
        },
        icon: path.join(__dirname, '../../build/icon.ico'),
    });

    // Use 'screen-saver' level so the overlay stays above all other windows (including Chrome)
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    if (process.platform === 'darwin') overlayWindow.setWindowButtonVisibility(false);
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlayWindow.setContentProtection(isContentProtectionOn);
    // Start click-through; the main-process polling loop toggles this at 60fps
    // based on cursor position vs hit-rects sent by the renderer — zero IPC latency.
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    _overlayInteractive = false;
    _startOverlayPolling();

    overlayWindow.loadFile(path.join(__dirname, '../ui/app/overlay.html'));
    overlayWindow.show();

    // Hide instead of close (keep process alive in background)
    overlayWindow.on('close', (e) => {
        if (!global.isQuitting) {
            e.preventDefault();
            overlayWindow.hide();
        }
    });

    // Replace feature windows in pool with virtual OverlayPanel proxies
    const panelNames = ['listen', 'ask', 'settings', 'agent-selector', 'shortcut-settings'];
    panelNames.forEach(name => {
        const existing = windowPool.get(name);
        if (existing && !(existing instanceof OverlayPanel) && !existing.isDestroyed()) existing.destroy();
        windowPool.set(name, new OverlayPanel(name, overlayWindow));
    });
    windowPool.set('overlay', overlayWindow);

    applyThemeToNewWindow(overlayWindow, 'overlay');
    overlayMode = true;
    logger.info('[Overlay] Created fullscreen overlay window');
    return overlayWindow;
}

function destroyOverlayWindow() {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    _stopOverlayPolling();
    ['listen', 'ask', 'settings', 'agent-selector', 'shortcut-settings', 'overlay'].forEach(name => {
        windowPool.delete(name);
    });
    overlayWindow.destroy();
    overlayWindow = null;
    overlayMode = false;
    overlayPillPos = null;
    logger.info('[Overlay] Destroyed overlay window');
}

const setOverlayClickThrough = (enabled) => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    overlayWindow.setIgnoreMouseEvents(!!enabled, { forward: true });
};

// setOverlayShape is intentionally a no-op: setShape() visually clips the
// window in addition to restricting hit-testing, breaking transparent rendering.
// Click-through is handled by setIgnoreMouseEvents(true,{forward:true}) +
// CSS pointer-events in the renderer. No shape API needed.
const setOverlayShape = (_rects) => { };

const setOverlayPillPosition = (x, y) => {
    overlayPillPos = { x, y };
    // Keep hidden header window position in sync so layout calculations stay accurate
    const header = windowPool.get('header');
    if (header && !header.isDestroyed()) {
        header.setPosition(Math.round(x), Math.round(y), false);
    }
};

const getOverlayInitialState = () => {
    const header = windowPool.get('header');
    if (header && !header.isDestroyed()) {
        const [x, y] = header.getPosition();
        return { pillX: x, pillY: y };
    }
    const display = screen.getPrimaryDisplay();
    return { pillX: Math.round((display.workArea.width - 353) / 2), pillY: 21 };
};

const getOverlayWindow = () => overlayWindow;

// ── Overlay cursor polling ────────────────────────────────────────────────────
const setOverlayHitRects = (rects) => {
    _overlayHitRects = Array.isArray(rects) ? rects : [];
};

const setOverlayDragging = (dragging) => {
    if (_dragSafetyTimer) { clearTimeout(_dragSafetyTimer); _dragSafetyTimer = null; }
    _overlayDragging = !!dragging;
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    if (_overlayDragging) {
        // Lock interactive for drag — don't toggle off while dragging
        if (!_overlayInteractive) {
            _overlayInteractive = true;
            overlayWindow.setIgnoreMouseEvents(false);
        }
        // Safety net : si setDragging(false) n'arrive jamais, reset après 2s
        _dragSafetyTimer = setTimeout(() => {
            _overlayDragging = false;
            _dragSafetyTimer = null;
        }, 2000);
    }
    // When drag ends, let the poller decide on the next tick
};

const _tickOverlayCursor = () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    if (_overlayDragging) return; // locked during drag
    const cursor = screen.getCursorScreenPoint();
    const over = _overlayHitRects.some(r =>
        cursor.x >= r.x && cursor.x < r.x + r.width &&
        cursor.y >= r.y && cursor.y < r.y + r.height
    );
    if (over !== _overlayInteractive) {
        _overlayInteractive = over;
        if (over) {
            overlayWindow.setIgnoreMouseEvents(false);
        } else {
            overlayWindow.setIgnoreMouseEvents(true, { forward: true });
        }
    }
};

const _startOverlayPolling = () => {
    if (_cursorTrackTimer) return;
    _cursorTrackTimer = setInterval(_tickOverlayCursor, 16); // ~60fps
};

const _stopOverlayPolling = () => {
    if (_cursorTrackTimer) { clearInterval(_cursorTrackTimer); _cursorTrackTimer = null; }
    if (_dragSafetyTimer) { clearTimeout(_dragSafetyTimer); _dragSafetyTimer = null; }
    _overlayHitRects = [];
    _overlayInteractive = false;
    _overlayDragging = false;
};

/**
 * Returns the BrowserWindow whose webContents hosts the MainHeader pill.
 * In overlay mode this is the overlay window; in normal mode it's the header window.
 */
const getPillWindow = () => {
    if (overlayMode && overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;
    return windowPool.get('header') || null;
};

// Garde-fous de layout
let layoutLock = false;
function updateLayout() {
    if (isDraggingHeader) {
        logger.debug('[WindowManager] updateLayout skipped - header dragging (positions updated inline)');
        return;
    }
    if (layoutLock) {
        logger.debug('[WindowManager] updateLayout blocked - already in progress');
        return;
    }
    if (layoutManager) {
        layoutLock = true;
        try {
            layoutManager.updateLayout();
        } finally {
            layoutLock = false;
        }
    }
}
let movementManager = null;

/**
 * @param {BrowserWindow} win
 * @param {number} from
 * @param {number} to
 * @param {number} duration
 * @param {Function=} onComplete 
 */
function fadeWindow(win, from, to, duration = 250, onComplete) {
    if (!win || win.isDestroyed()) return;

    const FPS = 60;
    const steps = Math.max(1, Math.round(duration / (1000 / FPS)));
    let currentStep = 0;

    win.setOpacity(from);

    const timer = setInterval(() => {
        if (win.isDestroyed()) { clearInterval(timer); return; }

        currentStep += 1;
        const progress = currentStep / steps;
        const eased = progress < 1
            ? 1 - Math.pow(1 - progress, 3)
            : 1;

        win.setOpacity(from + (to - from) * eased);

        if (currentStep >= steps) {
            clearInterval(timer);
            win.setOpacity(to);
            onComplete && onComplete();
        }
    }, 1000 / FPS);
}

const showSettingsWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible: true });
};

const hideSettingsWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible: false });
};

// Remplace requestSettingsVisible - plus de deadlock idempotent
const requestSettingsVisible = (visible, reason = '') => {
    logger.info(`[WindowManager] requestSettingsVisible: ${visible} (reason: ${reason})`);
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible });
};

// Toggle simple : lit directement isVisible() côté main  
const toggleSettingsWindow = () => {
    const settingsWin = windowPool.get('settings');
    const isVisible = settingsWin && !settingsWin.isDestroyed() && settingsWin.isVisible();
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible: !isVisible });
};

const cancelHideSettingsWindow = () => {
    // Désactivé : plus de hover
};

/**
 * Active ou désactive le click-through du header.
 * Par défaut: désactivé au démarrage.
 * @param {boolean} enabled
 */
const setHeaderClickThrough = (enabled) => {
    const header = windowPool.get('header');
    if (!header || header.isDestroyed()) return;
    header.setIgnoreMouseEvents(!!enabled, { forward: true });
    logger.info(`[WindowManager] setHeaderClickThrough: ${enabled}`);
};

/**
 * Gère un pointerdown global pour fermer Settings si on clique en dehors.
 * @param {{ x: number, y: number }} pos
 */
const handleGlobalPointerDown = (pos) => {
    if (!settingsState.pinned) return;
    if (!settingsState.visibleDesired) return;
    if (Date.now() < settingsState.suppressAutoHideUntil) return;

    const header = windowPool.get('header');
    const settings = windowPool.get('settings');
    if (!header || !settings || settings.isDestroyed()) return;

    const inside = (b) =>
        pos.x >= b.x && pos.x <= b.x + b.width &&
        pos.y >= b.y && pos.y <= b.y + b.height;

    if (!inside(header.getBounds()) && !inside(settings.getBounds())) {
        settingsState.pinned = false;
        requestSettingsVisible(false, 'click-outside');
    }
};


const showAgentSelectorWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'agent-selector', visible: true });
};

const toggleAgentSelectorWindow = () => {
    const w = windowPool.get('agent-selector');
    if (!w || w.isDestroyed()) return;
    internalBridge.emit('window:requestVisibility', { name: 'agent-selector', visible: !w.isVisible() });
};

const hideAgentSelectorWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'agent-selector', visible: false });
};

const cancelHideAgentSelectorWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'agent-selector', visible: true });
};


function setupWindowController(windowPool, layoutManager, movementManager) {
    // Initialize theme service with window pool reference
    themeService.setWindowPool(windowPool);

    internalBridge.on('window:requestVisibility', ({ name, visible }) => {
        handleWindowVisibilityRequest(windowPool, layoutManager, movementManager, name, visible);
    });
    internalBridge.on('window:requestToggleAllWindowsVisibility', ({ targetVisibility }) => {
        changeAllWindowsVisibility(windowPool, targetVisibility);
    });
    internalBridge.on('window:moveToDisplay', ({ displayId }) => {
        movementManager.moveToDisplay(displayId);
    });
    internalBridge.on('window:moveToEdge', ({ direction }) => {
        movementManager.moveToEdge(direction);
    });
    internalBridge.on('window:moveStep', ({ direction }) => {
        movementManager.moveStep(direction);
    });
}

function changeAllWindowsVisibility(windowPool, targetVisibility) {
    // Overlay mode: toggle the overlay window directly
    if (overlayMode && overlayWindow && !overlayWindow.isDestroyed()) {
        const isVisible = overlayWindow.isVisible();
        if (typeof targetVisibility === 'boolean' && isVisible === targetVisibility) return;
        if (isVisible) {
            overlayWindow.hide();
        } else {
            overlayWindow.show();
        }
        return;
    }

    const header = windowPool.get('header');
    if (!header) return;

    if (typeof targetVisibility === 'boolean' &&
        header.isVisible() === targetVisibility) {
        return;
    }

    if (header.isVisible()) {
        lastVisibleWindows.clear();

        windowPool.forEach((win, name) => {
            if (win && !win.isDestroyed() && win.isVisible()) {
                lastVisibleWindows.add(name);
            }
        });

        lastVisibleWindows.forEach(name => {
            if (name === 'header') return;
            const win = windowPool.get(name);
            if (win && !win.isDestroyed()) win.hide();
        });
        header.hide();

        return;
    }

    lastVisibleWindows.forEach(name => {
        const win = windowPool.get(name);
        if (win && !win.isDestroyed())
            win.show();
    });
}

/**
 * 
 * @param {Map<string, BrowserWindow>} windowPool
 * @param {WindowLayoutManager} layoutManager 
 * @param {SmoothMovementManager} movementManager
 * @param {'listen' | 'ask' | 'settings' | 'shortcut-settings'} name 
 * @param {boolean} shouldBeVisible 
 */
async function handleWindowVisibilityRequest(windowPool, layoutManager, movementManager, name, shouldBeVisible) {
    logger.info('Request: set window visibility to', { name, shouldBeVisible });
    let win = windowPool.get(name);

    if (!win || win.isDestroyed()) {
        logger.info(`Window '${name}' not found, creating it...`);

        // In overlay mode, panels are React components — nothing to "create"
        if (overlayMode) {
            logger.warn(`[Overlay] Panel '${name}' not in pool — overlay may not be ready yet`);
            return;
        }

        // Call createFeatureWindows with the header and the specific window name
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            createFeatureWindows(header, [name]);
            // Get the newly created window
            win = windowPool.get(name);
            if (!win) {
                logger.error(`Failed to create window '${name}'`);
                return;
            }
            logger.info(`Window '${name}' created successfully`);
        } else {
            logger.error(`Cannot create window '${name}' - header window not found`);
            return;
        }
    }

    // Overlay mode: skip all OS-level animations — OverlayPanel.show()/hide() sends IPC directly
    if (win instanceof OverlayPanel) {
        if (shouldBeVisible) win.show();
        else win.hide();
        return;
    }

    if (name !== 'settings' && name !== 'agent-selector') {
        const isCurrentlyVisible = win.isVisible();
        if (isCurrentlyVisible === shouldBeVisible) {
            logger.info(`Window '${name}' is already in the desired state.`);
            return;
        }
    }

    const disableClicks = (selectedWindow) => {
        for (const [name, win] of windowPool) {
            if (win !== selectedWindow && !win.isDestroyed()) {
                win.setIgnoreMouseEvents(true, { forward: true });
            }
        }
    };

    const restoreClicks = () => {
        for (const [, win] of windowPool) {
            if (!win.isDestroyed()) win.setIgnoreMouseEvents(false);
        }
    };

    if (name === 'settings') {
        if (shouldBeVisible) {
            if (settingsHideTimer) {
                clearTimeout(settingsHideTimer);
                settingsHideTimer = null;
            }
            const doShow = () => {
                if (win.isDestroyed()) return;
                const position = layoutManager.calculateSettingsWindowPosition();
                if (position) {
                    try {
                        const px = Number.isFinite(position.x) ? Math.round(position.x) : win.getBounds().x;
                        const py = Number.isFinite(position.y) ? Math.round(position.y) : win.getBounds().y;

                        if (movementManager && movementManager.animateWindow) {
                            movementManager.animateWindow(win, px, py, {
                                duration: 350,
                                onComplete: () => {
                                    if (!win.isDestroyed()) {
                                        win.setAlwaysOnTop(true, 'pop-up-menu');
                                        win.show();
                                        win.moveTop();
                                        win.focus();
                                    }
                                }
                            });
                        } else {
                            win.setPosition(px, py, false);
                            win.setAlwaysOnTop(true, 'pop-up-menu');
                            win.show();
                            win.moveTop();
                            win.focus();
                        }
                    } catch (e) {
                        logger.warn('[WindowManager] Animated setPosition failed for settings:', e.message);
                    }
                }
            };
            if (win.webContents.isLoading()) {
                win.webContents.once('did-finish-load', doShow);
            } else {
                doShow();
            }
        } else {
            // Hide immediately, since there's no more hover-to-keep-open logic
            if (settingsHideTimer) {
                clearTimeout(settingsHideTimer);
                settingsHideTimer = null;
            }
            if (win && !win.isDestroyed()) {
                win.setAlwaysOnTop(false);
                win.hide();
            }
            win.__lockedByButton = false;
        }
        return;
    }

    if (name === 'agent-selector') {
        if (shouldBeVisible) {
            // Cancel any pending hide operations
            if (agentSelectorHideTimer) {
                clearTimeout(agentSelectorHideTimer);
                agentSelectorHideTimer = null;
            }
            const position = layoutManager.calculateAgentSelectorWindowPosition();
            if (position) {
                const doShow = () => {
                    if (win.isDestroyed()) return;
                    if (movementManager && movementManager.animateWindow) {
                        movementManager.animateWindow(win, position.x, position.y, {
                            duration: 350,
                            onComplete: () => {
                                if (!win.isDestroyed()) {
                                    win.__lockedByButton = true;
                                    win.show();
                                    win.moveTop();
                                    win.setAlwaysOnTop(true);
                                }
                            }
                        });
                    } else {
                        win.setBounds(position);
                        win.__lockedByButton = true;
                        win.show();
                        win.moveTop();
                        win.setAlwaysOnTop(true);
                    }
                };
                doShow();
            } else {
                // Fallback: use current bounds and just show the window
                logger.warn('Could not calculate agent selector window position, using fallback position');
                const currentBounds = win.getBounds();

                // Ensure window has minimum viable bounds
                if (currentBounds.width < 200 || currentBounds.height < 150) {
                    win.setBounds({ x: currentBounds.x, y: currentBounds.y, width: 320, height: 280 });
                }

                win.__lockedByButton = true;
                win.show();
                win.moveTop();
                win.setAlwaysOnTop(true);
            }
        } else {
            // Hide immediately, since there's no more hover logic
            if (agentSelectorHideTimer) {
                clearTimeout(agentSelectorHideTimer);
                agentSelectorHideTimer = null;
            }
            if (win && !win.isDestroyed()) {
                win.setAlwaysOnTop(false);
                win.hide();
            }
            win.__lockedByButton = false;
        }
        return;
    }

    if (name === 'shortcut-settings') {
        if (shouldBeVisible) {
            layoutManager.positionShortcutSettingsWindow();
            if (process.platform === 'darwin') {
                win.setAlwaysOnTop(true, 'screen-saver');
            } else {
                win.setAlwaysOnTop(true);
            }
            // globalShortcut.unregisterAll();
            disableClicks(win);
            win.show();
        } else {
            if (process.platform === 'darwin') {
                win.setAlwaysOnTop(false, 'screen-saver');
            } else {
                win.setAlwaysOnTop(false);
            }
            restoreClicks();
            win.hide();
        }
        return;
    }

    if (name === 'listen' || name === 'ask') {
        const otherName = name === 'listen' ? 'ask' : 'listen';
        const otherWin = windowPool.get(otherName);
        const isOtherWinVisible = otherWin && !otherWin.isDestroyed() && otherWin.isVisible();

        const ANIM_OFFSET_X = 100;
        const ANIM_OFFSET_Y = 20;

        if (shouldBeVisible) {
            win.setOpacity(0);

            if (name === 'listen') {
                if (!isOtherWinVisible) {
                    const targets = layoutManager.getTargetBoundsForFeatureWindows({ listen: true, ask: false });
                    if (!targets.listen) return;

                    const startPos = { x: targets.listen.x - ANIM_OFFSET_X, y: targets.listen.y };
                    win.setBounds(startPos);
                    win.show();
                    fadeWindow(win, 0, 1);
                    movementManager.animateWindow(win, targets.listen.x, targets.listen.y);

                } else {
                    const targets = layoutManager.getTargetBoundsForFeatureWindows({ listen: true, ask: true });
                    if (!targets.listen || !targets.ask) return;

                    const startListenPos = { x: targets.listen.x - ANIM_OFFSET_X, y: targets.listen.y };
                    win.setBounds(startListenPos);

                    win.show();
                    fadeWindow(win, 0, 1);
                    movementManager.animateWindow(otherWin, targets.ask.x, targets.ask.y);
                    movementManager.animateWindow(win, targets.listen.x, targets.listen.y);
                }
            } else if (name === 'ask') {
                if (!isOtherWinVisible) {
                    const targets = layoutManager.getTargetBoundsForFeatureWindows({ listen: false, ask: true });
                    if (!targets.ask) return;

                    const startPos = { x: targets.ask.x, y: targets.ask.y - ANIM_OFFSET_Y };
                    win.setBounds(startPos);
                    win.show();
                    fadeWindow(win, 0, 1);
                    movementManager.animateWindow(win, targets.ask.x, targets.ask.y);

                } else {
                    const targets = layoutManager.getTargetBoundsForFeatureWindows({ listen: true, ask: true });
                    if (!targets.listen || !targets.ask) return;

                    const startAskPos = { x: targets.ask.x, y: targets.ask.y - ANIM_OFFSET_Y };
                    win.setBounds(startAskPos);

                    win.show();
                    fadeWindow(win, 0, 1);
                    movementManager.animateWindow(otherWin, targets.listen.x, targets.listen.y);
                    movementManager.animateWindow(win, targets.ask.x, targets.ask.y);
                }
            }
        } else {
            const currentBounds = win.getBounds();
            fadeWindow(
                win, 1, 0, undefined,
                () => win.hide()
            );
            if (name === 'listen') {
                if (!isOtherWinVisible) {
                    const targetX = currentBounds.x - ANIM_OFFSET_X;
                    movementManager.animateWindow(win, targetX, currentBounds.y);
                } else {
                    const targetX = currentBounds.x - currentBounds.width;
                    movementManager.animateWindow(win, targetX, currentBounds.y);
                }
            } else if (name === 'ask') {
                if (!isOtherWinVisible) {
                    const targetY = currentBounds.y - ANIM_OFFSET_Y;
                    movementManager.animateWindow(win, currentBounds.x, targetY);
                } else {
                    const targetAskY = currentBounds.y - ANIM_OFFSET_Y;
                    movementManager.animateWindow(win, currentBounds.x, targetAskY);

                    const targets = layoutManager.getTargetBoundsForFeatureWindows({ listen: true, ask: false });
                    if (targets.listen) {
                        movementManager.animateWindow(otherWin, targets.listen.x, targets.listen.y);
                    }
                }
            }
        }
    }
}


const setContentProtection = (status) => {
    isContentProtectionOn = status;
    logger.info('Content protection toggled to:');
    windowPool.forEach(win => {
        if (win && !win.isDestroyed()) {
            win.setContentProtection(isContentProtectionOn);
        }
    });
};

const getContentProtectionStatus = () => isContentProtectionOn;

const toggleContentProtection = () => {
    const newStatus = !getContentProtectionStatus();
    setContentProtection(newStatus);
    return newStatus;
};

const resizeHeaderWindow = ({ width, height }) => {
    const header = windowPool.get('header');
    if (header) {
        logger.info('Resize request: x');

        if (movementManager && movementManager.isAnimating) {
            logger.info('[WindowManager] Skipping resize during animation');
            return { success: false, error: 'Cannot resize during animation' };
        }

        const currentBounds = header.getBounds();
        const currentContentBounds = header.getContentBounds();
        logger.info('Current bounds: x at (, )');

        if (currentContentBounds.width === width && currentContentBounds.height === height) {
            logger.info('[WindowManager] Already at target size, skipping resize');
            return { success: true };
        }

        const wasResizable = header.isResizable();
        if (!wasResizable) {
            header.setResizable(true);
        }

        const centerX = currentBounds.x + currentBounds.width / 2;
        const newX = Math.round(centerX - width / 2);

        const display = getCurrentDisplay(header);
        const { x: workAreaX, width: workAreaWidth } = display.workArea;

        const clampedX = Math.max(workAreaX, Math.min(workAreaX + workAreaWidth - width, newX));

        header.setPosition(clampedX, currentBounds.y, false);
        header.setContentSize(width, height);

        if (!wasResizable) {
            header.setResizable(false);
        }

        if (updateLayout) {
            updateLayout();
        }

        return { success: true };
    }
    return { success: false, error: 'Header window not found' };
};


const openLoginPage = () => {
    // Use production URL when packaged, localhost in dev
    const isPackaged = app.isPackaged;
    const webUrl = isPackaged
        ? 'https://app.clairia.app'
        : (process.env.pickleglass_WEB_URL || 'https://app.clairia.app');
    const personalizeUrl = `${webUrl}/personalize?desktop=true`;
    shell.openExternal(personalizeUrl);
    logger.info('Opening personalization page:', personalizeUrl);
};

const moveWindowStep = (direction) => {
    if (movementManager) {
        movementManager.moveStep(direction);
    }
};


function createFeatureWindows(header, namesToCreate) {
    // if (windowPool.has('listen')) return;

    const commonChildOptions = {
        // parent: header  ← REMOVED: on Windows, child window resize/move events bubble up to
        //                   the parent's 'resize' event, causing an infinite updateLayout loop.
        //                   Feature windows use alwaysOnTop instead to stay above other apps.
        show: false,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        vibrancy: false,
        hasShadow: false,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        alwaysOnTop: true,
        resizable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            devTools: !app.isPackaged,
            spellcheck: false,
        },
        icon: path.join(__dirname, '../../build/icon.ico'),
    };

    const createFeatureWindow = (name) => {
        if (windowPool.has(name)) return;

        switch (name) {
            case 'listen': {
                const listen = new BrowserWindow({
                    ...commonChildOptions, width: 400, minWidth: 400, maxWidth: 900,
                    maxHeight: 900,
                });
                listen.setContentProtection(isContentProtectionOn);
                listen.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
                if (process.platform === 'darwin') {
                    listen.setWindowButtonVisibility(false);
                }
                const listenLoadOptions = { query: { view: 'listen' } };
                if (!shouldUseLiquidGlass) {
                    listen.loadFile(path.join(__dirname, '../ui/app/content.html'), listenLoadOptions);
                }
                else {
                    listenLoadOptions.query.glass = 'true';
                    listen.loadFile(path.join(__dirname, '../ui/app/content.html'), listenLoadOptions);
                    listen.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(listen.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                            // liquidGlass.unstable_setScrim(viewId, 1);
                            // liquidGlass.unstable_setSubdued(viewId, 1);
                        }
                    });
                }
                // DevTools disabled by default
                /* if (!app.isPackaged && process.env.OPEN_DEV_TOOLS === 'true') {
                    listen.webContents.openDevTools({ mode: 'detach' });
                } */
                windowPool.set('listen', listen);
                // Apply current theme to the listen window
                applyThemeToNewWindow(listen, 'listen');
                break;
            }

            // ask
            case 'ask': {
                const ask = new BrowserWindow({
                    ...commonChildOptions,
                    width: 600,
                    height: 400, // Reasonable initial height - will be adjusted by renderer
                    minHeight: 200,
                    maxHeight: 900
                });
                ask.setContentProtection(isContentProtectionOn);
                ask.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
                if (process.platform === 'darwin') {
                    ask.setWindowButtonVisibility(false);
                }
                const askLoadOptions = { query: { view: 'ask' } };
                if (!shouldUseLiquidGlass) {
                    ask.loadFile(path.join(__dirname, '../ui/app/content.html'), askLoadOptions);
                }
                else {
                    askLoadOptions.query.glass = 'true';
                    ask.loadFile(path.join(__dirname, '../ui/app/content.html'), askLoadOptions);
                    ask.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(ask.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                            // liquidGlass.unstable_setScrim(viewId, 1);
                            // liquidGlass.unstable_setSubdued(viewId, 1);
                        }
                    });
                }

                // Open DevTools in development
                // DevTools disabled by default
                /* if (!app.isPackaged && process.env.OPEN_DEV_TOOLS === 'true') {
                    ask.webContents.openDevTools({ mode: 'detach' });
                } */
                windowPool.set('ask', ask);
                // Apply current theme to the ask window
                applyThemeToNewWindow(ask, 'ask');
                break;
            }

            // settings
            case 'settings': {
                // Use larger window size for liquid glass mode to accommodate horizontal layout
                const windowOptions = shouldUseLiquidGlass
                    ? { ...commonChildOptions, width: 800, height: 80, maxHeight: 120, minHeight: 60, parent: undefined }
                    : { ...commonChildOptions, width: 240, height: 400, maxHeight: 400, minHeight: 200, parent: undefined };

                const settings = new BrowserWindow(windowOptions);
                settings.setContentProtection(isContentProtectionOn);
                settings.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
                if (process.platform === 'darwin') {
                    settings.setWindowButtonVisibility(false);
                }
                const settingsLoadOptions = { query: { view: 'settings' } };
                if (!shouldUseLiquidGlass) {
                    settings.loadFile(path.join(__dirname, '../ui/app/content.html'), settingsLoadOptions)
                        .catch(console.error);
                }
                else {
                    settingsLoadOptions.query.glass = 'true';
                    settings.loadFile(path.join(__dirname, '../ui/app/content.html'), settingsLoadOptions)
                        .catch(console.error);
                    settings.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(settings.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                            // liquidGlass.unstable_setScrim(viewId, 1);
                            // liquidGlass.unstable_setSubdued(viewId, 1);
                        }
                    });
                }
                windowPool.set('settings', settings);
                // Apply current theme to the settings window
                applyThemeToNewWindow(settings, 'settings');

                // DevTools disabled by default
                /* if (!app.isPackaged && process.env.OPEN_DEV_TOOLS === 'true') {
                    settings.webContents.openDevTools({ mode: 'detach' });
                } */
                break;
            }

            // agent-selector
            case 'agent-selector': {
                // Ensure window has proper initial position near header
                const header = windowPool.get('header');
                let initialX = 100, initialY = 100; // Default fallback position

                if (header && !header.isDestroyed()) {
                    const headerBounds = header.getBounds();
                    initialX = headerBounds.x + 50;
                    initialY = headerBounds.y + headerBounds.height + 10;
                }

                const windowOptions = shouldUseLiquidGlass
                    ? { ...commonChildOptions, width: 400, height: 400, maxHeight: 500, minHeight: 300, parent: undefined, x: initialX, y: initialY, show: false }
                    : { ...commonChildOptions, width: 320, height: 380, maxHeight: 500, minHeight: 300, parent: undefined, x: initialX, y: initialY, show: false };

                const agentSelector = new BrowserWindow(windowOptions);
                agentSelector.setContentProtection(isContentProtectionOn);
                agentSelector.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
                if (process.platform === 'darwin') {
                    agentSelector.setWindowButtonVisibility(false);
                }
                const agentSelectorLoadOptions = { query: { view: 'agent-selector' } };
                if (!shouldUseLiquidGlass) {
                    agentSelector.loadFile(path.join(__dirname, '../ui/app/content.html'), agentSelectorLoadOptions)
                        .then(() => {
                        })
                        .catch((error) => {
                            console.error('[WindowManager] Failed to load agent selector window content:', error);
                        });
                }
                else {
                    agentSelectorLoadOptions.query.glass = 'true';
                    agentSelector.loadFile(path.join(__dirname, '../ui/app/content.html'), agentSelectorLoadOptions)
                        .then(() => {
                        })
                        .catch((error) => {
                            console.error('[WindowManager] Failed to load agent selector window content (glass mode):', error);
                        });
                    agentSelector.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(agentSelector.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                        }
                    });
                }
                windowPool.set('agent-selector', agentSelector);
                // Apply current theme to the agent selector window
                applyThemeToNewWindow(agentSelector, 'agent-selector');

                // DevTools disabled by default
                /* if (!app.isPackaged && process.env.OPEN_DEV_TOOLS === 'true') {
                    agentSelector.webContents.openDevTools({ mode: 'detach' });
                } */
                break;
            }

            case 'shortcut-settings': {
                const shortcutEditor = new BrowserWindow({
                    ...commonChildOptions,
                    width: 353,
                    height: 720,
                    modal: false,
                    parent: undefined,
                    alwaysOnTop: true,
                    titleBarOverlay: false,
                });

                shortcutEditor.setContentProtection(isContentProtectionOn);
                shortcutEditor.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
                if (process.platform === 'darwin') {
                    shortcutEditor.setWindowButtonVisibility(false);
                }

                const loadOptions = { query: { view: 'shortcut-settings' } };
                if (!shouldUseLiquidGlass) {
                    shortcutEditor.loadFile(path.join(__dirname, '../ui/app/content.html'), loadOptions);
                } else {
                    loadOptions.query.glass = 'true';
                    shortcutEditor.loadFile(path.join(__dirname, '../ui/app/content.html'), loadOptions);
                    shortcutEditor.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(shortcutEditor.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                        }
                    });
                }

                windowPool.set('shortcut-settings', shortcutEditor);
                // Apply current theme to the shortcut editor window
                applyThemeToNewWindow(shortcutEditor, 'shortcut-settings');
                // DevTools disabled by default
                /* if (!app.isPackaged && process.env.OPEN_DEV_TOOLS === 'true') {
                    shortcutEditor.webContents.openDevTools({ mode: 'detach' });
                } */
                break;
            }
        }
    };

    if (Array.isArray(namesToCreate)) {
        namesToCreate.forEach(name => createFeatureWindow(name));
    } else if (typeof namesToCreate === 'string') {
        createFeatureWindow(namesToCreate);
    } else {
        createFeatureWindow('listen');
        createFeatureWindow('ask');
        createFeatureWindow('settings');
        createFeatureWindow('shortcut-settings');
    }
}

function destroyFeatureWindows() {
    const featureWindows = ['listen', 'ask', 'settings', 'agent-selector', 'shortcut-settings'];
    if (settingsHideTimer) {
        clearTimeout(settingsHideTimer);
        settingsHideTimer = null;
    }
    if (agentSelectorHideTimer) {
        clearTimeout(agentSelectorHideTimer);
        agentSelectorHideTimer = null;
    }
    featureWindows.forEach(name => {
        const win = windowPool.get(name);
        if (win && !win.isDestroyed()) win.destroy();
        windowPool.delete(name);
    });
}



function getCurrentDisplay(window) {
    if (!window || window.isDestroyed()) return screen.getPrimaryDisplay();

    const windowBounds = window.getBounds();
    const windowCenter = {
        x: windowBounds.x + windowBounds.width / 2,
        y: windowBounds.y + windowBounds.height / 2,
    };

    return screen.getDisplayNearestPoint(windowCenter);
}

function getDisplayById(displayId) {
    const displays = screen.getAllDisplays();
    return displays.find(d => d.id === displayId) || screen.getPrimaryDisplay();
}






function createWindows() {
    const HEADER_HEIGHT = 47;
    const DEFAULT_WINDOW_WIDTH = 353;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { y: workAreaY, width: screenWidth } = primaryDisplay.workArea;

    const initialX = Math.round((screenWidth - DEFAULT_WINDOW_WIDTH) / 2);
    const initialY = workAreaY + 21;
    movementManager = new SmoothMovementManager(windowPool, getDisplayById, getCurrentDisplay, updateLayout);

    const header = new BrowserWindow({
        width: DEFAULT_WINDOW_WIDTH,
        height: HEADER_HEIGHT,
        x: initialX,
        y: initialY,
        frame: false,
        transparent: true,
        vibrancy: false,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        resizable: false,
        focusable: true,
        acceptFirstMouse: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            backgroundThrottling: false,
            webSecurity: false, // Required for app functionality - CSP handles security in HTML files
            enableRemoteModule: false,
            // Ensure proper rendering and prevent pixelation
            experimentalFeatures: false,
            devTools: !app.isPackaged,
        },
        // Prevent pixelation and ensure proper rendering
        useContentSize: true,
        disableAutoHideCursor: true,
        icon: path.join(__dirname, '../../build/icon.ico'),
    });
    if (process.platform === 'darwin') {
        header.setWindowButtonVisibility(false);
    }
    const headerLoadOptions = {};
    // Disable glass mode for header - use light theme only
    header.loadFile(path.join(__dirname, '../ui/app/header.html'), headerLoadOptions);

    if (shouldUseLiquidGlass) {
        // Keep liquid glass effects but without glass UI theme
        header.webContents.once('did-finish-load', () => {
            const viewId = liquidGlass.addView(header.getNativeWindowHandle());
            if (viewId !== -1) {
                liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                // liquidGlass.unstable_setScrim(viewId, 1); 
                // liquidGlass.unstable_setSubdued(viewId, 1);
            }
        });
    }
    windowPool.set('header', header);
    // Transparent area around pill passes clicks through to apps below.
    // Renderer toggles this off when mouse enters the pill, back on when it leaves.
    header.setIgnoreMouseEvents(true, { forward: true });
    // Repositionnement après drag (mise à jour finale uniquement)
    // On N'utilise PAS l'événement 'move' pour éviter la boucle resize infinie
    header.on('moved', () => {
        updateLayout();
    });
    // Apply current theme to the header window
    applyThemeToNewWindow(header, 'header');
    layoutManager = new WindowLayoutManager(windowPool, movementManager);

    header.webContents.once('dom-ready', () => {
        shortcutsService.initialize(windowPool);
        shortcutsService.registerShortcuts();
    });

    setupIpcHandlers(movementManager);
    setupWindowController(windowPool, layoutManager, movementManager);

    if (currentHeaderState === 'main') {
        createFeatureWindows(header, ['listen', 'ask', 'settings', 'shortcut-settings']);
    }

    header.setContentProtection(isContentProtectionOn);
    header.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // DevTools disabled by default
    /* if (!app.isPackaged && process.env.OPEN_DEV_TOOLS === 'true') {
        header.webContents.openDevTools({ mode: 'detach' });
    } */

    header.on('focus', () => {
        logger.info('[WindowManager] Header gained focus');
    });

    header.on('blur', () => {
        logger.info('[WindowManager] Header lost focus');
    });

    header.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'mouseDown') {
            const target = input.target;
            if (target && (target.includes('input') || target.includes('apikey'))) {
                header.focus();
            }
        }
    });

    // FIX: Bloquer resize events pendant drag, et ignorer les faux resize (ex: Sub-pixel DPI shifts)
    let lastHeaderSize = header.getSize();
    header.on('resize', () => {
        if (!isDraggingHeader) {
            const newSize = header.getSize();
            // Seulement déclencher si la différence est de plus d'1 pixel (bug OS/Electron subpixel)
            if (Math.abs(newSize[0] - lastHeaderSize[0]) > 1 || Math.abs(newSize[1] - lastHeaderSize[1]) > 1) {
                lastHeaderSize = newSize;
                logger.info('[WindowManager] Header resize event triggered ' + newSize);
                updateLayout();
            }
        }
    });

    return windowPool;
}

function setupIpcHandlers(movementManager) {
    // quit-application handler moved to windowBridge.js to avoid duplication
    screen.on('display-added', (event, newDisplay) => {
        logger.info('[Display] New display added:', newDisplay.id);
    });

    screen.on('display-removed', (event, oldDisplay) => {
        logger.info('[Display] Display removed:', oldDisplay.id);
        const header = windowPool.get('header');
        if (header && getCurrentDisplay(header).id === oldDisplay.id) {
            const primaryDisplay = screen.getPrimaryDisplay();
            movementManager.moveToDisplay(primaryDisplay.id);
        }
    });

    screen.on('display-metrics-changed', (event, display, changedMetrics) => {
        // logger.info('[Display] Display metrics changed:', display.id, changedMetrics);
        updateLayout();
    });
}

const handleHeaderStateChanged = (state) => {
    logger.info('[WindowManager] Header state changed to:', state);
    currentHeaderState = state;

    if (state === 'main') {
        // Destroy old feature windows (if any) and launch single overlay
        destroyFeatureWindows();
        destroyOverlayWindow();
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            // Hide auth header — overlay takes over the pill display
            header.hide();
        }
        createOverlayWindow();
    } else {         // 'apikey' | 'permission'
        // Tear down overlay, show auth header window
        destroyOverlayWindow();
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            header.show();
            header.setIgnoreMouseEvents(true, { forward: true });
        }
    }
    internalBridge.emit('reregister-shortcuts');
};

const handleHeaderAnimationFinished = (state) => {
    const header = windowPool.get('header');
    if (!header || header.isDestroyed()) return;

    if (state === 'hidden') {
        header.hide();
        logger.info('[WindowManager] Header hidden after animation.');
    } else if (state === 'visible') {
        logger.info('[WindowManager] Header shown after animation.');
        updateLayout();
    }
};

const getHeaderPosition = () => {
    const header = windowPool.get('header');
    if (header) {
        const [x, y] = header.getPosition();
        return { x, y };
    }
    return { x: 0, y: 0 };
};

const moveHeader = (newX, newY) => {
    const header = windowPool.get('header');
    if (header) {
        const currentY = newY !== undefined ? newY : header.getBounds().y;
        header.setPosition(newX, currentY, false);
        updateLayout();
    }
};

const moveHeaderTo = (newX, newY, skipLayoutUpdate = false) => {
    const header = windowPool.get('header');
    if (header) {
        const targetDisplay = screen.getDisplayNearestPoint({ x: newX, y: newY });
        const { x: workAreaX, y: workAreaY, width, height } = targetDisplay.workArea;
        const headerBounds = header.getBounds();

        let clampedX = newX;
        let clampedY = newY;

        if (newX < workAreaX) {
            clampedX = workAreaX;
        } else if (newX + headerBounds.width > workAreaX + width) {
            clampedX = workAreaX + width - headerBounds.width;
        }

        if (newY < workAreaY) {
            clampedY = workAreaY;
        } else if (newY + headerBounds.height > workAreaY + height) {
            clampedY = workAreaY + height - headerBounds.height;
        }

        if (skipLayoutUpdate) {
            isDraggingHeader = true;
            header.setPosition(Math.round(clampedX), Math.round(clampedY), false);
            // Synchronous layout update during drag — skip setImmediate + isUpdating guard
            // so feature windows follow the header in real-time on every mouse move event.
            if (layoutManager) {
                layoutManager.isUpdating = false; // reset guard in case previous setImmediate is pending
                layoutManager.positionWindows();
            }
        } else {
            isDraggingHeader = false;
            header.setPosition(Math.round(clampedX), Math.round(clampedY), false);
            setTimeout(() => {
                updateLayout();
            }, 50);
        }
    }
};

const adjustWindowHeight = (sender, targetHeight) => {
    // Don't resize feature windows while the header is being dragged
    if (isDraggingHeader) {
        return;
    }

    const senderWindow = BrowserWindow.fromWebContents(sender);

    if (!senderWindow) {
        return;
    }

    // NEVER resize the header window via adjustWindowHeight — would cause infinite ResizeObserver loop
    const header = windowPool.get('header');
    if (header && !header.isDestroyed() && senderWindow === header) {
        logger.warn('[adjustWindowHeight] Refusing to resize header window — ignoring call');
        return;
    }

    // FIX: NEVER resize the overlay window (it must remain fullscreen)
    if (overlayMode && senderWindow === overlayWindow) {
        logger.debug('[adjustWindowHeight] Ignoring call in overlay mode to prevent modifying fullscreen window');
        // OverlayPanel proxys handle React div sizes internally through setHitRects
        return;
    }

    // Validate targetHeight - must be a valid number
    if (targetHeight === undefined || targetHeight === null || isNaN(targetHeight)) {
        console.warn('[WindowManager] adjustWindowHeight: Invalid targetHeight:', targetHeight);
        return;
    }

    // Convert to number if it's a string
    targetHeight = Number(targetHeight);
    if (isNaN(targetHeight) || targetHeight <= 0) {
        console.warn('[WindowManager] adjustWindowHeight: Invalid targetHeight value:', targetHeight);
        return;
    }

    // DPI Scaling Fix - Get display information
    const display = screen.getPrimaryDisplay();
    const scaleFactor = display.scaleFactor;

    const currentBounds = senderWindow.getBounds();
    const currentContentBounds = senderWindow.getContentBounds();

    // Ensure window is ready for resize
    if (senderWindow.isMinimized()) {
        senderWindow.restore();
    }

    const wasResizable = senderWindow.isResizable();

    if (!wasResizable) {
        senderWindow.setResizable(true);
    }

    const minHeight = senderWindow.getMinimumSize()[1];
    const maxHeight = senderWindow.getMaximumSize()[1];

    let adjustedHeight;
    if (maxHeight === 0) {
        adjustedHeight = Math.max(minHeight, targetHeight);
    } else {
        adjustedHeight = Math.max(minHeight, Math.min(maxHeight, targetHeight));
    }

    // Avoid redundant resize to break infinite loop
    if (Math.abs(currentContentBounds.height - adjustedHeight) <= 2) {
        if (!wasResizable) {
            senderWindow.setResizable(false);
        }
        return; // Already at the correct height
    }

    const roundedHeight = Math.round(adjustedHeight);

    // Resize via setContentSize only — setSize triggers ResizeObserver feedback loop
    senderWindow.setContentSize(currentContentBounds.width, roundedHeight);

    if (!wasResizable) {
        senderWindow.setResizable(false);
    }
    // NOTE: Do NOT call updateLayout() here — it repositions the ask/listen windows via setPosition,
    // which re-triggers their ResizeObserver → adjustWindowHeight → infinite loop.
    // Layout positioning is handled separately when windows are shown/hidden.
};


/* ────────────────[ THEME MANAGEMENT ]─────────────── */
const getCurrentTheme = () => {
    return themeService.getCurrentTheme();
};

const setTheme = async (theme) => {
    logger.info(`[WindowManager] Setting theme to: ${theme}`);
    const result = await themeService.setTheme(theme);

    if (result.success) {
        logger.info(`[WindowManager] Theme successfully changed to: ${theme}`);
    } else {
        logger.error(`[WindowManager] Failed to set theme: ${result.error}`);
    }

    return result;
};

const toggleTheme = async () => {
    logger.info('[WindowManager] Toggling theme');
    const result = await themeService.toggleTheme();

    if (result.success) {
        logger.info(`[WindowManager] Theme toggled from ${result.previousTheme} to ${result.theme}`);
    } else {
        logger.error(`[WindowManager] Failed to toggle theme: ${result.error}`);
    }

    return result;
};

// Apply theme to newly created windows
const applyThemeToNewWindow = (window, windowName) => {
    if (themeService) {
        themeService.applyThemeToWindow(window, windowName);
    }
};

/* ────────────────[ CLICK-THROUGH MANAGEMENT ]─────────────── */
let clickThroughEnabled = false;

const toggleClickThrough = () => {
    clickThroughEnabled = !clickThroughEnabled;
    logger.info(`[WindowManager] Click-through ${clickThroughEnabled ? 'enabled' : 'disabled'}`);

    // FIX: Ne JAMAIS mettre settings en click-through (sinon le toggle ne marche plus!)
    const windowNames = ['header', 'ask', 'listen'];
    windowNames.forEach(windowName => {
        const window = windowPool.get(windowName);
        if (window && !window.isDestroyed()) {
            if (clickThroughEnabled) {
                // Forward les clics aux fenêtres en dessous, sauf sur la fenêtre elle-même
                window.setIgnoreMouseEvents(true, { forward: true });
            } else {
                window.setIgnoreMouseEvents(false);
            }
            logger.info(`[WindowManager] Set click-through for ${windowName}: ${clickThroughEnabled}`);
        }
    });

    // Broadcast click-through state change to all windows
    windowPool.forEach((window) => {
        if (window && !window.isDestroyed()) {
            window.webContents.send('click-through-changed', clickThroughEnabled);
        }
    });

    return {
        success: true,
        enabled: clickThroughEnabled
    };
};

const getClickThroughStatus = () => {
    return {
        success: true,
        enabled: clickThroughEnabled
    };
};

// FIX: Ajouter globalShortcut pour toggle click-through (au cas où l'UI est cassée)
// Note: globalShortcut déjà importé en haut du fichier
const registerClickThroughShortcut = () => {
    try {
        const ret = globalShortcut.register('CommandOrControl+Alt+C', () => {
            logger.info('[WindowManager] Global shortcut Ctrl+Alt+C triggered - toggling click-through');
            toggleClickThrough();
        });

        if (ret) {
            logger.info('[WindowManager] Click-through emergency shortcut registered: Ctrl+Alt+C');
        } else {
            logger.warn('[WindowManager] Failed to register click-through shortcut');
        }
    } catch (error) {
        logger.error('[WindowManager] Error registering click-through shortcut:', error);
    }
};

// Appeler au démarrage
if (process.type !== 'renderer') {
    registerClickThroughShortcut();
}

/* ────────────────[ WINDOW OPACITY MANAGEMENT ]─────────────── */
const setWindowOpacity = (opacity) => {
    // Clamp opacity between 0.1 and 1.0
    const clampedOpacity = Math.max(0.1, Math.min(1.0, opacity));

    logger.info(`[WindowManager] Setting window opacity to: ${clampedOpacity}`);

    // Apply different opacity strategies per window type
    const windowNames = ['header', 'settings', 'ask', 'listen'];
    windowNames.forEach(windowName => {
        const window = windowPool.get(windowName);
        if (window && !window.isDestroyed()) {
            // For header: use CSS-based glassmorphism, keep window at full opacity for content readability
            if (windowName === 'header') {
                // Don't change window opacity for header - use CSS-based background opacity instead
                logger.info(`[WindowManager] Header using CSS-based opacity: ${clampedOpacity}`);
            } else {
                // For other windows: use traditional window opacity
                window.setOpacity(clampedOpacity);
                logger.info(`[WindowManager] Set window opacity for ${windowName}: ${clampedOpacity}`);
            }
        }
    });

    // Broadcast opacity change to all windows for CSS-based adjustments
    windowPool.forEach((window) => {
        if (window && !window.isDestroyed()) {
            window.webContents.send('window-opacity-changed', clampedOpacity);
        }
    });

    return {
        success: true,
        opacity: clampedOpacity
    };
};


// ─── Dashboard window (renderer desktop) ────────────────────────────────────

function createDashboardWindow() {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        if (!dashboardWindow.isVisible()) dashboardWindow.show();
        dashboardWindow.focus();
        return dashboardWindow;
    }

    const { nativeTheme } = require('electron');
    const isDark = nativeTheme.shouldUseDarkColors;
    dashboardWindow = new BrowserWindow({
        width: 1050,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        center: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#00000000',
            symbolColor: isDark ? '#FFFFFF' : '#000000',
            height: 38,
        },
        backgroundColor: isDark ? '#09090B' : '#FFFFFF',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            devTools: !app.isPackaged,
            spellcheck: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        icon: path.join(__dirname, '../../build/icon.ico'),
    });

    if (process.platform === 'darwin') {
        dashboardWindow.setWindowButtonVisibility(false);
    }

    // Content protection: hide window from screen capture / recording by default.
    // Toggle via dashboard:setContentProtection IPC (e.g. "détectable" setting).
    try { dashboardWindow.setContentProtection(true); } catch (_) { }

    dashboardWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
        if (level >= 3) {
            logger.error('[DashboardConsole] Renderer error', { message, line, sourceId });
        } else if (level >= 2) {
            logger.warn('[DashboardConsole] Renderer warning', { message, line, sourceId });
        }
    });
    dashboardWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        logger.error('[Dashboard] did-fail-load', { errorCode, errorDescription, validatedURL });
    });
    logger.info('[Dashboard] Loading dashboard URL', { url: DASHBOARD_URL });
    void dashboardWindow.loadURL(DASHBOARD_URL);

    // Adapter dynamiquement le titleBarOverlay et les bounds selon la route,
    // AVANT que React ne monte. Évite le flicker des boutons natifs.
    const applyChromeForUrl = (url) => {
        if (process.platform !== 'win32') return;
        const isAuthPage = /\/(electron-login|auth|login|register)/.test(url);
        try {
            if (isAuthPage) {
                dashboardWindow.setTitleBarOverlay({ color: '#00000000', symbolColor: '#00000000', height: 0 });
                setDashboardOnboardingMode(true);
            } else {
                const { nativeTheme } = require('electron');
                const isDark = nativeTheme.shouldUseDarkColors;
                dashboardWindow.setTitleBarOverlay({
                    color: '#00000000',
                    symbolColor: isDark ? '#FFFFFF' : '#000000',
                    height: 38,
                });
                setDashboardOnboardingMode(false);
            }
        } catch (e) {
            logger.warn('[Dashboard] applyChromeForUrl failed', { error: e.message });
        }
    };
    applyChromeForUrl(DASHBOARD_URL);
    dashboardWindow.webContents.on('did-navigate', (_e, url) => applyChromeForUrl(url));
    dashboardWindow.webContents.on('did-navigate-in-page', (_e, url) => applyChromeForUrl(url));

    dashboardWindow.once('ready-to-show', () => {
        dashboardWindow.show();
        if (!app.isPackaged) {
            dashboardWindow.webContents.openDevTools({ mode: 'detach' });
        }
    });

    // Push current auth state once the page has fully loaded, so the renderer
    // gets the user even if it missed the broadcast that fired before the window existed.
    dashboardWindow.webContents.on('did-finish-load', () => {
        try {
            const authService = require('../common/services/authService');
            const userState = authService.getCurrentUser();
            const payload = {
                ...userState,
                user: userState.isLoggedIn ? { uid: userState.uid, email: userState.email, displayName: userState.displayName, photoURL: null } : null,
            };
            dashboardWindow.webContents.send('user-state-changed', payload);
            authService.handleDashboardDidFinishLoad(dashboardWindow).catch((error) => {
                logger.warn('[Dashboard] Auth sync after load failed', { error: error.message });
            });
        } catch (e) {
            // non-critical
        }
    });

    // Hide instead of close when user presses X (keep app alive in background)
    dashboardWindow.on('close', (e) => {
        if (!global.isQuitting) {
            e.preventDefault();
            dashboardWindow.hide();
        }
    });

    dashboardWindow.on('closed', () => {
        dashboardWindow = null;
    });

    return dashboardWindow;
}

function getDashboardWindow() {
    return dashboardWindow && !dashboardWindow.isDestroyed() ? dashboardWindow : null;
}

// ─── Onboarding mode (resize dashboard pour /electron-login) ────────────────
let _previousDashboardBounds = null;

function setDashboardOnboardingMode(enabled) {
    const win = getDashboardWindow();
    if (!win) return;
    try {
        if (enabled) {
            if (!_previousDashboardBounds) {
                _previousDashboardBounds = win.getBounds();
            }
            win.setResizable(false);
            win.setMinimumSize(1100, 720);
            win.setSize(1100, 720);
            win.center();
        } else {
            win.setResizable(true);
            win.setMinimumSize(800, 600);
            if (_previousDashboardBounds) {
                win.setBounds(_previousDashboardBounds);
                _previousDashboardBounds = null;
            } else {
                win.setSize(1050, 700);
                win.center();
            }
        }
    } catch (e) {
        logger.warn('[WindowManager] setDashboardOnboardingMode failed', { error: e.message });
    }
}

// ─── Meeting notification (floating top-right panel) ────────────────────────
let meetingNotificationWindow = null;

function createMeetingNotificationWindow() {
    if (meetingNotificationWindow && !meetingNotificationWindow.isDestroyed()) {
        return meetingNotificationWindow;
    }
    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea } = primaryDisplay;
    const width = 360;
    const height = 80;
    const x = workArea.x + workArea.width - width - 16;
    const y = workArea.y + 16;

    meetingNotificationWindow = new BrowserWindow({
        width,
        height,
        x,
        y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        skipTaskbar: true,
        focusable: false,
        show: false,
        hasShadow: true,
        type: process.platform === 'darwin' ? 'panel' : undefined,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            devTools: !app.isPackaged,
        },
    });

    const baseUrl = process.env.DASHBOARD_DEV_URL
        ? new URL(process.env.DASHBOARD_DEV_URL).origin
        : 'https://renderer.clairia.app';
    void meetingNotificationWindow.loadURL(`${baseUrl}/notification`);

    meetingNotificationWindow.setAlwaysOnTop(true, 'floating');
    meetingNotificationWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    meetingNotificationWindow.on('closed', () => {
        meetingNotificationWindow = null;
    });

    return meetingNotificationWindow;
}

function showMeetingNotification(meeting) {
    const win = createMeetingNotificationWindow();
    if (!win) return;
    const send = () => {
        if (!win.isDestroyed()) win.webContents.send('meeting-notification:data', meeting);
    };
    if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', send);
    } else {
        send();
    }
    if (!win.isVisible()) win.showInactive();
}

function hideMeetingNotification() {
    if (meetingNotificationWindow && !meetingNotificationWindow.isDestroyed()) {
        meetingNotificationWindow.hide();
    }
}

/**
 * Ensures the listen window exists in the pool (created lazily).
 * Required before calling listenService.handleListenRequest('Listen').
 */
function ensureListenWindow() {
    if (!windowPool.has('listen')) {
        createFeatureWindow('listen');
    }
    return windowPool.get('listen');
}

// ────────────────────────────────────────────────────────────────────────────

module.exports = {
    updateLayout,
    createWindows,
    windowPool,
    toggleContentProtection,
    resizeHeaderWindow,
    getContentProtectionStatus,
    showSettingsWindow,
    hideSettingsWindow,
    toggleSettingsWindow,
    requestSettingsVisible,
    cancelHideSettingsWindow,
    setHeaderClickThrough,
    handleGlobalPointerDown,
    showAgentSelectorWindow,
    toggleAgentSelectorWindow,
    hideAgentSelectorWindow,
    cancelHideAgentSelectorWindow,
    openLoginPage,
    moveWindowStep,
    handleHeaderStateChanged,
    handleHeaderAnimationFinished,
    getHeaderPosition,
    moveHeader,
    moveHeaderTo,
    adjustWindowHeight,
    setWindowOpacity,
    toggleClickThrough,
    getClickThroughStatus,
    getCurrentTheme,
    setTheme,
    toggleTheme,
    applyThemeToNewWindow,
    liquidGlassAPI,
    getPlatformInfo: () => platformManager.getPlatformInfo(),
    // Overlay (Fix 5)
    setOverlayClickThrough,
    setOverlayShape,
    setOverlayPillPosition,
    getOverlayInitialState,
    getOverlayWindow,
    getPillWindow,
    setOverlayHitRects,
    setOverlayDragging,
    stopOverlayPolling: _stopOverlayPolling,
    startOverlayPolling: _startOverlayPolling,
    createDashboardWindow,
    setDashboardOnboardingMode,
    showMeetingNotification,
    hideMeetingNotification,
    getDashboardWindow,
    ensureListenWindow,
};

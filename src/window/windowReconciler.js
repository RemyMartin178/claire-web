// src/window/windowReconciler.js
//
// Applies SharedState mutations to Electron windows and stateful main-process
// services. featureBridge owns IPC registration; this module owns reconciliation.
const { BrowserWindow, nativeTheme } = require('electron');
const sharedStateService = require('../common/services/sharedStateService');
const internalBridge = require('../bridge/internalBridge');
const windowManager = require('./windowManager');
const settingsService = require('../features/settings/settingsService');
const modelStateService = require('../common/services/modelStateService');
const askService = require('../features/ask/askService');
const listenService = require('../features/listen/listenService');
const recallService = require('../common/services/recallService');
const { createLogger } = require('../common/services/logger.js');

const logger = createLogger('WindowReconciler');

let unsubscribe = null;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function themeIsDark(theme) {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return nativeTheme.shouldUseDarkColors;
}

function applyDashboardChrome(state) {
  if (process.platform !== 'win32') return;
  const dashWin = windowManager.getDashboardWindow();
  if (!dashWin || dashWin.isDestroyed()) return;

  try {
    const titleBarVisible = state.titleBarVisible !== false;
    const isDark = themeIsDark(state.theme);

    dashWin.setTitleBarOverlay({
      color: '#00000000',
      symbolColor: titleBarVisible ? (isDark ? '#FFFFFF' : '#000000') : '#00000000',
      height: titleBarVisible ? 38 : 0,
    });
    dashWin.setBackgroundColor(isDark ? '#09090B' : '#FFFFFF');
  } catch (e) {
    logger.warn('[WindowReconciler] dashboard chrome reconcile failed', { error: e.message });
  }
}

function reconcileMeetingNotification(state, previous) {
  if (state.meetingNotification === previous.meetingNotification) return;
  try {
    if (state.meetingNotification) {
      windowManager.showMeetingNotification(state.meetingNotification);
    } else {
      windowManager.hideMeetingNotification();
    }
  } catch (e) {
    logger.warn('[WindowReconciler] meeting notification reconcile failed', { error: e.message });
  }
}

function reconcileSelectedModel(state, previous) {
  if (!isObject(state.selectedModel)) return;
  const previousModels = isObject(previous.selectedModel) ? previous.selectedModel : {};

  for (const type of ['llm', 'stt']) {
    const modelId = state.selectedModel[type];
    if (modelId === previousModels[type]) continue;
    if (modelId == null) continue;

    void Promise.resolve(modelStateService.handleSetSelectedModel(type, modelId))
      .catch((e) => logger.warn('[WindowReconciler] selected model reconcile failed', { type, error: e.message }));
  }
}

async function reconcileAsyncSideEffects(state, previous) {
  if (state.activePersonality !== previous.activePersonality && state.activePersonality) {
    try { await askService.setPersonality(state.activePersonality); }
    catch (e) { logger.warn('[WindowReconciler] active personality reconcile failed', { error: e.message }); }
  }

  if (state.adaptivePersonality !== previous.adaptivePersonality) {
    try { await askService.handleToggleAdaptivePersonality(Boolean(state.adaptivePersonality)); }
    catch (e) { logger.warn('[WindowReconciler] adaptive personality reconcile failed', { error: e.message }); }
  }

  if (state.googleSearchEnabled !== previous.googleSearchEnabled) {
    try { await listenService.handleUpdateGoogleSearchSetting(Boolean(state.googleSearchEnabled)); }
    catch (e) { logger.warn('[WindowReconciler] google search reconcile failed', { error: e.message }); }
  }

  if (state.autoUpdate !== previous.autoUpdate) {
    try { await settingsService.setAutoUpdateSetting(Boolean(state.autoUpdate)); }
    catch (e) { logger.warn('[WindowReconciler] auto update reconcile failed', { error: e.message }); }
  }

  if (state.autoMeetingDetectionEnabled !== previous.autoMeetingDetectionEnabled) {
    try { await recallService.setEnabled(Boolean(state.autoMeetingDetectionEnabled)); }
    catch (e) { logger.warn('[WindowReconciler] Recall auto detection reconcile failed', { error: e.message }); }
  }
}

function reconcile({ state, previous }) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win && !win.isDestroyed()) {
      try { win.webContents.send('shared-state:updated', state); } catch { /* renderer gone */ }
    }
  }

  if (state.showDashboard !== previous.showDashboard) {
    const dashWin = windowManager.getDashboardWindow();
    if (dashWin && !dashWin.isDestroyed()) {
      if (state.showDashboard) {
        try {
          dashWin.setOpacity(0);
          dashWin.show();
          setTimeout(() => { if (!dashWin.isDestroyed()) { dashWin.setOpacity(1); dashWin.focus(); } }, 80);
        } catch { /* destroyed mid-flight */ }
      } else {
        try { dashWin.hide(); } catch { /* destroyed mid-flight */ }
      }
    }
  }

  if (state.showHeader !== previous.showHeader) {
    try { internalBridge.emit('window:requestVisibility', { name: 'header', visible: state.showHeader }); }
    catch (e) { logger.warn('[WindowReconciler] state->header visibility failed:', e.message); }
  }

  if (state.showListen !== previous.showListen) {
    try { internalBridge.emit('window:requestVisibility', { name: 'listen', visible: state.showListen }); }
    catch (e) { logger.warn('[WindowReconciler] state->listen visibility failed:', e.message); }
  }

  if (state.showChat !== previous.showChat) {
    try { internalBridge.emit('window:requestVisibility', { name: 'ask', visible: state.showChat }); }
    catch (e) { logger.warn('[WindowReconciler] state->ask visibility failed:', e.message); }
  }

  if (state.dashboardFocusCount !== previous.dashboardFocusCount && state.showDashboard) {
    const dashWin = windowManager.getDashboardWindow();
    if (dashWin && !dashWin.isDestroyed()) {
      try { dashWin.focus(); } catch { /* destroyed mid-flight */ }
    }
  }

  if (state.contentProtectionEnabled !== previous.contentProtectionEnabled) {
    try { windowManager.setContentProtection(Boolean(state.contentProtectionEnabled)); }
    catch (e) { logger.warn('[WindowReconciler] content protection reconcile failed', { error: e.message }); }
  }

  if (state.theme !== previous.theme || state.titleBarVisible !== previous.titleBarVisible) {
    applyDashboardChrome(state);
  }

  reconcileMeetingNotification(state, previous);

  if (state.isOnboarding !== previous.isOnboarding) {
    try { windowManager.setDashboardOnboardingMode?.(Boolean(state.isOnboarding)); }
    catch (e) { logger.warn('[WindowReconciler] onboarding reconcile failed', { error: e.message }); }
  }

  if (state.agentMode !== previous.agentMode) {
    listenService.agentModeActive = Boolean(state.agentMode);
    logger.info(`[WindowReconciler] Agent mode updated: ${listenService.agentModeActive}`);
  }

  if (state.selectedModel !== previous.selectedModel) {
    reconcileSelectedModel(state, previous);
  }

  void recallService.syncSharedState(state)
    .catch((e) => logger.warn('[WindowReconciler] Recall state sync failed', { error: e.message }));

  void reconcileAsyncSideEffects(state, previous);
}

function initialize() {
  if (unsubscribe) return;
  unsubscribe = sharedStateService.subscribe(reconcile);
  void recallService.setEnabled(Boolean(sharedStateService.get().autoMeetingDetectionEnabled));
  void recallService.syncSharedState(sharedStateService.get())
    .catch((e) => logger.warn('[WindowReconciler] initial Recall state sync failed', { error: e.message }));
  logger.info('[WindowReconciler] initialized');
}

function shutdown() {
  if (!unsubscribe) return;
  unsubscribe();
  unsubscribe = null;
}

module.exports = {
  initialize,
  shutdown,
};

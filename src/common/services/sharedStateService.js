// src/common/services/sharedStateService.js
//
// Single, persisted, observable source of truth for app-wide state.
// Other services read it, mutate it via .patch(), and subscribe to "change"
// events. The renderer can mirror it via window.api.sharedState (see preload.js).
//
// Persistence: atomic write through a tmp file + rename to avoid torn writes.
// Concurrency: a single write chain serializes saves; .patch() returns sync.
const { EventEmitter } = require('events');
const { promises: fsp } = require('fs');
const path = require('path');
const { app } = require('electron');
const { createLogger } = require('./logger.js');

const logger = createLogger('SharedState');
const FILE_NAME = 'shared-state.json';

// Default state — scoped to what Claire actually drives today. Anything owned
// by another service (auth user, model selection, settings) is intentionally
// NOT mirrored here to avoid divergence.
const DEFAULT_STATE = Object.freeze({
  appVersion: null,                       // filled at init() once app is ready
  signInStatus: 'loading',                // 'loading' | 'signed-in' | 'signed-out'

  // Window-loaded flags — managers flip these to true when their window's renderer reports ready
  isHeaderLoaded: false,
  isListenLoaded: false,
  isDashboardLoaded: false,

  // What SHOULD be visible (managers reconcile to this)
  showDashboard: true,
  showHeader: true,
  showListen: false,

  // Increment to request a focus pass — windowManager checks the diff
  dashboardFocusCount: 0,

  // Active session — null when nothing is recording
  // Shape: { id: string, startedAt: number }
  session: null,
  lastSessionId: null,
  isListenRunning: false,

  // Transient UI flags
  isCapturingScreenshot: false,
  showSessionDisconnectedModal: false,
  meetingNotification: null,
  handledMeetingNotificationIds: [],

  // Settings/state currently mirrored from legacy IPC handlers.
  contentProtectionEnabled: true,
  theme: 'system',                         // 'light' | 'dark' | 'system'
  isOnboarding: false,
  titleBarVisible: true,
  selectedModel: { llm: null, stt: null },
  activePersonality: null,
  adaptivePersonality: false,
  agentMode: false,
  googleSearchEnabled: false,
  autoUpdate: true,
  autoMeetingDetectionEnabled: false,
  recallSdkInitialized: false,
  recallSdkStatus: 'idle',                // 'idle' | 'ready' | 'recording' | 'error'
  recallRecording: null,
  lastRecallRecordingId: null,
});

// Fields that describe in-flight runtime state. They are NEVER persisted to
// disk and ALWAYS reset to their defaults on cold start, regardless of what
// shared-state.json says. This avoids a stale persisted "showHeader: false"
// (left over from a previous Stop) shadowing the freshly-created visible
// header window after relaunch.
const TRANSIENT_KEYS = new Set([
  'isHeaderLoaded',
  'isListenLoaded',
  'isDashboardLoaded',
  'isCapturingScreenshot',
  'dashboardFocusCount',
  'showHeader',
  'showListen',
  'showDashboard',
  'isListenRunning',
  'session',
  'showSessionDisconnectedModal',
  'meetingNotification',
  'handledMeetingNotificationIds',
  'signInStatus',
  'isOnboarding',
  'titleBarVisible',
  'agentMode',
  'recallSdkInitialized',
  'recallSdkStatus',
  'recallRecording',
]);

class SharedStateService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this._state = { ...DEFAULT_STATE };
    this._initialized = false;
    this._dirty = false;
    this._writeChain = null;
  }

  _filePath() {
    return path.join(app.getPath('userData'), FILE_NAME);
  }

  async init() {
    if (this._initialized) return;
    this._state = { ...DEFAULT_STATE, appVersion: app.getVersion() };
    await this._load();
    this._initialized = true;
    logger.info('[SharedState] initialized', { path: this._filePath() });
  }

  async _load() {
    const file = this._filePath();
    try {
      const raw = await fsp.readFile(file, 'utf8');
      const parsed = JSON.parse(raw);
      // Persisted wins for non-transient fields, defaults fill the rest.
      // Transient keys (window visibility, session, runtime flags) are forced
      // back to their defaults so the state matches the freshly-created windows.
      this._state = {
        ...DEFAULT_STATE,
        ...parsed,
        appVersion: app.getVersion(),
      };
      for (const key of TRANSIENT_KEYS) {
        this._state[key] = DEFAULT_STATE[key];
      }
    } catch (err) {
      if (err && err.code !== 'ENOENT') {
        logger.warn('[SharedState] state file unreadable, resetting:', err.message);
      }
      this._state = { ...DEFAULT_STATE, appVersion: app.getVersion() };
      await this._save();
    }
  }

  async _save() {
    this._dirty = true;
    if (this._writeChain) return this._writeChain;

    const file = this._filePath();
    const tmp = `${file}.tmp`;

    this._writeChain = (async () => {
      try {
        // Drain pending patches — if .patch() runs again while we're writing,
        // _dirty flips back to true and we re-snapshot in the same loop.
        while (this._dirty) {
          this._dirty = false;
          const snapshot = JSON.stringify(this._state, null, 2);
          await fsp.writeFile(tmp, snapshot, 'utf8');
          await fsp.rename(tmp, file);
        }
      } catch (e) {
        logger.error('[SharedState] save failed:', e.message);
      } finally {
        this._writeChain = null;
      }
    })();
    return this._writeChain;
  }

  // Wait for any pending save to finish — call before app quit.
  async flush() {
    if (this._writeChain) await this._writeChain;
  }

  get() {
    return this._state;
  }

  // Shallow merge. Returns the new state. Emits "change" if anything actually
  // changed (Object.is comparison per key), so subscribers don't fire on no-ops.
  patch(partial) {
    if (!partial || typeof partial !== 'object') return this._state;

    const previous = this._state;
    const next = { ...previous };
    let changed = false;
    for (const key of Object.keys(partial)) {
      if (!Object.is(next[key], partial[key])) {
        next[key] = partial[key];
        changed = true;
      }
    }

    if (next.session && next.meetingNotification) {
      next.meetingNotification = null;
      changed = true;
    }
    if (next.session && next.showSessionDisconnectedModal) {
      next.showSessionDisconnectedModal = false;
      changed = true;
    }
    if (!next.lastSessionId && next.showSessionDisconnectedModal) {
      next.showSessionDisconnectedModal = false;
      changed = true;
    }
    if (!changed) return previous;

    this._state = next;
    this.emit('change', { state: next, previous, patch: partial });

    // Persist only non-transient field changes — see TRANSIENT_KEYS above.
    const persistable = Object.keys(partial).some(k => !TRANSIENT_KEYS.has(k));
    if (persistable) void this._save();

    return next;
  }

  // Convenience: subscribe with auto-unsubscribe lambda.
  subscribe(listener) {
    this.on('change', listener);
    return () => this.off('change', listener);
  }
}

module.exports = new SharedStateService();
module.exports.DEFAULT_STATE = DEFAULT_STATE;

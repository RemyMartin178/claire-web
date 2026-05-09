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
});

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
      // Persisted wins for fields it has, defaults fill the rest. appVersion
      // always reflects the running build, not whatever was on disk.
      this._state = {
        ...DEFAULT_STATE,
        ...parsed,
        appVersion: app.getVersion(),
        // Window-loaded flags must NOT be persisted — they describe runtime readiness.
        isHeaderLoaded: false,
        isListenLoaded: false,
        isDashboardLoaded: false,
      };
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
    if (!changed) return previous;

    this._state = next;
    this.emit('change', { state: next, previous, patch: partial });

    // Don't persist transient flags — they describe in-flight UI, not user data.
    const persistable = Object.keys(partial).some(k =>
      k !== 'isCapturingScreenshot' &&
      k !== 'isHeaderLoaded' &&
      k !== 'isListenLoaded' &&
      k !== 'isDashboardLoaded' &&
      k !== 'dashboardFocusCount'
    );
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

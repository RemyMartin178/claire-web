const sharedStateService = require('./sharedStateService');
const { createRecallSdkUpload } = require('../ai/providers/claire-api');
const { createLogger } = require('./logger.js');
const os = require('os');

const logger = createLogger('RecallService');

const RECALL_API_URL = process.env.RECALL_SDK_API_URL || process.env.RECALL_API_URL || 'https://us-west-2.recall.ai';

class RecallService {
  constructor() {
    this.sdk = null;
    this.initialized = false;
    this.enabled = false;
    this.activeWindowId = null;
    this.activeUpload = null;
    this.boundHandlers = null;
    this.manuallyStoppedWindowIds = new Set();
    this.partialTranscriptByWindow = new Map();
    this.syncQueue = Promise.resolve();
  }

  isSupported() {
    if (process.env.CLAIRE_TEST_NATIVE_AUDIO || process.env.CLUELY_TEST_NATIVE_AUDIO) return false;
    if (process.platform !== 'darwin') return true;
    if (process.arch === 'x64') return false;
    const major = Number.parseInt(os.release().split('.')[0], 10);
    return Number.isFinite(major) && major >= 22;
  }

  async initialize() {
    if (this.initialized) return { success: true };
    if (!this.isSupported()) {
      sharedStateService.patch({ recallSdkInitialized: false, recallSdkStatus: 'idle' });
      return { success: false, error: 'Recall SDK is not supported on this platform' };
    }

    try {
      this.sdk = require('@recallai/desktop-sdk');
      const sdk = this.sdk.default || this.sdk;
      await sdk.init({
        apiUrl: RECALL_API_URL,
        restartOnError: true,
        acquirePermissionsOnStartup: process.platform === 'darwin'
          ? ['accessibility', 'screen-capture', 'microphone']
          : [],
      });

      this.boundHandlers = {
        meetingDetected: (evt) => void this.handleMeetingDetected(evt),
        recordingStarted: (evt) => this.handleRecordingStarted(evt),
        recordingEnded: (evt) => void this.handleRecordingEnded(evt),
        realtimeEvent: (evt) => void this.handleRealtimeEvent(evt),
        error: (evt) => this.handleError(evt),
      };

      sdk.addEventListener('meeting-detected', this.boundHandlers.meetingDetected);
      sdk.addEventListener('recording-started', this.boundHandlers.recordingStarted);
      sdk.addEventListener('recording-ended', this.boundHandlers.recordingEnded);
      sdk.addEventListener('realtime-event', this.boundHandlers.realtimeEvent);
      sdk.addEventListener('error', this.boundHandlers.error);

      this.sdk = sdk;
      this.initialized = true;
      sharedStateService.patch({ recallSdkInitialized: true, recallSdkStatus: 'ready' });
      logger.info('[RecallService] initialized', { apiUrl: RECALL_API_URL });
      return { success: true };
    } catch (e) {
      sharedStateService.patch({ recallSdkInitialized: false, recallSdkStatus: 'error' });
      logger.warn('[RecallService] initialization failed', { error: e.message });
      return { success: false, error: e.message };
    }
  }

  async setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      await this.stopRecording();
      sharedStateService.patch({ recallSdkStatus: this.activeWindowId ? 'recording' : 'idle' });
      return { success: true };
    }
    if (!this.isSupported()) {
      sharedStateService.patch({ recallSdkInitialized: false, recallSdkStatus: 'idle' });
      return { success: false, error: 'Recall SDK is not supported on this platform' };
    }
    sharedStateService.patch({ recallSdkStatus: this.initialized ? 'ready' : 'idle' });
    return { success: true };
  }

  async handleMeetingDetected(evt) {
    if (!this.enabled) return;
    const state = sharedStateService.get();
    const platform = evt?.window?.platform?.trim();
    if (!platform || state.session) return;
    if (state.meetingNotification) return;

    const windowId = evt?.window?.id || `${platform}:${Date.now()}`;
    if (Array.isArray(state.handledMeetingNotificationIds) && state.handledMeetingNotificationIds.includes(windowId)) return;

    sharedStateService.patch({
      meetingNotification: {
        id: windowId,
        title: `${platform} meeting detected`,
        source: 'detection',
        recallWindow: {
          id: evt?.window?.id || null,
          platform,
          title: evt?.window?.title || null,
          url: evt?.window?.url || null,
        },
      },
    });
  }

  handleRecordingStarted(evt) {
    logger.info('[RecallService] recording started', { windowId: evt?.window?.id });
  }

  async handleRecordingEnded(evt) {
    const windowId = evt?.window?.id || this.activeWindowId;
    const recordingId = this.activeUpload?.recording_id || this.activeUpload?.id || null;

    try {
      if (this.sdk && windowId && typeof this.sdk.uploadRecording === 'function') {
        await this.sdk.uploadRecording({ windowId });
      }
    } catch (e) {
      logger.warn('[RecallService] uploadRecording failed', { error: e.message });
    }

    this.activeWindowId = null;
    this.activeUpload = null;
    this.partialTranscriptByWindow.delete(windowId);

    if (windowId && this.manuallyStoppedWindowIds.has(windowId)) {
      this.manuallyStoppedWindowIds.delete(windowId);
      sharedStateService.patch({
        recallSdkStatus: this.enabled ? 'ready' : 'idle',
        recallRecording: null,
        lastRecallRecordingId: recordingId,
      });
      return;
    }

    const prevFocus = sharedStateService.get().dashboardFocusCount || 0;
    sharedStateService.patch({
      recallSdkStatus: this.enabled ? 'ready' : 'idle',
      recallRecording: null,
      lastRecallRecordingId: recordingId,
      session: null,
      isListenRunning: false,
      showListen: false,
      showHeader: false,
      showDashboard: true,
      showSessionDisconnectedModal: true,
      dashboardFocusCount: prevFocus + 1,
    });
  }

  async handleRealtimeEvent(evt) {
    if (!this.enabled || !this.activeUpload) return;
    if (evt?.window?.id && evt.window.id !== this.activeWindowId) return;

    const turn = this.normalizeRealtimeTurn(evt);
    if (!turn || !turn.text) return;

    const role = turn.role || 'them';
    const windowId = evt?.window?.id || this.activeWindowId || 'active';

    if (!turn.isFinal) {
      this.partialTranscriptByWindow.set(windowId, {
        speaker: role,
        text: turn.text,
        timestamp: turn.timestamp,
      });
      const state = sharedStateService.get();
      if (state.session?.id === this.activeUpload.sessionId) {
        sharedStateService.patch({
          session: {
            ...state.session,
            partialTranscriptEntry: {
              speaker: role,
              text: turn.text,
              timestamp: turn.timestamp,
            },
          },
        });
      }
      return;
    }

    this.partialTranscriptByWindow.delete(windowId);
    try {
      const listenService = require('../../features/listen/listenService');
      await listenService.handleTranscriptionComplete(role, turn.text);
    } catch (e) {
      logger.warn('[RecallService] failed to ingest realtime transcript', { error: e.message });
    }
  }

  normalizeRealtimeTurn(evt) {
    let data = evt?.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); }
      catch { data = { text: data }; }
    }
    const eventName = evt?.event || data?.event || data?.type;
    const transcript = data?.transcript || data?.text || data?.utterance?.text || data?.words?.map?.(w => w.text).join(' ');
    const text = typeof transcript === 'string' ? transcript.trim() : '';
    if (!text) return null;

    const role = data?.speaker || data?.role || data?.participant?.role || 'them';
    const isFinal = Boolean(
      data?.end_of_turn ||
      data?.is_final ||
      data?.final ||
      eventName === 'transcript.final' ||
      eventName === 'turn'
    );

    return {
      text,
      role: role === 'me' || role === 'user' ? 'user' : 'them',
      isFinal,
      timestamp: data?.timestamp || data?.start_timestamp || Date.now(),
    };
  }

  async prepareSessionRecording(session) {
    if (!this.enabled || !session?.id || !this.isSupported()) return null;
    const upload = await createRecallSdkUpload({
      metadata: {
        sessionId: session.id,
        startedAt: session.startedAt,
      },
    });
    return {
      uploadToken: upload.upload_token,
      uploadId: upload.id,
      recordingId: upload.recording_id,
      assemblyAiSpeechModel: 'universal-streaming',
    };
  }

  async syncSharedState(state) {
    this.syncQueue = this.syncQueue
      .then(() => this._syncSharedState(state))
      .catch((e) => logger.warn('[RecallService] queued sync failed', { error: e.message }));
    return this.syncQueue;
  }

  async _syncSharedState(state) {
    if (!this.enabled) {
      await this.stopRecording();
      return;
    }

    if (!this.areAppWindowsLoaded(state)) return;

    if (!this.initialized) {
      const result = await this.initialize();
      if (!result.success) return;
    }

    const session = state.session;
    if (!session?.recallSdkRecording?.uploadToken) {
      await this.stopRecording();
      return;
    }

    if (this.activeUpload?.sessionId === session.id) return;

    await this.stopRecording();

    const windowId = await this.sdk.prepareDesktopAudioRecording();
    await this.sdk.startRecording({
      windowId,
      uploadToken: session.recallSdkRecording.uploadToken,
    });

    this.activeWindowId = windowId;
    this.activeUpload = {
      sessionId: session.id,
      uploadId: session.recallSdkRecording.uploadId,
      recording_id: session.recallSdkRecording.recordingId,
    };

    sharedStateService.patch({
      recallSdkStatus: 'recording',
      recallRecording: {
        windowId,
        uploadId: session.recallSdkRecording.uploadId,
        recordingId: session.recallSdkRecording.recordingId,
        startedAt: Date.now(),
      },
    });
    logger.info('[RecallService] started Recall recording for session', { sessionId: session.id, windowId });
  }

  async stopRecording() {
    if (!this.sdk || !this.activeWindowId) return;
    const windowId = this.activeWindowId;
    this.manuallyStoppedWindowIds.add(windowId);
    try {
      await this.sdk.stopRecording({ windowId });
      logger.info('[RecallService] stopped Recall recording', { windowId });
    } catch (e) {
      logger.warn('[RecallService] stopRecording failed', { error: e.message });
    } finally {
      this.activeWindowId = null;
      this.activeUpload = null;
      this.partialTranscriptByWindow.delete(windowId);
      sharedStateService.patch({
        recallSdkStatus: this.enabled ? 'ready' : 'idle',
        recallRecording: null,
      });
    }
  }

  handleError(evt) {
    sharedStateService.patch({ recallSdkStatus: 'error' });
    logger.warn('[RecallService] SDK error', {
      type: evt?.type,
      message: evt?.message,
      windowId: evt?.window?.id,
    });
  }

  areAppWindowsLoaded(state) {
    return Boolean(state?.isHeaderLoaded && state?.isListenLoaded && state?.isDashboardLoaded);
  }

  async shutdown() {
    if (!this.sdk || !this.initialized) return;
    try {
      this.sdk.removeAllEventListeners?.();
      await this.sdk.shutdown?.();
    } catch (e) {
      logger.warn('[RecallService] shutdown failed', { error: e.message });
    } finally {
      this.sdk = null;
      this.initialized = false;
      this.activeWindowId = null;
      this.activeUpload = null;
      this.manuallyStoppedWindowIds.clear();
      this.partialTranscriptByWindow.clear();
      sharedStateService.patch({ recallSdkInitialized: false, recallSdkStatus: 'idle', recallRecording: null });
    }
  }
}

module.exports = new RecallService();

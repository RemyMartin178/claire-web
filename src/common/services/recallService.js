const sharedStateService = require('./sharedStateService');
const { createRecallSdkUpload } = require('../ai/providers/claire-api');
const { createLogger } = require('./logger.js');

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
  }

  async initialize() {
    if (this.initialized) return { success: true };

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
        error: (evt) => this.handleError(evt),
      };

      sdk.addEventListener('meeting-detected', this.boundHandlers.meetingDetected);
      sdk.addEventListener('recording-started', this.boundHandlers.recordingStarted);
      sdk.addEventListener('recording-ended', this.boundHandlers.recordingEnded);
      sdk.addEventListener('error', this.boundHandlers.error);

      this.sdk = sdk;
      this.initialized = true;
      sharedStateService.patch({ recallSdkStatus: 'ready' });
      logger.info('[RecallService] initialized', { apiUrl: RECALL_API_URL });
      return { success: true };
    } catch (e) {
      sharedStateService.patch({ recallSdkStatus: 'error' });
      logger.warn('[RecallService] initialization failed', { error: e.message });
      return { success: false, error: e.message };
    }
  }

  async setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      sharedStateService.patch({ recallSdkStatus: this.activeWindowId ? 'recording' : 'idle' });
      return { success: true };
    }
    return await this.initialize();
  }

  async handleMeetingDetected(evt) {
    if (!this.enabled || !this.sdk) return;
    const windowId = evt?.window?.id;
    if (!windowId || this.activeWindowId) return;

    try {
      const upload = await createRecallSdkUpload({
        window: evt.window,
        metadata: { detected_at: new Date().toISOString() },
      });

      await this.sdk.startRecording({
        windowId,
        uploadToken: upload.upload_token,
      });

      this.activeWindowId = windowId;
      this.activeUpload = upload;
      sharedStateService.patch({
        recallSdkStatus: 'recording',
        recallRecording: {
          windowId,
          uploadId: upload.id,
          recordingId: upload.recording_id,
          startedAt: Date.now(),
        },
      });
    } catch (e) {
      sharedStateService.patch({ recallSdkStatus: 'error' });
      logger.warn('[RecallService] failed to start recording', { error: e.message });
    }
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

  handleError(evt) {
    sharedStateService.patch({ recallSdkStatus: 'error' });
    logger.warn('[RecallService] SDK error', {
      type: evt?.type,
      message: evt?.message,
      windowId: evt?.window?.id,
    });
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
    }
  }
}

module.exports = new RecallService();

const { BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const { createSTT } = require('../../../common/ai/factory');
const modelStateService = require('../../../common/services/modelStateService');
const { notificationManager } = require('../../../main/notification-manager');
const { createLogger } = require('../../../common/services/logger.js');

const logger = createLogger('SttService');
// const { getStoredApiKey, getStoredProvider, getCurrentModelInfo } = require('../../../window/windowManager');

const COMPLETION_DEBOUNCE_MS = 500; // Reduced from 2000ms for lower latency

//  New heartbeat / renewal constants 
// Interval to send low-cost keep-alive messages so the remote service does not
// treat the connection as idle. One minute is safely below the typical 2-5 min
// idle timeout window seen on provider websockets.
const KEEP_ALIVE_INTERVAL_MS = 60 * 1000;         // 1 minute

// Interval after which we pro-actively tear down and recreate the STT sessions
// to dodge the 30-minute hard timeout enforced by some providers. 20 minutes
// gives a 10-minute safety buffer.
const SESSION_RENEW_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

// Duration to allow the old and new sockets to run in parallel so we don't
// miss any packets at the exact swap moment.
const SOCKET_OVERLAP_MS = 2 * 1000; // 2 seconds

class SttService {
    constructor() {
        this.mySttSession = null;
        this.theirSttSession = null;
        this.myCurrentUtterance = '';
        this.theirCurrentUtterance = '';
        
        // Turn-completion debouncing
        this.myCompletionBuffer = '';
        this.theirCompletionBuffer = '';
        this.myCompletionTimer = null;
        this.theirCompletionTimer = null;
        
        // System audio capture
        this.systemAudioProc = null;
        this.systemAudioPaused = false;  // Flag to pause system audio during TTS
        this.microphonePaused = false;   // Flag to pause microphone during TTS

        // Deduplication: prevent same text from both STT sessions firing within 2s
        this.recentFinals = new Map(); // text → { speaker, ts }
        this.DEDUP_WINDOW_MS = 2000;

        // Keep-alive / renewal timers
        this.keepAliveInterval = null;
        this.sessionRenewTimeout = null;

        // Silence auto-end: end session after 5 min of no transcript
        this.silenceTimer = null;
        this.SILENCE_TIMEOUT_MS = 5 * 60 * 1000;

        // Callbacks
        this.onTranscriptionComplete = null;
        this.onStatusUpdate = null;
        this.onSilenceTimeout = null;

        this.modelInfo = null; 
    }

    setCallbacks({ onTranscriptionComplete, onStatusUpdate, onSilenceTimeout }) {
        this.onTranscriptionComplete = onTranscriptionComplete;
        this.onStatusUpdate = onStatusUpdate;
        this.onSilenceTimeout = onSilenceTimeout || null;
    }

    _startSilenceTimer() {
        this._clearSilenceTimer();
        this.silenceTimer = setTimeout(() => {
            logger.info('[STT] Silence timeout — auto-ending session');
            this.sendToRenderer('stt-silence-timeout', {});
            if (this.onSilenceTimeout) this.onSilenceTimeout();
        }, this.SILENCE_TIMEOUT_MS);
    }

    _clearSilenceTimer() {
        if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    }

    _resetSilenceTimer() {
        this._startSilenceTimer();
    }

    sendToRenderer(channel, data) {
        // Listen [Korean comment translated] [Korean comment translated] Listen [Korean comment translated] [Korean comment translated] (Ask [Korean comment translated] [Korean comment translated] [Korean comment translated])
        const { windowPool } = require('../../../window/windowManager');
        const listenWindow = windowPool?.get('listen');
        
        if (listenWindow && !listenWindow.isDestroyed()) {
            listenWindow.webContents.send(channel, data);
        }
    }

    async handleSendSystemAudioContent(data, mimeType) {
        const result = await this.sendSystemAudioContent(data, mimeType);
        if (result.success) {
            this.sendToRenderer('system-audio-data', { data });
        }
        return result;
    }

    _isDuplicate(speaker, text) {
        const now = Date.now();
        // Purge stale entries
        for (const [key, val] of this.recentFinals) {
            if (now - val.ts > this.DEDUP_WINDOW_MS) this.recentFinals.delete(key);
        }
        const existing = this.recentFinals.get(text);
        if (existing && existing.speaker !== speaker && (now - existing.ts) < this.DEDUP_WINDOW_MS) {
            return true; // Same text already sent by the other speaker recently
        }
        this.recentFinals.set(text, { speaker, ts: now });
        return false;
    }

    flushMyCompletion() {
        const finalText = (this.myCompletionBuffer + this.myCurrentUtterance).trim();

        if (!this.modelInfo || !finalText) return;

        if (this.microphonePaused) {
            this.myCompletionBuffer = '';
            this.myCompletionTimer = null;
            this.myCurrentUtterance = '';
            return;
        }

        if (this._isDuplicate('Me', finalText)) {
            logger.info('[STT] Dedup: skipping mic final (already sent by system audio):', finalText.substring(0, 60));
            this.myCompletionBuffer = '';
            this.myCompletionTimer = null;
            this.myCurrentUtterance = '';
            return;
        }

        // Notify completion callback with correct speaker identification
        if (this.onTranscriptionComplete) {
            this.onTranscriptionComplete('user', finalText);
        }

        // Send to renderer as final
        this.sendToRenderer('stt-update', {
            speaker: 'Me',
            text: finalText,
            isPartial: false,
            isFinal: true,
            timestamp: Date.now(),
        });

        // Show notification for transcription completion
        notificationManager.showSTTComplete('Me', finalText);

        this.myCompletionBuffer = '';
        this.myCompletionTimer = null;
        this.myCurrentUtterance = '';
        this._resetSilenceTimer();

        if (this.onStatusUpdate) {
            this.onStatusUpdate('Écoute en cours...');
        }
    }

    flushTheirCompletion() {
        if (this.systemAudioPaused) {
            this.theirCompletionBuffer = '';
            this.theirCompletionTimer = null;
            this.theirCurrentUtterance = '';
            return;
        }

        const finalText = (this.theirCompletionBuffer + this.theirCurrentUtterance).trim();

        if (!this.modelInfo || !finalText) return;

        if (this._isDuplicate('Them', finalText)) {
            logger.info('[STT] Dedup: skipping system audio final (already sent by mic):', finalText.substring(0, 60));
            this.theirCompletionBuffer = '';
            this.theirCompletionTimer = null;
            this.theirCurrentUtterance = '';
            return;
        }

        // Notify completion callback with correct speaker identification
        if (this.onTranscriptionComplete) {
            this.onTranscriptionComplete('system', finalText);
        }
        
        // Send to renderer as final (no filtering needed - agent response shows immediately)
        this.sendToRenderer('stt-update', {
            speaker: 'Them',
            text: finalText,
            isPartial: false,
            isFinal: true,
            timestamp: Date.now(),
        });

        // Show notification for transcription completion
        notificationManager.showSTTComplete('Them', finalText);

        this.theirCompletionBuffer = '';
        this.theirCompletionTimer = null;
        this.theirCurrentUtterance = '';
        this._resetSilenceTimer();

        if (this.onStatusUpdate) {
            this.onStatusUpdate('Écoute en cours...');
        }
    }

    debounceMyCompletion(text) {
        this.myCompletionBuffer += (this.myCompletionBuffer ? ' ' : '') + text;

        if (this.myCompletionTimer) clearTimeout(this.myCompletionTimer);
        this.myCompletionTimer = setTimeout(() => this.flushMyCompletion(), COMPLETION_DEBOUNCE_MS);
    }

    debounceTheirCompletion(text) {
        this.theirCompletionBuffer += (this.theirCompletionBuffer ? ' ' : '') + text;

        if (this.theirCompletionTimer) clearTimeout(this.theirCompletionTimer);
        this.theirCompletionTimer = setTimeout(() => this.flushTheirCompletion(), COMPLETION_DEBOUNCE_MS);
    }

    async initializeSttSessions(language = 'auto') {
        // Auto-detect French and English by default
        // For Deepgram: use 'multi' for multilanguage support
        // For OpenAI/Whisper: null/undefined for auto-detection
        const effectiveLanguage = process.env.OPENAI_TRANSCRIBE_LANG || language || 'auto';

        const modelInfo = modelStateService.getCurrentModelInfo('stt');
        logger.info('[STT] Configuration récupérée:', {
            hasModelInfo: !!modelInfo,
            provider: modelInfo?.provider,
            model: modelInfo?.model
        });
        
        if (!modelInfo) {
            throw new Error('STT model info unavailable');
        }
        this.modelInfo = modelInfo;
        logger.info(`[STT] Initialisation ${modelInfo.provider} avec le modèle ${modelInfo.model}`);

        const handleMyMessage = message => {
            if (this.microphonePaused) {
                return;
            }

            if (!this.modelInfo) {
                logger.info('[SttService] Ignoring message - session already closed');
                return;
            }
            
            // Handle optimized AssemblyAI/Deepgram message format
            if (message.type === 'speech_started') {
                // Voice activity detected - prepare for incoming audio
                return;
            } else if (message.type === 'utterance_end') {
                // Utterance completed - finalize any pending text
                if (this.myCompletionTimer) {
                    clearTimeout(this.myCompletionTimer);
                    this.flushMyCompletion();
                }
                return;
            }

            // Handle transcript results
            const text = message.transcript || message.channel?.alternatives?.[0]?.transcript;
            if (!text || text.trim().length === 0) return;

            const isFinal = message.is_final;
            const confidence = message.confidence || message.channel?.alternatives?.[0]?.confidence || 0;

            if (isFinal) {
                // Flush synchronously to prevent next partial from contaminating this sentence
                if (this.myCompletionTimer) { clearTimeout(this.myCompletionTimer); this.myCompletionTimer = null; }
                this.myCurrentUtterance = '';
                this.myCompletionBuffer = text;
                this.flushMyCompletion();
            } else {
                if (this.myCompletionTimer) clearTimeout(this.myCompletionTimer);
                this.myCompletionTimer = null;

                this.myCurrentUtterance = text;

                this.sendToRenderer('stt-update', {
                    speaker: 'Me',
                    text: text,
                    isPartial: true,
                    isFinal: false,
                    confidence: confidence,
                    timestamp: Date.now(),
                });
            }

            if (message.error) {
                logger.error('STT Session Error:', { error: message.error });
            }
        };

        const handleTheirMessage = message => {
            if (!message || typeof message !== 'object') return;

            if (this.systemAudioPaused) {
                return;
            }

            if (!this.modelInfo) {
                logger.info('[SttService] Ignoring message - session already closed');
                return;
            }
            
            // Handle optimized AssemblyAI/Deepgram message format
            if (message.type === 'speech_started') {
                // Voice activity detected - prepare for incoming audio
                return;
            } else if (message.type === 'utterance_end') {
                // Utterance completed - finalize any pending text
                if (this.theirCompletionTimer) {
                    clearTimeout(this.theirCompletionTimer);
                    this.flushTheirCompletion();
                }
                return;
            }

            // Handle transcript results
            const text = message.transcript || message.channel?.alternatives?.[0]?.transcript;
            if (!text || text.trim().length === 0) return;

            const isFinal = message.is_final;
            const confidence = message.confidence || message.channel?.alternatives?.[0]?.confidence || 0;

            if (isFinal) {
                // Flush synchronously to prevent next partial from contaminating this sentence
                if (this.theirCompletionTimer) { clearTimeout(this.theirCompletionTimer); this.theirCompletionTimer = null; }
                this.theirCurrentUtterance = '';
                this.theirCompletionBuffer = text;
                this.flushTheirCompletion();
            } else {
                if (this.theirCompletionTimer) clearTimeout(this.theirCompletionTimer);
                this.theirCompletionTimer = null;

                this.theirCurrentUtterance = text;

                this.sendToRenderer('stt-update', {
                    speaker: 'Them',
                    text: text,
                    isPartial: true,
                    isFinal: false,
                    confidence: confidence,
                    timestamp: Date.now(),
                });
            }

            if (message.error) {
                logger.error('STT Session Error:', { error: message.error });
            }
        };

        const mySttConfig = {
            language: effectiveLanguage,
            callbacks: {
                onmessage: handleMyMessage,
                onerror: error => logger.error('My STT session error:', { message: error.message }),
                onclose: event => logger.info('My STT session closed:', event.reason),
            },
        };
        
        const theirSttConfig = {
            language: effectiveLanguage,
            callbacks: {
                onmessage: handleTheirMessage,
                onerror: error => logger.error('Their STT session error:', { message: error.message }),
                onclose: event => logger.info('Their STT session closed:', event.reason),
            },
        };
        
        let finalLanguage = effectiveLanguage === 'auto' ? 'fr' : effectiveLanguage;

        const sttOptions = {
            language: finalLanguage,
            sampleRate: 24000,
            model: this.modelInfo.model || 'u3-rt-pro',
        };

        const myOptions = { ...sttOptions, callbacks: mySttConfig.callbacks };
        const theirOptions = { ...sttOptions, callbacks: theirSttConfig.callbacks };

        logger.info('[STT] Création des sessions de transcription...', {
            provider: this.modelInfo.provider,
            model: sttOptions.model,
            langue: finalLanguage,
            autoDetect: effectiveLanguage === 'auto',
            multilangue: finalLanguage === 'multi'
        });

        // [TOOL] Add timeout to prevent hanging on first initialization
        const createWithTimeout = (provider, options, sessionName) => {
            return Promise.race([
                createSTT(provider, options),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`${sessionName} STT session creation timeout after 10s`)), 10000)
                )
            ]).catch(error => {
                logger.error(`[ERROR] ${sessionName} STT session creation failed:`, { error: error.message });
                throw error;
            });
        };

        let initializationFailed = false;

        try {
            [this.mySttSession, this.theirSttSession] = await Promise.all([
                createWithTimeout(this.modelInfo.provider, myOptions, 'My'),
                createWithTimeout(this.modelInfo.provider, theirOptions, 'Their'),
            ]);
        } catch (error) {
            initializationFailed = true;
            throw error;
        }

        logger.info('[STT] Sessions de transcription créées avec succès:', {
            sessionMicrophone: !!this.mySttSession,
            sessionSysteme: !!this.theirSttSession,
            provider: this.modelInfo.provider,
            model: this.modelInfo.model,
            langue: finalLanguage
        });

        // Start silence auto-end timer
        this._startSilenceTimer();

        //  Setup keep-alive heart-beats
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = setInterval(() => {
            this._sendKeepAlive();
        }, KEEP_ALIVE_INTERVAL_MS);

        //  Schedule session auto-renewal 
        if (this.sessionRenewTimeout) clearTimeout(this.sessionRenewTimeout);
        this.sessionRenewTimeout = setTimeout(async () => {
            try {
                logger.info('[SttService] Auto-renewing STT sessions…');
                await this.renewSessions(effectiveLanguage);
            } catch (err) {
                logger.error('[SttService] Failed to renew STT sessions:', err);
            }
        }, SESSION_RENEW_INTERVAL_MS);

        return true;
    }

    /**
     * Send a lightweight keep-alive to prevent idle disconnects.
     * Currently only implemented for OpenAI provider because Gemini's SDK
     * already performs its own heart-beats.
     */
    _sendKeepAlive() {
        if (!this.isSessionActive()) return;

        if (this.modelInfo?.provider === 'openai') {
            try {
                this.mySttSession?.keepAlive?.();
                this.theirSttSession?.keepAlive?.();
            } catch (err) {
                logger.error('[SttService] keepAlive error:', err.message);
            }
        }
    }

    /**
     * Gracefully tears down then recreates the STT sessions. Should be invoked
     * on a timer to avoid provider-side hard timeouts.
     */
    async renewSessions(language = 'auto') {
        if (!this.isSessionActive()) {
            logger.warn('[SttService] renewSessions called but no active session.');
            return;
        }

        const oldMySession = this.mySttSession;
        const oldTheirSession = this.theirSttSession;

        logger.info('[SttService] Spawning fresh STT sessions in the background…');

        // We reuse initializeSttSessions to create fresh sessions with the same
        // language and handlers. The method will update the session pointers
        // and timers, but crucially it does NOT touch the system audio capture
        // pipeline, so audio continues flowing uninterrupted.
        await this.initializeSttSessions(language);

        // Close the old sessions after a short overlap window.
        setTimeout(() => {
            try {
                oldMySession?.close?.();
                oldTheirSession?.close?.();
                logger.info('[SttService] Old STT sessions closed after hand-off.');
            } catch (err) {
                logger.error('[SttService] Error closing old STT sessions:', err.message);
            }
        }, SOCKET_OVERLAP_MS);
    }

    async sendMicAudioContent(data, mimeType) {
        // Enhanced debugging for microphone audio processing
        // Audio chunk processing (debug logging removed to prevent terminal flooding)
        
        if (!this.mySttSession) {
            // Only log warning occasionally to avoid spam during shutdown
            if (Math.random() < 0.1) { // Log ~10% of ignored audio chunks
                logger.warn('Microphone audio ignored - STT session not active yet (buffered audio during shutdown/startup)');
            }
            return { success: false, error: 'STT session not active' };
        }

        let modelInfo = this.modelInfo;
        if (!modelInfo) {
            logger.warn('modelInfo not found, fetching on-the-fly as a fallback...');
            modelInfo = modelStateService.getCurrentModelInfo('stt');
        }
        if (!modelInfo) {
            return { success: false, error: 'STT model info could not be retrieved' };
        }

        try {
            const payload = Buffer.from(data, 'base64');

            await this.mySttSession.sendRealtimeInput(payload);
            // Microphone audio sent to STT session (debug logging removed to prevent terminal flooding)
            return { success: true };
        } catch (error) {
            logger.error('[SttService] [ERROR] Error sending microphone audio to STT session:', { 
                error: error.message,
                provider: modelInfo.provider,
                dataType: typeof data,
                payloadType: typeof payload
            });
            return { success: false, error: error.message };
        }
    }

    async sendSystemAudioContent(data, mimeType) {
        if (!this.theirSttSession) {
            logger.warn('System audio ignored - Their STT session not active yet', {
                theirSttSession: !!this.theirSttSession,
                mySttSession: !!this.mySttSession,
                modelInfo: !!this.modelInfo
            });
            return { success: false, error: 'Their STT session not active' };
        }

        let modelInfo = this.modelInfo;
        if (!modelInfo) {
            logger.warn('modelInfo not found, fetching on-the-fly as a fallback...');
            modelInfo = modelStateService.getCurrentModelInfo('stt');
        }
        if (!modelInfo) {
            return { success: false, error: 'STT model info could not be retrieved' };
        }

        const payload = Buffer.from(data, 'base64');

        try {
            await this.theirSttSession.sendRealtimeInput(payload);
            return { success: true };
        } catch (error) {
            logger.error('Error sending system audio to STT session:', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    killExistingSystemAudioDump() {
        return new Promise(resolve => {
            logger.info('Checking for existing SystemAudioDump processes...');

            const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
                stdio: 'ignore',
            });

            killProc.on('close', code => {
                if (code === 0) {
                    logger.info('Killed existing SystemAudioDump processes');
                } else {
                    logger.info('No existing SystemAudioDump processes found');
                }
                resolve();
            });

            killProc.on('error', err => {
                logger.info('Error checking for existing processes (this is normal):', err.message);
                resolve();
            });

            setTimeout(() => {
                killProc.kill();
                resolve();
            }, 2000);
        });
    }

    async startParallelAudioCapture() {
        logger.info('Starting parallel audio capture for both microphone and system audio...');
        
        // Start both microphone and system audio capture simultaneously
        const promises = [];
        
        // Always start system audio capture if available
        if (process.platform === 'darwin') {
            promises.push(this.startMacOSAudioCapture().catch(error => {
                logger.warn('System audio capture failed but continuing with microphone:', error);
                return false;
            }));
        } else if (process.platform === 'win32') {
            // For Windows, start browser-based system audio capture
            promises.push(this.startWindowsSystemAudioCapture().catch(error => {
                logger.warn('Windows system audio capture failed but continuing with microphone:', error);
                return false;
            }));
        }
        
        // Note: Microphone capture is handled by the renderer process (listenCapture.js)
        // This just ensures STT sessions are ready for both streams
        
        const results = await Promise.allSettled(promises);
        logger.info('Parallel audio capture initialization results:', {
            systemAudio: results[0]?.status === 'fulfilled' && results[0]?.value
        });
        
        return true;
    }

    async startMacOSAudioCapture() {
        if (process.platform !== 'darwin' || !this.theirSttSession) return false;

        await this.killExistingSystemAudioDump();
        logger.info('Starting macOS audio capture for "Them"...');

        const { app } = require('electron');
        const path = require('path');
        const systemAudioPath = app.isPackaged
            ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'ui', 'assets', 'SystemAudioDump')
            : path.join(app.getAppPath(), 'src', 'ui', 'assets', 'SystemAudioDump');

        logger.info('SystemAudioDump path:', systemAudioPath);

        this.systemAudioProc = spawn(systemAudioPath, [], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        if (!this.systemAudioProc.pid) {
            logger.error('Failed to start SystemAudioDump');
            return false;
        }

        logger.info('SystemAudioDump started with PID:', this.systemAudioProc.pid);

        const CHUNK_DURATION = 0.1; // 100ms chunks for AssemblyAI (via claire-api)
        const SAMPLE_RATE = 24000;
        const BYTES_PER_SAMPLE = 2;
        const CHANNELS = 2;
        const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

        let audioBuffer = Buffer.alloc(0);

        // const provider = await this.getAiProvider();
        // const isGemini = provider === 'gemini';

        let modelInfo = this.modelInfo;
        if (!modelInfo) {
            logger.warn('modelInfo not found, fetching on-the-fly as a fallback...');
            modelInfo = modelStateService.getCurrentModelInfo('stt');
        }
        if (!modelInfo) {
            throw new Error('STT model info could not be retrieved.');
        }

        this.systemAudioProc.stdout.on('data', async data => {
            audioBuffer = Buffer.concat([audioBuffer, data]);

            while (audioBuffer.length >= CHUNK_SIZE) {
                const chunk = audioBuffer.slice(0, CHUNK_SIZE);
                audioBuffer = audioBuffer.slice(CHUNK_SIZE);

                const monoChunk = CHANNELS === 2 ? this.convertStereoToMono(chunk) : chunk;
                const base64Data = monoChunk.toString('base64');

                this.sendToRenderer('system-audio-data', { data: base64Data });

                if (this.theirSttSession) {
                    try {
                        const payload = Buffer.from(base64Data, 'base64');

                        await this.theirSttSession.sendRealtimeInput(payload);
                    } catch (err) {
                        logger.error('Error sending system audio:', err.message);
                    }
                }
            }
        });

        this.systemAudioProc.stderr.on('data', data => {
            logger.error('SystemAudioDump stderr:', data.toString());
        });

        this.systemAudioProc.on('close', code => {
            logger.info('SystemAudioDump process closed with code:', code);
            this.systemAudioProc = null;
        });

        this.systemAudioProc.on('error', err => {
            logger.error('Error occurred:', { error: err });
            this.systemAudioProc = null;
        });

        return true;
    }

    async startWindowsSystemAudioCapture() {
        if (process.platform !== 'win32' || !this.theirSttSession) return false;

        logger.info('Starting Windows system audio capture for "Them"...');

        // Send message to renderer to start system audio capture using browser APIs
        this.sendToRenderer('start-system-audio-capture', { provider: this.modelInfo?.provider });
        
        // Add minimal delay to allow renderer to process the start request
        await new Promise(resolve => setTimeout(resolve, 10));
        
        logger.info('[OK] Windows system audio capture request sent to renderer');
        return true;
    }

    async stopWindowsSystemAudioCapture() {
        logger.info('Stopping Windows system audio capture...');
        this.sendToRenderer('stop-system-audio-capture', {});
        
        // Add minimal delay to allow renderer to process the stop request
        await new Promise(resolve => setTimeout(resolve, 5));
        
        logger.info('[OK] Windows system audio stop request sent to renderer');
    }

    convertStereoToMono(stereoBuffer) {
        const samples = stereoBuffer.length / 4;
        const monoBuffer = Buffer.alloc(samples * 2);

        for (let i = 0; i < samples; i++) {
            const leftSample = stereoBuffer.readInt16LE(i * 4);
            monoBuffer.writeInt16LE(leftSample, i * 2);
        }

        return monoBuffer;
    }

    stopMacOSAudioCapture() {
        if (this.systemAudioProc) {
            logger.info('Stopping SystemAudioDump...');
            this.systemAudioProc.kill('SIGTERM');
            this.systemAudioProc = null;
        }
    }

    // TTS Audio Interference Prevention Methods
    async pauseSystemAudioCapture() {
        try {
            this.systemAudioPaused = true;
            
            // Platform-specific pause logic
            if (process.platform === 'darwin') {
                // macOS: Stop SystemAudioDump process
                if (this.systemAudioProc) {
                    logger.info('[CRITICAL] Temporarily stopping SystemAudioDump process during TTS');
                    this.systemAudioProc.kill('SIGTERM');
                    this.systemAudioProc = null;
                    this.systemAudioWasRunning = true; // Flag to restart it later
                }
            } else if (process.platform === 'win32') {
                // Windows: Stop browser-based system audio capture
                logger.info('[CRITICAL] Stopping Windows system audio capture during TTS');
                await this.stopWindowsSystemAudioCapture();
                this.systemAudioWasRunning = true; // Flag to restart it later
            }
            
            logger.info('System audio capture paused for TTS playback');
            return { success: true };
        } catch (error) {
            logger.error('Failed to pause system audio capture:', error.message);
            return { success: false, error: error.message };
        }
    }

    async resumeSystemAudioCapture() {
        try {
            this.systemAudioPaused = false;
            
            // CRITICAL: Restart SystemAudioDump process if it was previously running (works on both macOS and Windows)
            if (this.systemAudioWasRunning && this.theirSttSession) {
                logger.info('[AUDIO] [CRITICAL] Restarting SystemAudioDump process after TTS');
                this.systemAudioWasRunning = false;
                
                // Restart the system audio capture - platform-specific
                if (process.platform === 'darwin') {
                    await this.startMacOSAudioCapture();
                } else if (process.platform === 'win32') {
                    await this.startWindowsSystemAudioCapture();
                }
            }
            
            logger.info('[AUDIO] System audio capture resumed after TTS playback');
            return { success: true };
        } catch (error) {
            logger.error('[AUDIO] Failed to resume system audio capture:', error.message);
            return { success: false, error: error.message };
        }
    }

    async pauseMicrophoneCapture() {
        try {
            logger.info('[STT SERVICE] Pausing microphone capture for TTS');
            this.microphonePaused = true;
            
            // Actually pause the microphone MediaStream in renderer
            this.sendToRenderer('pause-microphone-stream', {});
            
            // Add minimal delay to allow renderer to process the pause request
            await new Promise(resolve => setTimeout(resolve, 5));
            
            logger.info('Microphone capture paused for TTS playback');
            return { success: true };
        } catch (error) {
            logger.error('Failed to pause microphone capture:', error.message);
            return { success: false, error: error.message };
        }
    }

    async resumeMicrophoneCapture() {
        try {
            this.microphonePaused = false;
            
            // Actually resume the microphone MediaStream in renderer
            this.sendToRenderer('resume-microphone-stream', {});
            
            // Add minimal delay to allow renderer to process the resume request
            await new Promise(resolve => setTimeout(resolve, 10));
            
            logger.info('[AUDIO] Microphone capture resumed after TTS playback');
            return { success: true };
        } catch (error) {
            logger.error('[AUDIO] Failed to resume microphone capture:', error.message);
            return { success: false, error: error.message };
        }
    }


    // REMOVED: Complex TTS audio filtering - no longer needed since agent responses show immediately in transcript

    /**
     * Restart microphone STT session to ensure responsiveness after TTS playback
     * This fixes the issue where STT gets stuck after the first transcript
     */
    async restartMicrophoneSTTSession() {
        logger.info('[SttService] [LOADING] Restarting microphone STT session after TTS playback...');
        
        try {
            // Store current session state
            const wasActive = !!this.mySttSession;
            
            if (!wasActive) {
                logger.warn('[SttService] No active microphone STT session to restart');
                return { success: true, message: 'No session to restart' };
            }
            
            // Close current session gracefully
            if (this.mySttSession) {
                try {
                    await this.mySttSession.close();
                    logger.info('[SttService]  Previous microphone STT session closed');
                } catch (closeError) {
                    logger.warn('[SttService] [WARNING] Error closing previous STT session:', closeError.message);
                }
                this.mySttSession = null;
            }
            
            // Small delay to ensure clean session closure
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Restart session with current configuration
            const modelInfo = this.modelInfo || modelStateService.getCurrentModelInfo('stt');
            if (!modelInfo) {
                throw new Error('STT model configuration not available for restart');
            }
            
            // Recreate the "My" STT session using the same logic as initialization
            logger.info('[SttService]  Creating new microphone STT session...');
            
            const handleMyMessage = message => {
                if (this.microphonePaused) {
                    return;
                }

                if (!this.modelInfo) {
                    logger.info('[SttService] Ignoring message - session already closed');
                    return;
                }
                
                // Handle optimized AssemblyAI message format
                if (message.type === 'speech_started') {
                    return;
                } else if (message.type === 'utterance_end') {
                    if (this.myCompletionTimer) {
                        clearTimeout(this.myCompletionTimer);
                        this.flushMyCompletion();
                    }
                    return;
                }

                const text = message.transcript || message.channel?.alternatives?.[0]?.transcript;
                if (!text || text.trim().length === 0) return;

                const isFinal = message.is_final;
                const confidence = message.confidence || message.channel?.alternatives?.[0]?.confidence || 0;

                if (isFinal) {
                    if (this.myCompletionTimer) { clearTimeout(this.myCompletionTimer); this.myCompletionTimer = null; }
                    this.myCurrentUtterance = '';
                    this.myCompletionBuffer = text;
                    this.flushMyCompletion();
                } else {
                    if (this.myCompletionTimer) clearTimeout(this.myCompletionTimer);
                    this.myCompletionTimer = null;

                    this.myCurrentUtterance = text;

                    this.sendToRenderer('stt-update', {
                        speaker: 'Me',
                        text: text,
                        isPartial: true,
                        isFinal: false,
                        confidence: confidence,
                        timestamp: Date.now(),
                    });
                }

                if (message.error) {
                    logger.error('STT Session Error:', { error: message.error });
                }
            };

            const mySttConfig = {
                language: this.modelInfo.language || 'en',
                callbacks: {
                    onmessage: handleMyMessage,
                    onerror: error => logger.error('My STT session error:', { message: error.message }),
                    onclose: event => logger.info('My STT session closed:', event.reason),
                },
            };
            
            const sttOptions = {
                language: this.modelInfo.language || 'fr',
                sampleRate: 24000,
                model: modelInfo.model || 'u3-rt-pro',
                callbacks: mySttConfig.callbacks,
            };

            this.mySttSession = await Promise.race([
                createSTT(modelInfo.provider, sttOptions),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Microphone STT session restart timeout after 10s')), 10000)
                )
            ]);
            
            if (this.mySttSession) {
                logger.info('[SttService] [OK] Microphone STT session successfully restarted');
                return { success: true, message: 'STT session restarted successfully' };
            } else {
                throw new Error('Failed to create new STT session');
            }
            
        } catch (error) {
            logger.error('[SttService] [ERROR] Failed to restart microphone STT session:', error);
            return { success: false, error: error.message };
        }
    }

    isSessionActive() {
        const myActive = !!this.mySttSession;
        const theirActive = !!this.theirSttSession;
        const overallActive = myActive && theirActive;
        
        if (!overallActive) {
            // logger.warn('[SttService] Session not fully active:', {
            //     mySttSession: myActive,
            //     theirSttSession: theirActive,
            //     overallActive: overallActive
            // });
        }
        
        return overallActive;
    }

    async closeSessions() {
        // Stop system audio capture directly
        this.stopMacOSAudioCapture();

        // Clear silence timer, heartbeat, and renewal timers
        this._clearSilenceTimer();
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        if (this.sessionRenewTimeout) {
            clearTimeout(this.sessionRenewTimeout);
            this.sessionRenewTimeout = null;
        }

        // Clear timers
        if (this.myCompletionTimer) {
            clearTimeout(this.myCompletionTimer);
            this.myCompletionTimer = null;
        }
        if (this.theirCompletionTimer) {
            clearTimeout(this.theirCompletionTimer);
            this.theirCompletionTimer = null;
        }

        const closePromises = [];
        if (this.mySttSession) {
            closePromises.push(this.mySttSession.close());
            this.mySttSession = null;
        }
        if (this.theirSttSession) {
            closePromises.push(this.theirSttSession.close());
            this.theirSttSession = null;
        }

        await Promise.all(closePromises);
        logger.info('All STT sessions closed.');

        // Reset state
        this.myCurrentUtterance = '';
        this.theirCurrentUtterance = '';
        this.myCompletionBuffer = '';
        this.theirCompletionBuffer = '';
        this.modelInfo = null; 
    }
}

module.exports = SttService; 
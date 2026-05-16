// src/bridge/featureBridge.js
const { ipcMain, app } = require('electron');
const windowManager = require('../window/windowManager');
const internalBridge = require('./internalBridge');
const sharedStateService = require('../common/services/sharedStateService');
const { getFirestoreInstance } = require('../common/services/firebaseClient');
const { collection, doc, getDoc, getDocs, deleteDoc, writeBatch } = require('firebase/firestore');
const settingsService = require('../features/settings/settingsService');
const authService = require('../common/services/authService');
const modelStateService = require('../common/services/modelStateService');
const shortcutsService = require('../features/shortcuts/shortcutsService');
const presetRepository = require('../common/repositories/preset');

const askService = require('../features/ask/askService');
const listenService = require('../features/listen/listenService');
const recallService = require('../common/services/recallService');
const permissionService = require('../common/services/permissionService');
const subscriptionService = require('../common/services/subscriptionService');
const { createLogger } = require('../common/services/logger.js');

// Memory API Client for backend memory operations
const MemoryApiClient = require('../domains/conversation/memory-api-client');

const logger = createLogger('FeatureBridge');

const MODEL_NAME_RE = /^[a-zA-Z0-9._:/-]{1,200}$/;
let dashboardStartClairePromise = null;

function isValidModelName(name) {
    return typeof name === 'string' && MODEL_NAME_RE.test(name);
}

const VALID_LISTEN_BUTTON_TEXTS = ['Listen', 'Stop', 'Done'];

function withModelName(channel, handler) {
    return async (event, modelName) => {
        if (!isValidModelName(modelName)) {
            logger.warn(`[FeatureBridge] ${channel} rejected invalid model name`);
            return { success: false, error: 'Invalid model name' };
        }
        return handler(modelName);
    };
}

// Serialize Firestore Timestamps to plain ms numbers for IPC transport
function _serializeFsDoc(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const out = {};
    for (const [k, v] of Object.entries(data)) {
        if (v && typeof v.toMillis === 'function') {
            out[k] = v.toMillis(); // Timestamp → number
            // Convenience keys used by sorting
            if (k === 'startedAt' || k === 'started_at') out._startMs = v.toMillis();
            if (k === 'startAt') out._startAtMs = v.toMillis();
            if (k === 'sentAt') out._sentAtMs = v.toMillis();
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
            out[k] = _serializeFsDoc(v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

module.exports = {
    // Renderer[Korean comment translated] Request[Korean comment translated] [Korean comment translated] [Korean comment translated] [Korean comment translated]
    initialize() {
        // ── SharedState bridge (centralized cross-window state) ──────────────
        // Renderers read it via window.api.sharedState.get()/.subscribe()/.patch().
        // windowReconciler broadcasts updates and applies side effects.
        ipcMain.handle('shared-state:get', () => sharedStateService.get());
        ipcMain.handle('shared-state:patch', (_event, partial) => sharedStateService.patch(partial));


        // Settings Service
        ipcMain.handle('settings:getPresets', async () => await settingsService.getPresets());
        ipcMain.handle('settings:get-auto-update', async () => await settingsService.getAutoUpdateSetting());
        ipcMain.handle('settings:set-auto-update', async (event, isEnabled) => {
            sharedStateService.patch({ autoUpdate: Boolean(isEnabled) });
            return { success: true };
        });
        void (async () => {
            try {
                sharedStateService.patch({
                    selectedModel: modelStateService.getSelectedModels(),
                    autoUpdate: await settingsService.getAutoUpdateSetting(),
                });
            } catch (e) {
                logger.warn('[FeatureBridge] SharedState hydration failed', { error: e.message });
            }
        })();
        ipcMain.handle('settings:get-model-settings', async () => await settingsService.getModelSettings());
        ipcMain.handle('settings:validate-and-save-key', async (e, { provider, key }) => await settingsService.validateAndSaveKey(provider, key));
        ipcMain.handle('settings:clear-api-key', async (e, { provider }) => await settingsService.clearApiKey(provider));
        ipcMain.handle('settings:set-selected-model', async (e, { type, modelId }) => await settingsService.setSelectedModel(type, modelId));

        // Shortcuts
        ipcMain.handle('settings:getCurrentShortcuts', async () => await shortcutsService.loadKeybinds());
        ipcMain.handle('shortcut:getDefaultShortcuts', async () => await shortcutsService.handleRestoreDefaults());
        ipcMain.handle('shortcut:closeShortcutSettingsWindow', async () => await shortcutsService.closeShortcutSettingsWindow());
        ipcMain.handle('shortcut:openShortcutSettingsWindow', async () => await shortcutsService.openShortcutSettingsWindow());
        ipcMain.handle('shortcut:saveShortcuts', async (event, newKeybinds) => await shortcutsService.handleSaveShortcuts(newKeybinds));
        ipcMain.handle('shortcut:toggleAllWindowsVisibility', async () => await shortcutsService.toggleAllWindowsVisibility());

        // Permissions
        ipcMain.handle('check-system-permissions', async () => await permissionService.checkSystemPermissions());
        ipcMain.handle('request-microphone-permission', async () => await permissionService.requestMicrophonePermission());
        ipcMain.handle('open-system-preferences', async (event, section) => await permissionService.openSystemPreferences(section));
        ipcMain.handle('mark-permissions-completed', async () => await permissionService.markPermissionsAsCompleted());
        ipcMain.handle('check-permissions-completed', async () => await permissionService.checkPermissionsCompleted());

        // User/Auth
        ipcMain.handle('get-current-user', () => authService.getCurrentUser());
        ipcMain.handle('get-subscription-status', () => subscriptionService.getUserSubscription());
        ipcMain.handle('start-firebase-auth', async () => await authService.startFirebaseAuthFlow());
        ipcMain.handle('firebase-logout', async () => {
            // End active listen session (sets ended_at) before signing out
            try { await listenService.closeSession(); } catch { }
            await authService.signOut();
        });

        // Handle Firebase auth success from web UI
        ipcMain.handle('firebase-auth-success', async (event, { uid, displayName, email, idToken }) => {
            logger.info('[FeatureBridge] Received firebase-auth-success:', { uid, email, displayName });
            logger.info('[FeatureBridge] ID Token length:', idToken ? idToken.length : 'null');
            try {
                await authService.signInWithCustomToken(idToken);
                logger.info('[FeatureBridge] Successfully signed in with Firebase token - broadcasting user state');

                // Force broadcast user state to ensure UI updates
                setTimeout(() => {
                    authService.broadcastUserState();
                    logger.info('[FeatureBridge] User state broadcast completed');
                }, 1000);

                return { success: true, message: 'Authentication successful' };

            } catch (error) {
                logger.error('[FeatureBridge] Failed to sign in with Firebase token:', error);
                logger.error('[FeatureBridge] Error details:', { message: error.message, code: error.code });
                return { success: false, error: error.message };
            }
        });

        // 3-Component Sync Service
        const { syncService } = require('../services/sync-service');
        ipcMain.handle('sync:perform-full-sync', async () => await syncService.performFullSync());
        ipcMain.handle('sync:sync-agent', async (event, agentId) => await syncService.syncAgent(agentId));
        ipcMain.handle('sync:check-backend-connectivity', async () => await syncService.checkBackendConnectivity());
        ipcMain.handle('sync:get-status', async () => syncService.getStatus());
        ipcMain.handle('sync:start-auto-sync', async () => {
            syncService.updateConfig({ autoSyncEnabled: true });
            syncService.startAutoSync();
            return { success: true };
        });
        ipcMain.handle('sync:stop-auto-sync', async () => {
            syncService.updateConfig({ autoSyncEnabled: false });
            syncService.stopAutoSync();
            return { success: true };
        });

        // App
        // "Quitter" from settings hides the app to background (process stays alive)
        // To truly quit, the user can use Task Manager.
        ipcMain.handle('quit-application', async () => {
            // End active listen session so ended_at is recorded before going to background
            try { await listenService.closeSession(); } catch { }
            const { getOverlayWindow, stopOverlayPolling } = require('../window/windowManager');
            // Stop the 60fps cursor-tracking loop — no UI visible, no need to poll
            try { stopOverlayPolling(); } catch { }
            const overlay = getOverlayWindow ? getOverlayWindow() : null;
            if (overlay && !overlay.isDestroyed()) {
                overlay.hide();
            }
        });

        // Whisper
        // General
        ipcMain.handle('get-preset-templates', () => presetRepository.getPresetTemplates());
        ipcMain.handle('get-web-url', () => process.env.XERUS_WEB_URL || process.env.pickleglass_WEB_URL || 'https://app.clairia.app');

        // Ask - Core handlers
        ipcMain.handle('ask:sendQuestionFromAsk', async (event, userPrompt, options = {}, askHistory = []) => {
            // Récupère le contexte de la session d'écoute active si disponible
            const sessionData = listenService.getCurrentSessionData();
            const listenHistory = sessionData?.conversationHistory || [];

            // Format Ask conversation history for the prompt
            const formattedAskHistory = (askHistory || []).slice(-10).map(m => `Q: ${m.question}\nA: ${m.text || ''}`);

            let enrichedPrompt = userPrompt;

            // Inject listen context if an active session exists
            if (listenHistory.length > 0) {
                enrichedPrompt += `\n\n**Contexte de réunion :**\n${listenHistory.slice(-20).join('\n')}`;
            }


            logger.info('[FeatureBridge] sendQuestionFromAsk', {
                originalPrompt: userPrompt,
                listenHistoryLength: listenHistory.length,
                askHistoryLength: formattedAskHistory.length,
                webSearch: !!options.webSearch
            });

            return await askService.sendMessage(enrichedPrompt, formattedAskHistory, {
                originalPrompt: userPrompt,
                forceScreenshot: !!options.forceScreenshot,
                displayPrompt: options.displayPrompt,
                maxMode: !!options.maxMode,
                webSearch: !!options.webSearch
            });
        });
        ipcMain.handle('ask:sendQuestionFromSummary', async (event, userPrompt) => {
            // Récupère le contexte de la session d'écoute active
            const sessionData = listenService.getCurrentSessionData();
            const conversationHistory = sessionData?.conversationHistory || [];
            const analysisData = sessionData?.analysisData || {};

            // Construire un prompt enrichi avec le contexte
            let enrichedPrompt = `${userPrompt}\n\n`;

            // Ajouter la transcription si disponible
            if (conversationHistory.length > 0) {
                enrichedPrompt += `**Contexte :**\n`;
                // Limiter aux 20 dernières phrases pour ne pas surcharger
                const recentHistory = conversationHistory.slice(-20);
                enrichedPrompt += recentHistory.join('\n') + '\n\n';
            }

            // Ajouter le résumé/analyse si disponible
            if (analysisData.summary && analysisData.summary.length > 0) {
                enrichedPrompt += `**Résumé :**\n`;
                enrichedPrompt += analysisData.summary.join('\n') + '\n\n';
            }

            if (analysisData.topic) {
                enrichedPrompt += `**Sujet principal :** ${analysisData.topic.header}\n\n`;
            }

            logger.info('[FeatureBridge] Sending question with context', {
                originalPrompt: userPrompt,
                historyLength: conversationHistory.length,
                hasAnalysis: !!analysisData.summary
            });

            // Pass original prompt for screenshot detection (not enriched context)
            return await askService.sendMessage(enrichedPrompt, [], { originalPrompt: userPrompt });
        });
        ipcMain.handle('ask:toggleAskButton', async () => await askService.toggleAskButton());
        ipcMain.handle('ask:closeAskWindow', async () => await askService.closeAskWindow());

        ipcMain.handle('ask:generateSuggestions', async (event, question, response) => {
            try {
                const prompt = `Contexte de conversation:\nQ: "${(question || '').slice(0, 150)}"\nR: "${(response || '').slice(0, 350)}"\n\nGénère exactement 2 questions de suivi courtes en français (6 mots max chacune). Une par ligne, sans numérotation ni tirets.`;

                const anthropicKey = modelStateService.getApiKey('anthropic');
                if (anthropicKey) {
                    const resp = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 80, messages: [{ role: 'user', content: prompt }] })
                    });
                    const data = await resp.json();
                    const text = data.content?.[0]?.text || '';
                    const suggestions = text.split('\n').map(s => s.replace(/^[-•\d.\s]+/, '').trim()).filter(s => s.length > 3).slice(0, 2);
                    if (suggestions.length >= 2) return suggestions;
                }

                const openaiKey = modelStateService.getApiKey('openai');
                if (openaiKey) {
                    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 80, messages: [{ role: 'user', content: prompt }] })
                    });
                    const data = await resp.json();
                    const text = data.choices?.[0]?.message?.content || '';
                    const suggestions = text.split('\n').map(s => s.replace(/^[-•\d.\s]+/, '').trim()).filter(s => s.length > 3).slice(0, 2);
                    if (suggestions.length >= 2) return suggestions;
                }

                return null;
            } catch (err) {
                logger.warn('[FeatureBridge] generateSuggestions error:', { message: err.message });
                return null;
            }
        });


        // Ask - Tutorial handlers (delegated to askService)
        ipcMain.handle('ask:startTutorial', async (event, tutorialId) => {
            return await askService.handleStartTutorial(tutorialId);
        });
        ipcMain.handle('ask:tutorialNext', async () => {
            return await askService.handleTutorialNext();
        });
        ipcMain.handle('ask:tutorialSkip', async () => {
            return await askService.handleTutorialSkip();
        });

        // Ask - Personality handlers (delegated to askService)
        ipcMain.handle('ask:getPersonalities', async () => {
            return await askService.getPersonalities();
        });
        ipcMain.handle('ask:setPersonality', async (event, personalityId) => {
            sharedStateService.patch({ activePersonality: personalityId });
            return { success: true };
        });
        ipcMain.handle('ask:getPersonalityRecommendations', async (event, taskType, userLevel) => {
            return await askService.handleGetPersonalityRecommendations(taskType, userLevel);
        });
        ipcMain.handle('ask:toggleAdaptivePersonality', async (event, enabled) => {
            sharedStateService.patch({ adaptivePersonality: Boolean(enabled) });
            return { success: true, isAdaptive: Boolean(enabled) };
        });

        // Listen
        ipcMain.handle('listen:sendMicAudio', async (event, { data, mimeType }) => await listenService.handleSendMicAudioContent(data, mimeType));

        // Agent Mode Tracking
        ipcMain.handle('listen:set-agent-mode', (event, agentModeActive) => {
            sharedStateService.patch({ agentMode: Boolean(agentModeActive) });
            return { success: true };
        });

        // Desktop Sources for system audio capture
        ipcMain.handle('get-desktop-sources', async (event, options = {}) => {
            const { desktopCapturer } = require('electron');
            try {
                const sources = await desktopCapturer.getSources({
                    types: options.types || ['screen'],
                    thumbnailSize: options.thumbnailSize || { width: 150, height: 150 },
                    fetchWindowIcons: options.fetchWindowIcons || false
                });
                return sources;
            } catch (error) {
                logger.error('[FeatureBridge] Failed to get desktop sources:', error);
                return [];
            }
        });
        ipcMain.handle('listen:sendSystemAudio', async (event, { data, mimeType }) => {
            // Check if STT sessions are ready before processing audio
            if (!listenService.sttService.isSessionActive()) {
                return { success: false, error: 'STT session not active yet' };
            }

            const result = await listenService.sttService.sendSystemAudioContent(data, mimeType);
            if (result.success) {
                listenService.sendToRenderer('system-audio-data', { data });
            }
            return result;
        });
        ipcMain.handle('listen:startMacosSystemAudio', async () => await listenService.handleStartMacosAudio());
        ipcMain.handle('listen:stopMacosSystemAudio', async () => await listenService.handleStopMacosAudio());

        // Speaker Control for Hardware Acoustic Coupling Prevention
        ipcMain.handle('listen:muteSpeakers', async () => await listenService.handleMuteSpeakers());
        ipcMain.handle('listen:unmuteSpeakers', async (event, originalVolume) => await listenService.handleUnmuteSpeakers(originalVolume));
        ipcMain.handle('update-google-search-setting', async (event, enabled) => {
            sharedStateService.patch({ googleSearchEnabled: Boolean(enabled) });
            return { success: true };
        });
        ipcMain.handle('is-session-active', async (event) => listenService.isSessionActive());
        ipcMain.handle('listen:changeSession', async (event, listenButtonText) => {
            logger.info('[FeatureBridge] listen:changeSession from mainheader', listenButtonText);
            if (!VALID_LISTEN_BUTTON_TEXTS.includes(listenButtonText)) {
                logger.warn('[FeatureBridge] listen:changeSession rejected invalid listenButtonText', listenButtonText);
                return { success: false, error: 'Invalid listenButtonText' };
            }
            const sessionIdBeforeStop = (listenButtonText === 'Stop') ? listenService.currentSessionId : null;
            try {
                if (listenButtonText === 'Listen') {
                    // About to start — reflect intent in shared state for any subscriber.
                    sharedStateService.patch({ isListenRunning: true, showListen: false, showChat: false });
                }

                await listenService.handleListenRequest(
                    listenButtonText,
                    listenButtonText === 'Listen' ? { revealListen: false } : {}
                );

                if (listenButtonText === 'Listen') {
                    const newId = listenService.currentSessionId;
                    if (newId) {
                        const startedAt = Date.now();
                        let recallSdkRecording = null;
                        if (sharedStateService.get().autoMeetingDetectionEnabled) {
                            try {
                                recallSdkRecording = await recallService.prepareSessionRecording({ id: newId, startedAt });
                            } catch (e) {
                                logger.warn('[FeatureBridge] Recall session preparation failed', { error: e.message });
                            }
                        }
                        sharedStateService.patch({
                            session: { id: newId, startedAt, ...(recallSdkRecording && { recallSdkRecording }) },
                            isListenRunning: true,
                            showHeader: true,
                            showListen: false,
                            showChat: true,
                        });
                    }
                }

                if (sessionIdBeforeStop) {
                    // 1. Tell the (still-hidden) dashboard to route to the just-ended session NOW,
                    //    so React can re-render in the background while the overlay is still on top.
                    const dashWin = windowManager.getDashboardWindow();
                    if (dashWin && !dashWin.isDestroyed()) {
                        dashWin.webContents.send('dashboard:navigateToSession', { sessionId: sessionIdBeforeStop });
                    }

                    // 2. Give the renderer ~1 frame to start the route transition before we surface it.
                    //    Without this, the user briefly sees /activity before /activity/details kicks in.
                    await new Promise(r => setTimeout(r, 80));

                    // 3. Single state patch drives everything: the change subscription
                    //    above will hide the listen overlay + header bar, show + focus
                    //    the dashboard, and notify any renderer subscribed to shared state.
                    //    The state is also persisted to disk so a relaunch knows the last session.
                    const prevFocus = sharedStateService.get().dashboardFocusCount || 0;
                    sharedStateService.patch({
                        session: null,
                        lastSessionId: sessionIdBeforeStop,
                        isListenRunning: false,
                        showListen: false,
                        showChat: false,
                        showHeader: false,
                        showDashboard: true,
                        dashboardFocusCount: prevFocus + 1,
                    });
                }
                return { success: true };
            } catch (error) {
                logger.error('listen:changeSession failed', { message: error.message });
                return { success: false, error: error.message };
            }
        });

        // ModelStateService — sélection de modèle uniquement (clés côté serveur)
        ipcMain.handle('model:get-selected-models', () => modelStateService.getSelectedModels());
        ipcMain.handle('model:set-selected-model', async (e, { type, modelId }) => {
            if (!['llm', 'stt'].includes(type)) return { success: false, error: 'Invalid model type' };
            const current = sharedStateService.get().selectedModel || {};
            sharedStateService.patch({ selectedModel: { ...current, [type]: modelId } });
            return { success: true };
        });
        ipcMain.handle('model:get-available-models', (e, { type }) => modelStateService.getAvailableModels(type));
        ipcMain.handle('model:are-providers-configured', () => modelStateService.areProvidersConfigured());
        ipcMain.handle('model:has-configured-providers', () => modelStateService.hasConfiguredProviders());
        ipcMain.handle('model:get-provider-config', () => modelStateService.getProviderConfig());

        // =============================================================================
        // MEMORY SYSTEM HANDLERS
        // =============================================================================

        // Initialize memory API client
        const memoryApiClient = new MemoryApiClient();

        // Set auth context if available
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            memoryApiClient.setAuthContext({
                userId: currentUser.uid || currentUser.id,
                token: currentUser.accessToken,
                isGuest: currentUser.isGuest || false,
                permissions: currentUser.permissions || []
            });
        }

        // Memory - Working Memory (References only, no image duplication)
        ipcMain.handle('memory:store-working', async (event, data) => {
            try {
                // Map "default" agent ID to actual agent ID 1 (Assistant)
                let agentId = data.agentId;
                if (agentId === 'default') {
                    agentId = 1; // Default to Assistant agent
                }

                logger.info('[FeatureBridge] Storing working memory reference', {
                    originalAgentId: data.agentId,
                    mappedAgentId: agentId,
                    userId: data.userId,
                    type: data.content?.type
                });

                const result = await memoryApiClient.storeWorkingMemory(
                    agentId,
                    data.userId,
                    data.content || data
                );

                return { success: true, data: result };

            } catch (error) {
                logger.error('[FeatureBridge] Failed to store working memory:', { error });
                return { success: false, error: error.message };
            }
        });

        // Memory - Episodic Memory (Full visual data storage)
        ipcMain.handle('memory:store-episodic', async (event, data) => {
            try {
                // Map "default" agent ID to actual agent ID 1 (Assistant)
                let agentId = data.agentId;
                if (agentId === 'default') {
                    agentId = 1; // Default to Assistant agent
                }

                logger.info('[FeatureBridge] Storing episodic memory', {
                    originalAgentId: data.agentId,
                    mappedAgentId: agentId,
                    userId: data.userId,
                    type: data.content?.type,
                    hasScreenshot: !!data.content?.screenshot
                });

                const result = await memoryApiClient.storeEpisodicMemory(
                    agentId,
                    data.userId,
                    data
                );

                return { success: true, data: result };

            } catch (error) {
                logger.error('[FeatureBridge] Failed to store episodic memory:', { error });
                return { success: false, error: error.message };
            }
        });

        // Memory - Semantic Memory (Knowledge storage)
        ipcMain.handle('memory:store-semantic', async (event, data) => {
            try {
                // Map "default" agent ID to actual agent ID 1 (Assistant)
                let agentId = data.agentId;
                if (agentId === 'default') {
                    agentId = 1; // Default to Assistant agent
                }

                logger.info('[FeatureBridge] Storing semantic memory', {
                    originalAgentId: data.agentId,
                    mappedAgentId: agentId,
                    userId: data.userId,
                    title: data.title
                });

                const result = await memoryApiClient.storeSemanticMemory(
                    agentId,
                    data.userId,
                    data
                );

                return { success: true, data: result };

            } catch (error) {
                logger.error('[FeatureBridge] Failed to store semantic memory:', { error });
                return { success: false, error: error.message };
            }
        });

        // Memory - Procedural Memory (Behavior patterns)
        ipcMain.handle('memory:store-procedural', async (event, data) => {
            try {
                // Map "default" agent ID to actual agent ID 1 (Assistant)
                let agentId = data.agentId;
                if (agentId === 'default') {
                    agentId = 1; // Default to Assistant agent
                }

                logger.info('[FeatureBridge] Storing procedural memory', {
                    originalAgentId: data.agentId,
                    mappedAgentId: agentId,
                    userId: data.userId,
                    pattern: typeof data.pattern === 'string' ? data.pattern : 'object'
                });

                const result = await memoryApiClient.storeProceduralMemory(
                    agentId,
                    data.userId,
                    data
                );

                return { success: true, data: result };

            } catch (error) {
                logger.error('[FeatureBridge] Failed to store procedural memory:', { error });
                return { success: false, error: error.message };
            }
        });

        // Memory - Get Memory Statistics
        ipcMain.handle('memory:get-stats', async (event, data) => {
            try {
                // Map "default" agent ID to actual agent ID 1 (Assistant)
                let agentId = data.agentId;
                if (agentId === 'default') {
                    agentId = 1; // Default to Assistant agent
                }

                logger.info('[FeatureBridge] Getting memory stats', {
                    originalAgentId: data.agentId,
                    mappedAgentId: agentId,
                    userId: data.userId
                });

                const stats = await memoryApiClient.getMemoryStats(agentId, data.userId);

                return { success: true, data: stats };

            } catch (error) {
                logger.error('[FeatureBridge] Failed to get memory stats:', { error });
                return { success: false, error: error.message };
            }
        });

        // Memory - Health Check
        ipcMain.handle('memory:health-check', async (event) => {
            try {
                const health = await memoryApiClient.checkMemoryHealth();
                return { success: true, data: health };

            } catch (error) {
                logger.error('[FeatureBridge] Memory health check failed:', { error });
                return { success: false, error: error.message };
            }
        });

        // Memory - Update Auth Context (when user logs in/out)
        ipcMain.handle('memory:update-auth', async (event, authContext) => {
            try {
                memoryApiClient.setAuthContext(authContext);
                logger.info('[FeatureBridge] Memory client auth context updated');
                return { success: true };

            } catch (error) {
                logger.error('[FeatureBridge] Failed to update memory auth context:', { error });
                return { success: false, error: error.message };
            }
        });



        // Dashboard window IPC handlers
        ipcMain.handle('dashboard:getUser', async () => {
            try {
                const user = authService.getCurrentUser();
                if (user?.isLoggedIn) return { user: { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL } };
                return null;
            } catch (e) {
                return null;
            }
        });

        ipcMain.handle('dashboard:getSessions', async (event, uid) => {
            try {
                const db = getFirestoreInstance();
                const snap = await getDocs(collection(db, 'users', uid, 'sessions'));
                return snap.docs.map(d => ({ id: d.id, ..._serializeFsDoc(d.data()) }));
            } catch (e) {
                logger.error('[FeatureBridge] dashboard:getSessions failed', { message: e.message });
                return [];
            }
        });

        ipcMain.handle('dashboard:getSession', async (event, uid, sessionId) => {
            try {
                const db = getFirestoreInstance();
                const snap = await getDoc(doc(db, 'users', uid, 'sessions', sessionId));
                if (!snap.exists()) return null;
                return { id: snap.id, ..._serializeFsDoc(snap.data()) };
            } catch (e) {
                logger.error('[FeatureBridge] dashboard:getSession failed', { message: e.message });
                return null;
            }
        });

        ipcMain.handle('dashboard:getSessionDetails', async (event, uid, sessionId) => {
            try {
                const db = getFirestoreInstance();
                const [sessionSnap, transcriptSnap, aiMessageSnap, summarySnap] = await Promise.all([
                    getDoc(doc(db, 'users', uid, 'sessions', sessionId)),
                    getDocs(collection(db, 'users', uid, 'sessions', sessionId, 'transcripts')),
                    getDocs(collection(db, 'users', uid, 'sessions', sessionId, 'ai_messages')),
                    getDoc(doc(db, 'users', uid, 'sessions', sessionId, 'summary', 'data')),
                ]);

                if (!sessionSnap.exists()) return null;

                const transcripts = transcriptSnap.docs
                    .map(d => ({ id: d.id, ..._serializeFsDoc(d.data()) }))
                    .sort((a, b) => (a._startAtMs || a.startAt || a.start_at || 0) - (b._startAtMs || b.startAt || b.start_at || 0));
                const aiMessages = aiMessageSnap.docs
                    .map(d => ({ id: d.id, ..._serializeFsDoc(d.data()) }))
                    .sort((a, b) => (a._sentAtMs || a.sentAt || a.sent_at || 0) - (b._sentAtMs || b.sentAt || b.sent_at || 0));

                return {
                    session: { id: sessionSnap.id, ..._serializeFsDoc(sessionSnap.data()) },
                    transcripts,
                    aiMessages,
                    summary: summarySnap.exists() ? _serializeFsDoc(summarySnap.data()) : null,
                };
            } catch (e) {
                logger.error('[FeatureBridge] dashboard:getSessionDetails failed', { message: e.message });
                return null;
            }
        });

        ipcMain.handle('dashboard:deleteSession', async (event, uid, sessionId) => {
            try {
                const db = getFirestoreInstance();
                await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId));
                return { success: true };
            } catch (e) {
                logger.error('[FeatureBridge] dashboard:deleteSession failed', { message: e.message });
                return { success: false, error: e.message };
            }
        });

        ipcMain.handle('dashboard:startClaire', async () => {
            try {
                if (listenService.isSessionActive()) {
                    sharedStateService.patch({
                        showDashboard: false,
                        showHeader: true,
                        showListen: false,
                        showChat: true,
                        isListenRunning: true,
                    });
                    return { success: true, sessionId: listenService.currentSessionId || null, starting: false };
                }

                if (dashboardStartClairePromise) {
                    return await dashboardStartClairePromise;
                }

                sharedStateService.patch({
                    showDashboard: true,
                    showHeader: false,
                    showListen: false,
                    showChat: false,
                    isListenRunning: false,
                    session: null,
                });
                internalBridge.emit('window:requestVisibility', { name: 'header', visible: false });
                internalBridge.emit('window:requestVisibility', { name: 'listen', visible: false });
                internalBridge.emit('window:requestVisibility', { name: 'ask', visible: false });

                // Lazy-init the windows on first use
                if (!windowManager.windowPool.has('header')) {
                    windowManager.createWindows({ showHeader: false });
                }
                windowManager.ensureListenWindow();
                internalBridge.emit('window:requestVisibility', { name: 'header', visible: false });
                internalBridge.emit('window:requestVisibility', { name: 'listen', visible: false });
                internalBridge.emit('window:requestVisibility', { name: 'ask', visible: false });

                dashboardStartClairePromise = (async () => {
                    await listenService.handleListenRequest('Listen', { revealListen: false });

                // Single state patch — the change subscription handles every side
                // effect: dashboard hide, header show, Ask show.
                const newId = listenService.currentSessionId;
                if (!newId) {
                    throw new Error('Listen session started without a session id');
                }

                const startedAt = Date.now();
                let recallSdkRecording = null;
                if (sharedStateService.get().autoMeetingDetectionEnabled) {
                    try {
                        recallSdkRecording = await recallService.prepareSessionRecording({ id: newId, startedAt });
                    } catch (e) {
                        logger.warn('[FeatureBridge] Recall session preparation failed', { error: e.message });
                    }
                }
                sharedStateService.patch({
                    showDashboard: false,
                    showHeader: true,
                    showListen: false,
                    showChat: true,
                    isListenRunning: true,
                    session: { id: newId, startedAt, ...(recallSdkRecording && { recallSdkRecording }) },
                });
                return { success: true, sessionId: newId, starting: false };

                })().catch(async (e) => {
                    logger.error('[FeatureBridge] dashboard:startClaire failed', { message: e.message });
                    try {
                        if (listenService.currentSessionId || listenService.isSessionActive()) {
                            await listenService.closeSession();
                        }
                    } catch (closeError) {
                        logger.warn('[FeatureBridge] dashboard:startClaire cleanup failed', { message: closeError.message });
                    }
                    sharedStateService.patch({
                        showDashboard: true,
                        showHeader: false,
                        showListen: false,
                        showChat: false,
                        isListenRunning: false,
                        session: null,
                    });
                    return { success: false, error: e.message };
                }).finally(() => {
                    dashboardStartClairePromise = null;
                });

                return await dashboardStartClairePromise;
            } catch (e) {
                logger.error('[FeatureBridge] dashboard:startClaire failed', { message: e.message });
                sharedStateService.patch({
                    showDashboard: true,
                    showHeader: false,
                    showListen: false,
                    showChat: false,
                    isListenRunning: false,
                    session: null,
                });
                return { success: false, error: e.message };
            }
        });

        ipcMain.handle('dashboard:stopClaire', async () => {
            try {
                await listenService.handleListenRequest('Stop', {});
                return { success: true };
            } catch (e) {
                logger.error('[FeatureBridge] dashboard:stopClaire failed', { message: e.message });
                return { success: false, error: e.message };
            }
        });

        ipcMain.handle('dashboard:minimize', () => {
            const dashWin = windowManager.getDashboardWindow();
            if (dashWin && !dashWin.isDestroyed()) dashWin.minimize();
        });

        ipcMain.handle('dashboard:maximize', () => {
            const dashWin = windowManager.getDashboardWindow();
            if (dashWin && !dashWin.isDestroyed()) {
                dashWin.isMaximized() ? dashWin.unmaximize() : dashWin.maximize();
            }
        });

        ipcMain.handle('dashboard:close', () => {
            const dashWin = windowManager.getDashboardWindow();
            if (dashWin && !dashWin.isDestroyed()) dashWin.close();
        });

        // Logout → /electron-login without flashing the activity skeleton.
        // Hide the window, navigate, then reveal again via the existing
        // did-finish-load handler in windowManager.
        ipcMain.handle('dashboard:logoutToLogin', () => {
            const dashWin = windowManager.getDashboardWindow();
            if (!dashWin || dashWin.isDestroyed()) return { success: false };
            try {
                dashWin.setOpacity(0);
            } catch (_) { /* fade still possible */ }
            // The window is hidden visually; the page swap happens in the
            // renderer immediately after this IPC resolves.
            // Restore opacity once the destination page has fully loaded.
            const onceLoaded = () => {
                if (!dashWin.isDestroyed()) {
                    setTimeout(() => {
                        if (!dashWin.isDestroyed()) dashWin.setOpacity(1);
                    }, 30);
                }
            };
            dashWin.webContents.once('did-finish-load', onceLoaded);
            // Safety net: in case did-finish-load doesn't fire (e.g. already loaded)
            setTimeout(() => {
                if (!dashWin.isDestroyed()) dashWin.setOpacity(1);
            }, 1500);
            return { success: true };
        });

        ipcMain.handle('dashboard:setTitleBarOverlayVisible', (_event, visible) => {
            sharedStateService.patch({ titleBarVisible: Boolean(visible) });
            return { success: true };
        });

        ipcMain.handle('dashboard:setOnboardingMode', (_event, enabled) => {
            sharedStateService.patch({ isOnboarding: Boolean(enabled) });
            return { success: true };
        });

        ipcMain.handle('meeting:showNotification', (_event, meeting) => {
            sharedStateService.patch({ meetingNotification: meeting || null });
            return { success: true };
        });

        ipcMain.handle('meeting:hideNotification', () => {
            const state = sharedStateService.get();
            const currentId = state.meetingNotification?.id || state.meetingNotification?.recallWindow?.id;
            const handled = Array.isArray(state.handledMeetingNotificationIds)
                ? state.handledMeetingNotificationIds
                : [];
            sharedStateService.patch({
                meetingNotification: null,
                handledMeetingNotificationIds: currentId && !handled.includes(currentId)
                    ? [...handled, currentId]
                    : handled,
            });
            return { success: true };
        });

        ipcMain.handle('dashboard:setContentProtection', (_event, enabled) => {
            sharedStateService.patch({ contentProtectionEnabled: Boolean(enabled) });
            return { success: true };
        });

        ipcMain.handle('dashboard:setTheme', (_event, theme) => {
            const nextTheme = ['light', 'dark', 'system'].includes(theme) ? theme : 'system';
            sharedStateService.patch({ theme: nextTheme });
            return { success: true };
        });

        logger.info('[FeatureBridge] Initialized with all feature handlers including memory system.');
    },

    // Renderer[Korean comment translated] Status[Korean comment translated] [Korean comment translated]
    sendAskProgress(win, progress) {
        win.webContents.send('feature:ask:progress', progress);
    },
};

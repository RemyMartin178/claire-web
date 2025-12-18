const Store = require('electron-store');
const fetch = require('node-fetch');
const { EventEmitter } = require('events');
const { BrowserWindow } = require('electron');
const { PROVIDERS, getProviderClass } = require('../ai/factory');
const encryptionService = require('./encryptionService');
const providerSettingsRepository = require('../repositories/providerSettings');
const userModelSelectionsRepository = require('../repositories/userModelSelections');

// Import authService directly (singleton)
const authService = require('./authService');
const { createLogger } = require('./logger.js');

const logger = createLogger('ModelStateService');

class ModelStateService extends EventEmitter {
    constructor() {
        super();
        this.authService = authService;
        this.store = new Store({ name: 'xerus-model-state' });
        this.state = {};
        this.hasMigrated = false;
    }

    // [Korean comment translated] [Korean comment translated] [Korean comment translated] [Korean comment translated]
    _broadcastToAllWindows(eventName, data = null) {
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed()) {
                if (data !== null) {
                    win.webContents.send(eventName, data);
                } else {
                    win.webContents.send(eventName);
                }
            }
        });
    }

    async initialize() {
        logger.info('[ModelStateService] Initializing...');
        await this._loadStateForCurrentUser();
        logger.info('[ModelStateService] Initialization complete');
    }

    _logCurrentSelection() {
        const llmModel = this.state.selectedModels.llm;
        const sttModel = this.state.selectedModels.stt;
        const llmProvider = this.getProviderForModel('llm', llmModel) || 'None';
        const sttProvider = this.getProviderForModel('stt', sttModel) || 'None';
    
        logger.info(`Current Selection -> LLM: ${llmModel} (Provider: ${llmProvider}), STT: ${sttModel} (Provider: ${sttProvider})`);
    }

    _autoSelectAvailableModels(forceReselectionForTypes = []) {
        logger.info('Running auto-selection for models. Force re-selection for:', forceReselectionForTypes);
        const types = ['llm', 'stt'];

        types.forEach(type => {
            const currentModelId = this.state.selectedModels[type];
            let isCurrentModelValid = false;

            const forceReselection = forceReselectionForTypes.includes(type);

            // Special logic for STT: Always prefer Deepgram if available, then OpenAI
            if (type === 'stt' && currentModelId && !forceReselection) {
                const currentProvider = this.getProviderForModel(type, currentModelId);
                
                // Check if Deepgram is available and we're not using it - force Deepgram (meilleur)
                const deepgramKey = this.getApiKey('deepgram');
                if (deepgramKey && currentProvider !== 'deepgram') {
                    logger.info('[STT Auto-Selection] ⭐ Forcer Deepgram (ultra-faible latence, meilleur pour FR/EN)');
                    isCurrentModelValid = false; // Force reselection
                }
                // Check if Gemini is available and we're using worse provider
                else if (currentProvider !== 'deepgram' && currentProvider !== 'gemini') {
                    const geminiKey = this.getApiKey('gemini');
                    if (geminiKey) {
                        logger.info('[STT Auto-Selection] ⭐ Forcer Gemini Live (meilleur que Whisper/OpenAI)');
                        isCurrentModelValid = false; // Force reselection
                    }
                }
                // CODE LEGACY SUPPRIMÉ: Ne plus forcer OpenAI, Whisper est mieux !
            }

            if (currentModelId && !forceReselection && isCurrentModelValid === false) {
                // Already handled by special logic above
            } else if (currentModelId && !forceReselection) {
                const provider = this.getProviderForModel(type, currentModelId);
                const apiKey = this.getApiKey(provider);
                // For Ollama and Whisper, 'local' is a valid API key
                if (provider && (apiKey || ((provider === 'ollama' || provider === 'whisper') && apiKey === 'local'))) {
                    isCurrentModelValid = true;
                }
            }

            if (!isCurrentModelValid) {
                logger.info(`No valid ${type} model selected or re-selection forced. Finding an alternative...`);
                const availableModels = this.getAvailableModels(type);
                if (availableModels.length > 0) {
                    // PRIORITÉ STT: Deepgram (meilleur) > Gemini Live > Whisper local > OpenAI (dernier recours)
                    let apiModel = null;
                    if (type === 'stt') {
                        // 1️⃣ Deepgram (ultra-faible latence, meilleure précision FR/EN)
                        apiModel = availableModels.find(model => {
                            const provider = this.getProviderForModel(type, model.id);
                            return provider === 'deepgram' && this.getApiKey(provider);
                        });
                        
                        // 2️⃣ Gemini Live (très bon pour STT multilingue)
                        if (!apiModel) {
                            apiModel = availableModels.find(model => {
                                const provider = this.getProviderForModel(type, model.id);
                                return provider === 'gemini' && this.getApiKey(provider);
                            });
                        }
                        
                        // 3️⃣ Whisper local (gratuit, précis mais plus lent)
                        if (!apiModel) {
                            apiModel = availableModels.find(model => {
                                const provider = this.getProviderForModel(type, model.id);
                                return provider === 'whisper';
                            });
                        }
                        
                        // 4️⃣ OpenAI en dernier (pas terrible pour STT temps réel)
                        if (!apiModel) {
                            apiModel = availableModels.find(model => {
                                const provider = this.getProviderForModel(type, model.id);
                                return provider === 'openai' && this.getApiKey(provider);
                            });
                        }
                    } else {
                        // For LLM, use existing logic
                        apiModel = availableModels.find(model => {
                            const provider = this.getProviderForModel(type, model.id);
                            const hasApiKey = this.getApiKey(provider);
                            return provider && provider !== 'ollama' && provider !== 'whisper' && hasApiKey;
                        });
                    }
                    
                    const selectedModel = apiModel || availableModels[0];
                    this.state.selectedModels[type] = selectedModel.id;
                    logger.info(`Auto-selected ${type} model: ${selectedModel.id} (preferred: ${apiModel ? 'API' : 'fallback'})`);
                } else {
                    this.state.selectedModels[type] = null;
                }
            }
        });
    }

    async _migrateFromElectronStore() {
        logger.info('[ModelStateService] Starting migration from electron-store to database...');
        const userId = this.authService.getCurrentUserId();
        
        try {
            // Get data from electron-store
            const legacyData = this.store.get(`users.${userId}`, null);
            
            if (!legacyData) {
                logger.info('[ModelStateService] No legacy data to migrate');
                return;
            }
            
            logger.info('[ModelStateService] Found legacy data, migrating...');
            
            // Migrate provider settings (API keys and selected models per provider)
            const { apiKeys = {}, selectedModels = {} } = legacyData;
            
            for (const [provider, apiKey] of Object.entries(apiKeys)) {
                if (apiKey && PROVIDERS[provider]) {
                    // For encrypted keys, they are already decrypted in _loadStateForCurrentUser
                    await providerSettingsRepository.upsert(provider, {
                        api_key: apiKey
                    });
                    logger.info('Migrated API key for');
                }
            }
            
            // Migrate global model selections
            if (selectedModels.llm || selectedModels.stt) {
                const llmProvider = selectedModels.llm ? this.getProviderForModel('llm', selectedModels.llm) : null;
                const sttProvider = selectedModels.stt ? this.getProviderForModel('stt', selectedModels.stt) : null;
                
                await userModelSelectionsRepository.upsert({
                    selected_llm_provider: llmProvider,
                    selected_llm_model: selectedModels.llm,
                    selected_stt_provider: sttProvider,
                    selected_stt_model: selectedModels.stt
                });
                logger.info('[ModelStateService] Migrated global model selections');
            }
            
            // Mark migration as complete by removing legacy data
            this.store.delete(`users.${userId}`);
            logger.info('[ModelStateService] Migration completed and legacy data cleaned up');
            
        } catch (error) {
            logger.error('Migration failed:', { error });
            // Don't throw - continue with normal operation
        }
    }

    async _loadStateFromDatabase() {
        logger.info('[ModelStateService] Loading state from database...');
        const userId = this.authService.getCurrentUserId();
        
        try {
            // Load provider settings
            const providerSettings = await providerSettingsRepository.getAllByUid();
            const apiKeys = {};
            
            // Reconstruct apiKeys object
            Object.keys(PROVIDERS).forEach(provider => {
                apiKeys[provider] = null;
            });
            
            for (const setting of providerSettings) {
                if (setting.api_key) {
                    // API keys are already decrypted by the repository layer
                    apiKeys[setting.provider] = setting.api_key;
                }
            }
            
            // Fallback to environment variables for missing API keys
            // Les clés API sont récupérées depuis le backend Railway
            const envMapping = {
                'openai': process.env.OPENAI_API_KEY,
                'gemini': process.env.GEMINI_API_KEY,
                'anthropic': process.env.ANTHROPIC_API_KEY,
                'deepgram': process.env.DEEPGRAM_API_KEY,
                'ollama': 'local', // Ollama uses local by default
                'whisper': 'local' // Whisper uses local by default
            };
            
            
            // Force load from environment variables (prioritize .env over database)
            // This ensures that API keys in .env are always used, even if empty values exist in DB
            logger.debug('[ModelStateService] Loading API keys from environment:', {
                openai: !!process.env.OPENAI_API_KEY,
                gemini: !!process.env.GEMINI_API_KEY,
                anthropic: !!process.env.ANTHROPIC_API_KEY,
                deepgram: !!process.env.DEEPGRAM_API_KEY
            });
            
            for (const [provider, envKey] of Object.entries(envMapping)) {
                if (envKey && envKey.trim() !== '') {
                    // Always use .env value if it exists and is not empty
                    apiKeys[provider] = envKey;
                    logger.info(`[ModelStateService] ✅ Loaded ${provider} API key from environment (length: ${envKey.length})`);
                } else if (!apiKeys[provider] || apiKeys[provider] === '' || apiKeys[provider] === null) {
                    // Keep existing value only if .env doesn't have it
                    // If DB has empty/null, keep it as null
                    if (apiKeys[provider] === '' || apiKeys[provider] === null) {
                        apiKeys[provider] = null;
                    }
                    logger.debug(`[ModelStateService] ⚠️ No ${provider} API key in environment or database`);
                }
            }
            
            // Debug log: Show which API keys are loaded
            logger.info('[ModelStateService] API keys summary:', {
                openai: apiKeys.openai ? `***${apiKeys.openai.slice(-4)} (${apiKeys.openai.length} chars)` : 'null',
                gemini: apiKeys.gemini ? `***${apiKeys.gemini.slice(-4)} (${apiKeys.gemini.length} chars)` : 'null',
                anthropic: apiKeys.anthropic ? `***${apiKeys.anthropic.slice(-4)} (${apiKeys.anthropic.length} chars)` : 'null',
                deepgram: apiKeys.deepgram ? `***${apiKeys.deepgram.slice(-4)} (${apiKeys.deepgram.length} chars)` : 'null'
            });
            
            
            // Load global model selections
            const modelSelections = await userModelSelectionsRepository.get();
            const selectedModels = {
                llm: modelSelections?.selected_llm_model || null,
                stt: modelSelections?.selected_stt_model || null
            };
            
            this.state = {
                apiKeys,
                selectedModels
            };
            
            logger.info('State loaded from database for user:');
            
            // Auto-select available models after loading state
            this._autoSelectAvailableModels();
            
        } catch (error) {
            logger.error('Failed to load state from database:', { error });
            // Fall back to default state with environment variable loading
            const initialApiKeys = Object.keys(PROVIDERS).reduce((acc, key) => {
                acc[key] = null;
                return acc;
            }, {});
            
            // Load API keys from environment variables (same logic as success case)
            
            const envMapping = {
                'openai': process.env.OPENAI_API_KEY,
                'gemini': process.env.GEMINI_API_KEY,
                'anthropic': process.env.ANTHROPIC_API_KEY,
                'deepgram': process.env.DEEPGRAM_API_KEY,
                'ollama': 'local', // Ollama uses local by default
                'whisper': 'local' // Whisper uses local by default
            };
            
            for (const [provider, envKey] of Object.entries(envMapping)) {
                if (!initialApiKeys[provider] && envKey) {
                    initialApiKeys[provider] = envKey;
                    logger.info(`[ModelStateService] Loaded ${provider} API key from environment (fallback)`);
                }
            }
            
            this.state = {
                apiKeys: initialApiKeys,
                selectedModels: { llm: null, stt: null },
            };
            
            // Auto-select available models after loading state (same as success case)
            this._autoSelectAvailableModels();
        }
    }

    async _loadStateForCurrentUser() {
        const userId = this.authService.getCurrentUserId();
        
        // Initialize encryption service for current user
        await encryptionService.initializeKey(userId);
        
        // Try to load from database first
        await this._loadStateFromDatabase();
        
        // Check if we need to migrate from electron-store
        const legacyData = this.store.get(`users.${userId}`, null);
        if (legacyData && !this.hasMigrated) {
            await this._migrateFromElectronStore();
            // Reload state after migration
            await this._loadStateFromDatabase();
            this.hasMigrated = true;
        }
        
        this._autoSelectAvailableModels();
        await this._saveState();
        this._logCurrentSelection();
    }

    async _saveState() {
        logger.info('[ModelStateService] Saving state to database...');
        const userId = this.authService.getCurrentUserId();
        
        try {
            // Save provider settings (API keys)
            for (const [provider, apiKey] of Object.entries(this.state.apiKeys)) {
                if (apiKey) {
                    // API keys will be encrypted by the repository layer
                    await providerSettingsRepository.upsert(provider, {
                        api_key: apiKey
                    });
                } else {
                    // Remove empty API keys
                    await providerSettingsRepository.remove(provider);
                }
            }
            
            // Save global model selections
            const llmProvider = this.state.selectedModels.llm ? this.getProviderForModel('llm', this.state.selectedModels.llm) : null;
            const sttProvider = this.state.selectedModels.stt ? this.getProviderForModel('stt', this.state.selectedModels.stt) : null;
            
            if (llmProvider || sttProvider || this.state.selectedModels.llm || this.state.selectedModels.stt) {
                await userModelSelectionsRepository.upsert({
                    selected_llm_provider: llmProvider,
                    selected_llm_model: this.state.selectedModels.llm,
                    selected_stt_provider: sttProvider,
                    selected_stt_model: this.state.selectedModels.stt
                });
            }
            
            logger.info('State saved to database for user:');
            this._logCurrentSelection();
            
        } catch (error) {
            logger.error('Failed to save state to database:', { error });
            // Fall back to electron-store for now
            this._saveStateToElectronStore();
        }
    }

    _saveStateToElectronStore() {
        logger.info('[ModelStateService] Falling back to electron-store...');
        const userId = this.authService.getCurrentUserId();
        const stateToSave = {
            ...this.state,
            apiKeys: { ...this.state.apiKeys }
        };
        
        for (const [provider, key] of Object.entries(stateToSave.apiKeys)) {
            if (key) {
                try {
                    stateToSave.apiKeys[provider] = encryptionService.encrypt(key);
                } catch (error) {
                    logger.error('Failed to encrypt API key for provider:', { provider });
                    stateToSave.apiKeys[provider] = null;
                }
            }
        }
        
        this.store.set(`users.${userId}`, stateToSave);
        logger.info('State saved to electron-store for user:');
        this._logCurrentSelection();
    }

    async validateApiKey(provider, key) {
        if (!key || (key.trim() === '' && provider !== 'ollama' && provider !== 'whisper')) {
            return { success: false, error: 'API key cannot be empty.' };
        }

        const ProviderClass = getProviderClass(provider);

        if (!ProviderClass || typeof ProviderClass.validateApiKey !== 'function') {
            // Default to success if no specific validator is found
            logger.warn('No validateApiKey function for provider: ${provider}. Assuming valid.');
                    return { success: true };
        }

        try {
            const result = await ProviderClass.validateApiKey(key);
            if (result.success) {
                logger.info('API key for  is valid.');
            } else {
                logger.info('API key for  is invalid:');
            }
            return result;
        } catch (error) {
            logger.error('Error during ${provider} key validation:', { error });
            return { success: false, error: 'An unexpected error occurred during validation.' };
        }
    }
    

    async setApiKey(provider, key) {
        logger.info('setApiKey:');
        if (!provider) {
            throw new Error('Provider is required');
        }
        
        // API keys will be encrypted by the repository layer
        this.state.apiKeys[provider] = key;
        await this._saveState();
        
        this._autoSelectAvailableModels([]);
        
        this._broadcastToAllWindows('model-state:updated', this.state);
        this._broadcastToAllWindows('settings-updated');
    }

    getApiKey(provider) {
        return this.state.apiKeys[provider];
    }

    getAllApiKeys() {
        return this.state.apiKeys;
    }

    async removeApiKey(provider) {
        if (this.state.apiKeys[provider]) {
            this.state.apiKeys[provider] = null;
            await providerSettingsRepository.remove(provider);
            await this._saveState();
            this._autoSelectAvailableModels([]);
            this._broadcastToAllWindows('model-state:updated', this.state);
            this._broadcastToAllWindows('settings-updated');
            return true;
        }
        return false;
    }

    getProviderForModel(type, modelId) {
        if (!modelId) return null;
        for (const providerId in PROVIDERS) {
            const models = type === 'llm' ? PROVIDERS[providerId].llmModels : PROVIDERS[providerId].sttModels;
            if (models.some(m => m.id === modelId)) {
                return providerId;
            }
        }
        
        // If no provider was found, assume it could be a custom Ollama model
        // if Ollama provider is configured (has a key).
        if (type === 'llm' && this.state.apiKeys['ollama']) {
            logger.info('Model not found in PROVIDERS list, assuming it\'s a custom Ollama model:', { modelId });
            return 'ollama';
        }

        return null;
    }

    getCurrentProvider(type) {
        const selectedModel = this.state.selectedModels[type];
        return this.getProviderForModel(type, selectedModel);
    }

    isLoggedInWithFirebase() {
        return this.authService.getCurrentUser().isLoggedIn;
    }

    areProvidersConfigured() {
        // Skip API key validation on startup - allow app to start without API keys
        // API keys will be required only when user actually uses features that need them
        logger.info('[ModelStateService] areProvidersConfigured: Skipping validation, allowing startup without API keys');
        return true;
    }

    // New method to check if providers are actually configured (for use when features need API keys)
    hasConfiguredProviders() {
        // Remove Firebase bypass - everyone needs actual API keys for AI providers
        // Firebase authentication doesn't provide AI provider API keys
        
        logger.info(`[SEARCH] DEBUG: hasConfiguredProviders called`);
        logger.info(`[SEARCH] DEBUG: this.state.apiKeys =`, this.state.apiKeys);

        // LLM[Korean comment translated] STT Model[Korean comment translated] [Korean comment translated] Provider [Korean comment translated] [Korean comment translated] API [Korean comment translated] Settings[Korean comment translated] Confirm
        const hasLlmKey = Object.entries(this.state.apiKeys).some(([provider, key]) => {
            logger.info(`[SEARCH] DEBUG: Checking LLM provider: ${provider}, key: ${key ? '[SET]' : '[EMPTY]'}`);
            if (provider === 'ollama') {
                // Ollama uses dynamic models, so just check if configured (has 'local' key)
                const result = key === 'local';
                logger.info(`[SEARCH] DEBUG: Ollama LLM check: ${result}`);
                return result;
            }
            if (provider === 'whisper') {
                // Whisper doesn't support LLM
                logger.info(`[SEARCH] DEBUG: Whisper doesn't support LLM: false`);
                return false;
            }
            const result = key && PROVIDERS[provider]?.llmModels.length > 0;
            logger.info(`[SEARCH] DEBUG: ${provider} LLM check: hasKey=${!!key}, modelCount=${PROVIDERS[provider]?.llmModels.length || 0}, result=${result}`);
            return result;
        });
        
        const hasSttKey = Object.entries(this.state.apiKeys).some(([provider, key]) => {
            logger.info(`[SEARCH] DEBUG: Checking STT provider: ${provider}, key: ${key ? '[SET]' : '[EMPTY]'}`);
            if (provider === 'whisper') {
                // Whisper has static model list and supports STT
                const result = key === 'local' && PROVIDERS[provider]?.sttModels.length > 0;
                logger.info(`[SEARCH] DEBUG: Whisper STT check: ${result}`);
                return result;
            }
            if (provider === 'ollama') {
                // Ollama doesn't support STT yet
                logger.info(`[SEARCH] DEBUG: Ollama doesn't support STT: false`);
                return false;
            }
            const result = key && PROVIDERS[provider]?.sttModels.length > 0;
            logger.info(`[SEARCH] DEBUG: ${provider} STT check: hasKey=${!!key}, modelCount=${PROVIDERS[provider]?.sttModels.length || 0}, result=${result}`);
            return result;
        });
        
        const result = hasLlmKey && hasSttKey;
        logger.info(`hasConfiguredProviders: LLM=${hasLlmKey}, STT=${hasSttKey}, result=${result}`);
        return result;
    }

    hasValidApiKey(provider = null) {
        // Remove Firebase bypass - everyone needs actual API keys
        // Firebase authentication doesn't provide API keys for AI providers
        
        if (provider) {
            // Check specific provider
            const key = this.state.apiKeys[provider];
            if (provider === 'ollama' || provider === 'whisper') {
                return key === 'local';
            }
            return key && key.trim().length > 0;
        }
        
        // Check if any provider has a valid API key
        return Object.entries(this.state.apiKeys).some(([provider, key]) => {
            if (provider === 'ollama' || provider === 'whisper') {
                return key === 'local';
            }
            return key && key.trim().length > 0;
        });
    }

    /**
     * Returns an object with { provider: true/false } for each provider, indicating if a valid API key is set.
     * Used for web dashboard API key status.
     * @param {string} userId
     */
    async getAllApiKeyStatus(userId) {
        // Optionally reload state for the given user if needed
        if (userId && userId !== this.authService.getCurrentUserId()) {
            await this.authService.setCurrentUserId(userId);
            await this._loadStateFromDatabase();
        }
        const status = {};
        for (const provider of Object.keys(PROVIDERS)) {
            const key = this.state.apiKeys[provider];
            if (provider === 'ollama' || provider === 'whisper') {
                status[provider] = key === 'local';
            } else {
                status[provider] = !!(key && key.trim().length > 0);
            }
        }
        return status;
    }


    getAvailableModels(type) {
        const available = [];
        const modelList = type === 'llm' ? 'llmModels' : 'sttModels';

        for (const [providerId, key] of Object.entries(this.state.apiKeys)) {
            if (!key) continue;
            
            // Ollama[Korean comment translated] [Korean comment translated] [Korean comment translated] API[Korean comment translated] [Korean comment translated] Model[Korean comment translated] [Korean comment translated]
            if (providerId === 'ollama' && type === 'llm') {
                try {
                    // TODO: [Korean comment translated] [Korean comment translated] API `/api/v1/models/ollama` [Korean comment translated] [Korean comment translated] [Korean comment translated]
                    // For now, use static models from PROVIDERS configuration
                    logger.info('[ModelStateService] Using static Ollama models (backend API integration pending)');
                    // const response = await fetch(`${process.env.XERUS_API_URL}/api/v1/models/ollama`);
                    // const ollamaModels = await response.json();
                    // available.push(...ollamaModels);
                } catch (error) {
                    logger.warn('Failed to get Ollama models from backend API:', { message: error.message });
                }
            }
            // Whisper[Korean comment translated] [Korean comment translated] [Korean comment translated] Model [Korean comment translated] [Korean comment translated] ([Korean comment translated] Status[Korean comment translated] [Korean comment translated] Confirm)
            else if (providerId === 'whisper' && type === 'stt') {
                // Whisper Model[Korean comment translated] factory.js[Korean comment translated] [Korean comment translated] [Korean comment translated] [Korean comment translated]
                if (PROVIDERS[providerId]?.[modelList]) {
                    available.push(...PROVIDERS[providerId][modelList]);
                }
            }
            // [Korean comment translated] provider[Korean comment translated] [Korean comment translated] [Korean comment translated] [Korean comment translated]
            else if (PROVIDERS[providerId]?.[modelList]) {
                available.push(...PROVIDERS[providerId][modelList]);
            }
        }
        
        return [...new Map(available.map(item => [item.id, item])).values()];
    }
    
    getSelectedModels() {
        return this.state.selectedModels;
    }
    
    setSelectedModel(type, modelId) {
        const availableModels = this.getAvailableModels(type);
        const isAvailable = availableModels.some(model => model.id === modelId);
        
        if (!isAvailable) {
            logger.warn('Model is not available for type:', { modelId, type });
            return false;
        }
        
        const previousModelId = this.state.selectedModels[type];
        this.state.selectedModels[type] = modelId;
        this._saveState();
        
        logger.info('Selected  model:  (was: )');
        
        // Auto warm-up for Ollama models
        if (type === 'llm' && modelId && modelId !== previousModelId) {
            const provider = this.getProviderForModel('llm', modelId);
            if (provider === 'ollama') {
                this._autoWarmUpOllamaModel(modelId, previousModelId);
            }
        }
        
        this._broadcastToAllWindows('model-state:updated', this.state);
        this._broadcastToAllWindows('settings-updated');
        return true;
    }

    /**
     * Auto warm-up Ollama model when LLM selection changes
     * @private
     * @param {string} newModelId - The newly selected model
     * @param {string} previousModelId - The previously selected model
     */
    async _autoWarmUpOllamaModel(newModelId, previousModelId) {
        try {
            logger.info('LLM model changed:  → , triggering warm-up');
            
            // Get Ollama service if available
            const ollamaService = require('./ollamaService');
            if (!ollamaService) {
                logger.info('[ModelStateService] OllamaService not available for auto warm-up');
                return;
            }

            // Delay warm-up slightly to allow UI to update first
            setTimeout(async () => {
                try {
                    logger.info('Starting background warm-up for:');
                    const success = await ollamaService.warmUpModel(newModelId);
                    
                    if (success) {
                        logger.info('Successfully warmed up model:');
                    } else {
                        logger.info('Failed to warm up model:');
                    }
                } catch (error) {
                    logger.info('Error during auto warm-up for :', { message: error.message });
                }
            }, 500); // 500ms delay
            
        } catch (error) {
            logger.error('Error in auto warm-up setup:', { error });
        }
    }

    getProviderConfig() {
        const serializableProviders = {};
        for (const key in PROVIDERS) {
            const { handler, ...rest } = PROVIDERS[key];
            serializableProviders[key] = rest;
        }
        return serializableProviders;
    }

    async handleValidateKey(provider, key) {
        const result = await this.validateApiKey(provider, key);
        if (result.success) {
            // Use 'local' as placeholder for local services
            const finalKey = (provider === 'ollama' || provider === 'whisper') ? 'local' : key;
            await this.setApiKey(provider, finalKey);
        }
        return result;
    }

    async handleRemoveApiKey(provider) {
        logger.info('handleRemoveApiKey:');
        const success = await this.removeApiKey(provider);
        if (success) {
            const selectedModels = this.getSelectedModels();
            if (!selectedModels.llm || !selectedModels.stt) {
                this._broadcastToAllWindows('force-show-apikey-header');
            }
        }
        return success;
    }

    async handleSetSelectedModel(type, modelId) {
        return this.setSelectedModel(type, modelId);
    }

    /**
     * 
     * @param {('llm' | 'stt')} type
     * @returns {{provider: string, model: string, apiKey: string} | null}
     */
    getCurrentModelInfo(type) {
        this._logCurrentSelection();
        const model = this.state.selectedModels[type];
        if (!model) {
            return null; 
        }
        
        const provider = this.getProviderForModel(type, model);
        if (!provider) {
            return null;
        }

        const apiKey = this.getApiKey(provider);
        return { provider, model, apiKey };
    }
    
}

// Export singleton instance
const modelStateService = new ModelStateService();
module.exports = modelStateService;
// modelStateService.js — claire-api est le seul provider, clés gérées côté serveur
const Store = require('electron-store');
const { EventEmitter } = require('events');
const { BrowserWindow } = require('electron');
const { PROVIDERS } = require('../ai/factory');
const { createLogger } = require('./logger.js');

const logger = createLogger('ModelStateService');

const DEFAULT_LLM_MODEL = 'gpt-4o';
const DEFAULT_STT_MODEL = 'u3-rt-pro';

class ModelStateService extends EventEmitter {
    constructor() {
        super();
        this.store = new Store({ name: 'xerus-model-state' });
        this.state = {
            selectedModels: {
                llm: DEFAULT_LLM_MODEL,
                stt: DEFAULT_STT_MODEL,
            },
        };
    }

    async initialize() {
        const saved = this.store.get('selectedModels', {});
        this.state.selectedModels.llm = saved.llm || DEFAULT_LLM_MODEL;
        this.state.selectedModels.stt = saved.stt || DEFAULT_STT_MODEL;
        logger.info('[ModelStateService] Initialized — provider: claire-api, LLM:', this.state.selectedModels.llm, 'STT:', this.state.selectedModels.stt);
    }

    _broadcastToAllWindows(eventName, data = null) {
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed()) {
                data !== null ? win.webContents.send(eventName, data) : win.webContents.send(eventName);
            }
        });
    }

    // Toujours claire-api
    getCurrentModelInfo(type) {
        return { provider: 'claire-api', model: this.state.selectedModels[type] };
    }

    getProviderForModel(type, modelId) {
        return 'claire-api';
    }

    // Les clés sont côté serveur — pas de clés locales
    getApiKey(provider) { return null; }
    getAllApiKeys() { return {}; }

    getSelectedModels() {
        return { ...this.state.selectedModels };
    }

    getAvailableModels(type) {
        const key = type === 'llm' ? 'llmModels' : 'sttModels';
        return PROVIDERS['claire-api'][key] || [];
    }

    getProviderConfig() {
        return {
            providers: { 'claire-api': PROVIDERS['claire-api'] },
            activeProvider: 'claire-api',
        };
    }

    areProvidersConfigured() { return true; }
    hasConfiguredProviders() { return true; }

    async handleSetSelectedModel(type, modelId) {
        this.state.selectedModels[type] = modelId;
        this.store.set('selectedModels', this.state.selectedModels);
        this._broadcastToAllWindows('model-state-changed');
        return true;
    }

    // Stubs — BYOK supprimé
    async handleValidateKey(provider, key) {
        return { success: false, error: 'BYOK non supporté — clés gérées côté serveur' };
    }
    async handleRemoveApiKey(provider) { return true; }
    async setApiKey(provider, key) { /* no-op */ }
    async removeApiKey(provider) { /* no-op */ }
    _autoSelectAvailableModels(types = []) { /* no-op — claire-api toujours disponible */ }
}

const modelStateService = new ModelStateService();
module.exports = modelStateService;

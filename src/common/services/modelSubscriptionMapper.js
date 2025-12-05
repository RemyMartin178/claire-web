/**
 * Model Subscription Mapper
 * Maps AI models to subscription plans
 * 
 * Plans:
 * - free: Modèles de base (gpt-3.5, claude-haiku, gemini-flash)
 * - plus: Modèles avancés (gpt-4-turbo, claude-sonnet, gemini-pro)
 * - enterprise: Modèles ultimes (gpt-5, claude-opus, gemini-ultra)
 */

const { createLogger } = require('./logger');

const logger = createLogger('ModelSubscriptionMapper');

// Mapping des modèles par plan d'abonnement
const MODEL_MAPPING = {
    openai: {
        free: [
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', cost: 'low' }
        ],
        plus: [
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'medium' },
            { id: 'gpt-4o', name: 'GPT-4o', cost: 'medium' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', cost: 'low' }
        ],
        enterprise: [
            { id: 'gpt-5', name: 'GPT-5 (Ultime)', cost: 'high' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'medium' },
            { id: 'gpt-4o', name: 'GPT-4o', cost: 'medium' }
        ]
    },
    anthropic: {
        free: [
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', cost: 'low' }
        ],
        plus: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', cost: 'medium' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', cost: 'high' }
        ],
        enterprise: [
            { id: 'claude-3-5-opus-20241022', name: 'Claude 3.5 Opus (Ultime)', cost: 'high' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', cost: 'medium' }
        ]
    },
    gemini: {
        free: [
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', cost: 'low' }
        ],
        plus: [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', cost: 'medium' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', cost: 'medium' }
        ],
        enterprise: [
            { id: 'gemini-2.5-ultra', name: 'Gemini 2.5 Ultra (Ultime)', cost: 'high' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', cost: 'medium' }
        ]
    }
};

/**
 * Récupère les modèles disponibles pour un plan donné
 * @param {string} provider - 'openai', 'anthropic', 'gemini'
 * @param {string} plan - 'free', 'plus', 'enterprise'
 * @returns {Array} Liste des modèles disponibles
 */
function getAvailableModels(provider, plan) {
    if (!MODEL_MAPPING[provider]) {
        logger.warn(`[ModelSubscriptionMapper] Unknown provider: ${provider}`);
        return [];
    }
    
    if (!MODEL_MAPPING[provider][plan]) {
        logger.warn(`[ModelSubscriptionMapper] Plan ${plan} not available for ${provider}, falling back to free`);
        return MODEL_MAPPING[provider].free || [];
    }
    
    return MODEL_MAPPING[provider][plan];
}

/**
 * Récupère le modèle par défaut pour un plan donné
 * @param {string} provider - 'openai', 'anthropic', 'gemini'
 * @param {string} plan - 'free', 'plus', 'enterprise'
 * @returns {Object|null} Modèle par défaut
 */
function getDefaultModel(provider, plan) {
    const models = getAvailableModels(provider, plan);
    if (models.length === 0) {
        return null;
    }
    
    // Retourne le premier modèle (généralement le meilleur pour le plan)
    return models[0];
}

/**
 * Vérifie si un modèle est disponible pour un plan donné
 * @param {string} provider - 'openai', 'anthropic', 'gemini'
 * @param {string} modelId - ID du modèle (ex: 'gpt-5')
 * @param {string} plan - 'free', 'plus', 'enterprise'
 * @returns {boolean}
 */
function isModelAvailableForPlan(provider, modelId, plan) {
    const models = getAvailableModels(provider, plan);
    return models.some(model => model.id === modelId);
}

/**
 * Récupère le meilleur modèle disponible pour un plan
 * (le plus avancé disponible pour ce plan)
 * @param {string} provider - 'openai', 'anthropic', 'gemini'
 * @param {string} plan - 'free', 'plus', 'enterprise'
 * @returns {Object|null} Meilleur modèle
 */
function getBestModelForPlan(provider, plan) {
    const models = getAvailableModels(provider, plan);
    if (models.length === 0) {
        return null;
    }
    
    // Priorité : high > medium > low
    const costPriority = { high: 3, medium: 2, low: 1 };
    const sorted = models.sort((a, b) => costPriority[b.cost] - costPriority[a.cost]);
    
    return sorted[0];
}

/**
 * Récupère tous les modèles disponibles pour tous les plans d'un provider
 * @param {string} provider - 'openai', 'anthropic', 'gemini'
 * @returns {Object} { free: [...], plus: [...], enterprise: [...] }
 */
function getAllModelsForProvider(provider) {
    if (!MODEL_MAPPING[provider]) {
        return { free: [], plus: [], enterprise: [] };
    }
    
    return MODEL_MAPPING[provider];
}

module.exports = {
    getAvailableModels,
    getDefaultModel,
    isModelAvailableForPlan,
    getBestModelForPlan,
    getAllModelsForProvider,
    MODEL_MAPPING
};


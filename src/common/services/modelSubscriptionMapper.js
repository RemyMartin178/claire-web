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
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', cost: 'low' } // Rapide et économique pour free
        ],
        plus: [
            { id: 'gpt-4o', name: 'GPT-4o (Le plus récent)', cost: 'medium' }, // Le meilleur modèle API actuellement - Très rapide
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'medium' }, // Alternative puissante
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', cost: 'low' } // Fallback économique
        ],
        enterprise: [
            { id: 'o1', name: 'O1 (Raisonnement avancé)', cost: 'high' }, // Modèle de raisonnement complexe
            { id: 'gpt-4o', name: 'GPT-4o', cost: 'medium' }, // Très rapide et performant
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'medium' }, // Alternative stable
            { id: 'gpt-4', name: 'GPT-4', cost: 'high' } // Modèle classique puissant
        ]
    },
    anthropic: {
        free: [
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', cost: 'low' } // Rapide et économique
        ],
        plus: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', cost: 'medium' }, // Excellent équilibre vitesse/qualité
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', cost: 'low' } // Fallback rapide
        ],
        enterprise: [
            { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Dernière version)', cost: 'high' }, // Le plus récent d'Anthropic
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', cost: 'medium' }, // Très performant
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', cost: 'high' } // Pour tâches complexes
        ]
    },
    gemini: {
        free: [
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', cost: 'low' } // Très rapide et gratuit
        ],
        plus: [
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', cost: 'low' }, // Ultra rapide
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', cost: 'medium' } // Plus puissant
        ],
        enterprise: [
            { id: 'gemini-2.5-pro-exp', name: 'Gemini 2.5 Pro (Expérimental)', cost: 'high' }, // Le plus avancé
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', cost: 'low' }, // Très rapide
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', cost: 'medium' } // Alternative stable
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


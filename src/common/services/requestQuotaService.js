/**
 * Request Quota Service
 * Gère les limites de requêtes par utilisateur selon leur plan d'abonnement
 * 
 * Plans:
 * - free: 5 requêtes par jour
 * - plus/enterprise: Illimité
 */

const Store = require('electron-store');
const { createLogger } = require('./logger');
const subscriptionService = require('./subscriptionService');
const authService = require('./authService');

const logger = createLogger('RequestQuotaService');

// Configuration des quotas par plan
const QUOTA_CONFIG = {
    free: {
        dailyLimit: 5,
        resetTime: '00:00', // Minuit
        unlimited: false
    },
    plus: {
        dailyLimit: -1, // -1 = illimité
        unlimited: true
    },
    enterprise: {
        dailyLimit: -1, // -1 = illimité
        unlimited: true
    }
};

class RequestQuotaService {
    constructor() {
        this.store = new Store({ name: 'request-quotas' });
    }

    /**
     * Vérifie si l'utilisateur peut faire une requête
     * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date|null, reason?: string}>}
     */
    async checkQuota() {
        try {
            const subscription = await subscriptionService.getUserSubscription();
            const plan = subscription.plan || 'free';
            const userId = authService.getCurrentUserId();
            
            logger.debug('[RequestQuotaService] Checking quota for user:', { userId, plan });
            
            const config = QUOTA_CONFIG[plan] || QUOTA_CONFIG.free;
            
            // Utilisateurs premium : illimité
            if (config.unlimited) {
                logger.debug('[RequestQuotaService] Premium user - unlimited requests');
                return {
                    allowed: true,
                    remaining: -1, // -1 = illimité
                    resetAt: null,
                    plan: plan
                };
            }
            
            // Utilisateurs gratuits : vérifier le quota
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const key = `quota_${userId}_${today}`;
            
            const quotaData = this.store.get(key, {
                count: 0,
                date: today,
                resetAt: this._getResetTime()
            });
            
            // Vérifier si c'est un nouveau jour
            if (quotaData.date !== today) {
                logger.info('[RequestQuotaService] New day - resetting quota');
                quotaData.count = 0;
                quotaData.date = today;
                quotaData.resetAt = this._getResetTime();
                this.store.set(key, quotaData);
            }
            
            const remaining = config.dailyLimit - quotaData.count;
            const allowed = remaining > 0;
            
            logger.debug('[RequestQuotaService] Quota check result:', {
                allowed,
                remaining,
                used: quotaData.count,
                limit: config.dailyLimit,
                resetAt: quotaData.resetAt
            });
            
            return {
                allowed,
                remaining: Math.max(0, remaining),
                used: quotaData.count,
                limit: config.dailyLimit,
                resetAt: new Date(quotaData.resetAt),
                plan: plan
            };
            
        } catch (error) {
            logger.error('[RequestQuotaService] Error checking quota:', error);
            // En cas d'erreur, autoriser la requête (fail-open)
            return {
                allowed: true,
                remaining: -1,
                resetAt: null,
                error: error.message
            };
        }
    }

    /**
     * Consomme une requête (appelé après une requête réussie)
     * @returns {Promise<{success: boolean, remaining: number}>}
     */
    async consumeRequest() {
        try {
            const subscription = await subscriptionService.getUserSubscription();
            const plan = subscription.plan || 'free';
            const userId = authService.getCurrentUserId();
            
            const config = QUOTA_CONFIG[plan] || QUOTA_CONFIG.free;
            
            // Utilisateurs premium : ne pas compter
            if (config.unlimited) {
                return {
                    success: true,
                    remaining: -1
                };
            }
            
            // Utilisateurs gratuits : incrémenter le compteur
            const today = new Date().toISOString().split('T')[0];
            const key = `quota_${userId}_${today}`;
            
            const quotaData = this.store.get(key, {
                count: 0,
                date: today,
                resetAt: this._getResetTime()
            });
            
            // Vérifier si c'est un nouveau jour
            if (quotaData.date !== today) {
                quotaData.count = 0;
                quotaData.date = today;
                quotaData.resetAt = this._getResetTime();
            }
            
            quotaData.count++;
            this.store.set(key, quotaData);
            
            const remaining = config.dailyLimit - quotaData.count;
            
            logger.info('[RequestQuotaService] Request consumed:', {
                used: quotaData.count,
                remaining: Math.max(0, remaining),
                limit: config.dailyLimit
            });
            
            return {
                success: true,
                remaining: Math.max(0, remaining),
                used: quotaData.count,
                limit: config.dailyLimit
            };
            
        } catch (error) {
            logger.error('[RequestQuotaService] Error consuming request:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Récupère les statistiques de quota pour l'utilisateur
     * @returns {Promise<{used: number, remaining: number, limit: number, resetAt: Date|null}>}
     */
    async getQuotaStats() {
        try {
            const subscription = await subscriptionService.getUserSubscription();
            const plan = subscription.plan || 'free';
            const userId = authService.getCurrentUserId();
            
            const config = QUOTA_CONFIG[plan] || QUOTA_CONFIG.free;
            
            if (config.unlimited) {
                return {
                    used: 0,
                    remaining: -1,
                    limit: -1,
                    resetAt: null,
                    plan: plan
                };
            }
            
            const today = new Date().toISOString().split('T')[0];
            const key = `quota_${userId}_${today}`;
            
            const quotaData = this.store.get(key, {
                count: 0,
                date: today,
                resetAt: this._getResetTime()
            });
            
            // Vérifier si c'est un nouveau jour
            if (quotaData.date !== today) {
                return {
                    used: 0,
                    remaining: config.dailyLimit,
                    limit: config.dailyLimit,
                    resetAt: new Date(this._getResetTime()),
                    plan: plan
                };
            }
            
            const remaining = config.dailyLimit - quotaData.count;
            
            return {
                used: quotaData.count,
                remaining: Math.max(0, remaining),
                limit: config.dailyLimit,
                resetAt: new Date(quotaData.resetAt),
                plan: plan
            };
            
        } catch (error) {
            logger.error('[RequestQuotaService] Error getting quota stats:', error);
            return {
                used: 0,
                remaining: -1,
                limit: -1,
                resetAt: null,
                error: error.message
            };
        }
    }

    /**
     * Réinitialise le quota (pour les tests ou admin)
     * @param {string} userId - ID de l'utilisateur (optionnel, utilise l'utilisateur actuel si non fourni)
     */
    async resetQuota(userId = null) {
        try {
            const targetUserId = userId || authService.getCurrentUserId();
            const today = new Date().toISOString().split('T')[0];
            const key = `quota_${targetUserId}_${today}`;
            
            this.store.delete(key);
            logger.info('[RequestQuotaService] Quota reset for user:', targetUserId);
            
            return { success: true };
        } catch (error) {
            logger.error('[RequestQuotaService] Error resetting quota:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Calcule l'heure de réinitialisation (minuit du jour suivant)
     * @returns {string} ISO string de l'heure de réinitialisation
     */
    _getResetTime() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    }
}

// Singleton
const requestQuotaService = new RequestQuotaService();

module.exports = requestQuotaService;


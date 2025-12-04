const authService = require('./authService');
const { createLogger } = require('./logger');
const { resourcePoolManager } = require('./resource-pool-manager');

const logger = createLogger('SubscriptionService');

// Cache pour éviter trop d'appels API
let subscriptionCache = {
    data: null,
    timestamp: null,
    ttl: 5 * 60 * 1000 // 5 minutes
};

/**
 * Récupère le plan de subscription de l'utilisateur
 * @returns {Promise<{plan: string, isPremium: boolean, isActive: boolean}>}
 */
async function getUserSubscription() {
    try {
        const currentUser = authService.getCurrentUser();
        
        if (!currentUser || !currentUser.isLoggedIn) {
            logger.debug('[SubscriptionService] User not logged in, returning free plan');
            return {
                plan: 'free',
                isPremium: false,
                isActive: false
            };
        }

        // Vérifier le cache
        if (subscriptionCache.data && subscriptionCache.timestamp) {
            const age = Date.now() - subscriptionCache.timestamp;
            if (age < subscriptionCache.ttl) {
                logger.debug('[SubscriptionService] Using cached subscription data');
                return subscriptionCache.data;
            }
        }

        // Récupérer le token Firebase (même méthode que backend.repository.js)
        let firebaseToken;
        try {
            // Utiliser authService.currentUser (propriété directe) au lieu de getCurrentUser()
            const firebaseUser = authService.currentUser;
            
            if (firebaseUser && firebaseUser.getIdToken) {
                firebaseToken = await firebaseUser.getIdToken(true);
                logger.debug('[SubscriptionService] Firebase token retrieved successfully');
            } else {
                logger.warn('[SubscriptionService] No Firebase user found or getIdToken not available');
                return {
                    plan: 'free',
                    isPremium: false,
                    isActive: false
                };
            }
        } catch (tokenError) {
            logger.error('[SubscriptionService] Failed to get Firebase token:', tokenError);
            return {
                plan: 'free',
                isPremium: false,
                isActive: false
            };
        }

        // Déterminer l'URL de l'API web (même logique que authService)
        const isPackaged = require('electron').app.isPackaged;
        const execPath = process.execPath || '';
        const isProduction = isPackaged || execPath.includes('Claire.exe') || execPath.includes('dist');
        
        // Utiliser l'URL de production ou localhost selon l'environnement
        const webApiUrl = isProduction
            ? (process.env.pickleglass_WEB_URL || 'https://pickleglass.com')
            : (process.env.pickleglass_WEB_URL || 'http://localhost:3000');
        
        const subscriptionUrl = `${webApiUrl}/api/app/subscription`;
        
        logger.debug('[SubscriptionService] Fetching subscription from:', subscriptionUrl);

        // Appeler l'API web
        const response = await resourcePoolManager.queuedFetch(subscriptionUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${firebaseToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            logger.warn('[SubscriptionService] Failed to fetch subscription, status:', response.status);
            // En cas d'erreur, retourner free plan
            const fallback = {
                plan: 'free',
                isPremium: false,
                isActive: false
            };
            subscriptionCache.data = fallback;
            subscriptionCache.timestamp = Date.now();
            return fallback;
        }

        const data = await response.json();
        
        if (data.success && data.subscription) {
            const subscription = {
                plan: data.subscription.plan || 'free',
                isPremium: data.subscription.isPremium || false,
                isActive: data.subscription.isActive || false
            };
            
            // Mettre en cache
            subscriptionCache.data = subscription;
            subscriptionCache.timestamp = Date.now();
            
            logger.info('[SubscriptionService] Subscription retrieved:', subscription);
            return subscription;
        } else {
            logger.warn('[SubscriptionService] Invalid response format, returning free plan');
            const fallback = {
                plan: 'free',
                isPremium: false,
                isActive: false
            };
            subscriptionCache.data = fallback;
            subscriptionCache.timestamp = Date.now();
            return fallback;
        }
    } catch (error) {
        logger.error('[SubscriptionService] Error fetching subscription:', error);
        // En cas d'erreur, retourner free plan
        const fallback = {
            plan: 'free',
            isPremium: false,
            isActive: false
        };
        subscriptionCache.data = fallback;
        subscriptionCache.timestamp = Date.now();
        return fallback;
    }
}

/**
 * Vérifie si l'utilisateur a un plan premium (plus ou enterprise)
 * @returns {Promise<boolean>}
 */
async function isPremiumUser() {
    const subscription = await getUserSubscription();
    return subscription.isPremium;
}

/**
 * Vérifie si l'utilisateur a un plan actif
 * @returns {Promise<boolean>}
 */
async function hasActiveSubscription() {
    const subscription = await getUserSubscription();
    return subscription.isActive;
}

/**
 * Réinitialise le cache (utile après changement de subscription)
 */
function clearCache() {
    subscriptionCache.data = null;
    subscriptionCache.timestamp = null;
    logger.debug('[SubscriptionService] Cache cleared');
}

module.exports = {
    getUserSubscription,
    isPremiumUser,
    hasActiveSubscription,
    clearCache
};


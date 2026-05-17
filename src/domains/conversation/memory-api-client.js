/**
 * Best-effort client for the optional backend memory service.
 *
 * Memory must never block STT, Ask, Summary, or session lifecycle. Endpoint
 * failures disable this client for the current app session and return skipped
 * results instead of throwing into product flows.
 */

const { createLogger } = require('../../common/services/logger.js');

const logger = createLogger('MemoryApiClient');

class MemoryApiClient {
    constructor(options = {}) {
        this.baseUrl =
            options.baseUrl ||
            process.env.CLAIRE_API_URL ||
            process.env.pickleglass_API_URL ||
            process.env.XERUS_API_URL ||
            'http://localhost:3001';
        this.apiVersion = options.apiVersion || 'v1/memory';
        this.timeout = Number(options.timeout || process.env.MEMORY_API_TIMEOUT_MS || 5000);

        this.disabled = Boolean(options.disabled) || process.env.MEMORY_API_ENABLED === 'false';
        this.disabledReason = this.disabled ? 'MEMORY_API_ENABLED=false' : null;
        if (this.disabled) {
            MemoryApiClient.sessionDisabled = true;
            MemoryApiClient.sessionDisabledReason = this.disabledReason;
        }
        this.lastWarningAt = 0;
        this.warningIntervalMs = Number(options.warningIntervalMs || 30000);

        this.authToken = null;
        this.userId = null;
        this.userPermissions = [];
        this.isGuest = false;

        logger.info('[MemoryApiClient] API client created', {
            baseUrl: this.baseUrl,
            apiVersion: this.apiVersion,
            disabled: this.disabled,
        });
    }

    setAuthContext(authContext = {}) {
        this.authToken = authContext.token || null;
        this.userId = authContext.userId || null;
        this.userPermissions = authContext.permissions || [];
        this.isGuest = authContext.isGuest || false;

        logger.info('[MemoryApiClient] Auth context updated', {
            hasToken: Boolean(this.authToken),
            userId: this.userId,
            isGuest: this.isGuest,
        });
    }

    shouldLogWarning() {
        const now = Date.now();
        if (now - MemoryApiClient.lastWarningAt < this.warningIntervalMs) return false;
        MemoryApiClient.lastWarningAt = now;
        this.lastWarningAt = now;
        return true;
    }

    disable(reason) {
        const nextReason = reason || 'memory disabled';
        const wasEnabled = !this.disabled && !MemoryApiClient.sessionDisabled;

        this.disabled = true;
        this.disabledReason = nextReason;
        MemoryApiClient.sessionDisabled = true;
        MemoryApiClient.sessionDisabledReason = nextReason;

        if (wasEnabled) {
            if (this.shouldLogWarning()) {
                logger.warn('[MemoryApiClient] Memory API disabled for this app session', {
                    reason: this.disabledReason,
                });
            }
        }
    }

    async storeWorkingMemory(agentId, userId, referenceData) {
        const payload = {
            type: referenceData?.type || 'visual_reference',
            content: referenceData?.content || referenceData,
            metadata: {
                ...referenceData?.metadata,
                timestamp: new Date().toISOString(),
                source: 'frontend_memory_client',
            },
        };
        const result = await this._requestJson(
            'POST',
            this._buildUrl(`/working/${agentId}/${userId}`),
            payload,
            'storeWorkingMemory'
        );
        if (!result.success) return result;

        logger.debug('[MemoryApiClient] Working memory reference stored', {
            agentId,
            userId,
            type: payload.type,
        });
        return result.data || result;
    }

    async getWorkingMemory(agentId, userId, options = {}) {
        const result = await this._requestJson(
            'GET',
            this._buildUrl(`/working/${agentId}/${userId}`, { limit: options.limit || 10 }),
            null,
            'getWorkingMemory'
        );
        if (!result.success) return result;
        return result.data?.data || result.data || result;
    }

    async storeEpisodicMemory(agentId, userId, episodicData) {
        const payload = {
            content: episodicData?.content || episodicData,
            response: episodicData?.response || null,
            context: episodicData?.context || {},
            importance: episodicData?.importance || 0.7,
        };
        const result = await this._requestJson(
            'POST',
            this._buildUrl(`/episodic/${agentId}/${userId}`),
            payload,
            'storeEpisodicMemory'
        );
        if (!result.success) return result;

        const body = result.data || {};
        logger.debug('[MemoryApiClient] Episodic memory stored', {
            agentId,
            userId,
            episodeId: body.episodeId,
            type: episodicData?.content?.type,
        });

        return {
            success: body.success !== false,
            id: body.episodeId,
            message: body.message,
        };
    }

    async searchEpisodicMemory(agentId, userId, query, options = {}) {
        const result = await this._requestJson(
            'GET',
            this._buildUrl(`/episodic/${agentId}/${userId}`, {
                query,
                limit: options.limit || 10,
                offset: options.offset || 0,
            }),
            null,
            'searchEpisodicMemory'
        );
        if (!result.success) return result;
        return result.data?.data || result.data || result;
    }

    async storeSemanticMemory(agentId, userId, knowledgeData) {
        const payload = {
            content: knowledgeData?.content || knowledgeData,
            title: knowledgeData?.title || 'Untitled Knowledge',
            category: knowledgeData?.category || 'general',
            importance: knowledgeData?.importance || 0.7,
        };
        const result = await this._requestJson(
            'POST',
            this._buildUrl(`/semantic/${agentId}/${userId}`),
            payload,
            'storeSemanticMemory'
        );
        if (!result.success) return result;

        const body = result.data || {};
        return {
            success: body.success !== false,
            id: body.knowledgeId,
            message: body.message,
        };
    }

    async storeProceduralMemory(agentId, userId, behaviorData) {
        const payload = {
            pattern: behaviorData?.pattern || behaviorData,
            context: behaviorData?.context || {},
            success: behaviorData?.success !== undefined ? behaviorData.success : true,
        };
        const result = await this._requestJson(
            'POST',
            this._buildUrl(`/procedural/${agentId}/${userId}/behavior`),
            payload,
            'storeProceduralMemory'
        );
        if (!result.success) return result;
        return result.data || result;
    }

    async getMemoryStats(agentId, userId) {
        const result = await this._requestJson(
            'GET',
            this._buildUrl(`/instance/${agentId}/${userId}`),
            null,
            'getMemoryStats'
        );
        if (!result.success) return result;
        return result.data?.data || result.data || result;
    }

    async checkMemoryHealth() {
        const result = await this._requestJson(
            'GET',
            this._buildUrl('/health'),
            null,
            'checkMemoryHealth'
        );
        if (!result.success) return result;
        return result.data?.data || result.data || result;
    }

    _buildUrl(endpoint, params = {}) {
        let url = `${this.baseUrl.replace(/\/$/, '')}/api/${this.apiVersion}${endpoint}`;
        const queryString = new URLSearchParams();

        Object.keys(params).forEach((key) => {
            if (params[key] !== undefined && params[key] !== null) {
                queryString.append(key, params[key]);
            }
        });

        const query = queryString.toString();
        if (query) url += `?${query}`;
        return url;
    }

    async _requestJson(method, url, body, operation) {
        if (this.disabled || MemoryApiClient.sessionDisabled) {
            return this._skippedResult({
                reason: this.disabledReason || MemoryApiClient.sessionDisabledReason,
            });
        }

        try {
            const response = await this._makeRequest(method, url, body);
            if (!response.ok) {
                return this._handleHttpFailure(response, url, operation);
            }

            return {
                success: true,
                data: await this._safeJson(response),
            };
        } catch (error) {
            return this._handleRequestError(error, url, operation);
        }
    }

    async _makeRequest(method, url, body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Claire-Memory-Client/1.0',
        };

        if (this.authToken) headers.Authorization = `Bearer ${this.authToken}`;
        if (this.userId) headers['X-User-ID'] = this.userId;
        if (this.isGuest) headers['X-Guest-Mode'] = 'true';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            logger.debug('[MemoryApiClient] HTTP request', {
                method,
                url: this._safeUrl(url),
                hasBody: Boolean(body),
                timeout: this.timeout,
            });

            return await fetch(url, {
                method,
                headers,
                signal: controller.signal,
                body: body && (method === 'POST' || method === 'PUT')
                    ? JSON.stringify(body)
                    : undefined,
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async _safeJson(response) {
        try {
            return await response.json();
        } catch (_) {
            return null;
        }
    }

    _handleHttpFailure(response, url, operation) {
        const status = response.status;
        const result = {
            success: false,
            status,
            statusText: response.statusText,
        };

        if (status === 404 || status >= 500) {
            this.disable(`memory endpoint returned ${status}`);
            return this._skippedResult({ ...result, disabled: true });
        }

        if (this.shouldLogWarning()) {
            logger.warn('[MemoryApiClient] non-blocking failure', {
                operation,
                status,
                url: this._safeUrl(url),
            });
        }

        return result;
    }

    _handleRequestError(error, url, operation) {
        const message = error?.name === 'AbortError'
            ? `memory request timed out after ${this.timeout}ms`
            : error?.message || 'memory request failed';

        this.disable(message);

        if (this.shouldLogWarning()) {
            logger.warn('[MemoryApiClient] non-blocking error', {
                operation,
                error: message,
                url: this._safeUrl(url),
            });
        }

        return this._skippedResult({ error: message, disabled: true });
    }

    _skippedResult(extra = {}) {
        return {
            success: false,
            skipped: true,
            reason: this.disabledReason || MemoryApiClient.sessionDisabledReason || extra.reason || 'memory unavailable',
            ...extra,
        };
    }

    _safeUrl(url) {
        try {
            const parsed = new URL(url);
            parsed.search = parsed.search ? '?...' : '';
            return parsed.toString();
        } catch (_) {
            return url || null;
        }
    }
}

MemoryApiClient.sessionDisabled = false;
MemoryApiClient.sessionDisabledReason = null;
MemoryApiClient.lastWarningAt = 0;

module.exports = MemoryApiClient;

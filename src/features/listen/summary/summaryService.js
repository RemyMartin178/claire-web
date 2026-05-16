const { BrowserWindow } = require('electron');
// Use simple prompt builder instead of domain prompt manager
const { getSystemPrompt } = require('../../../common/prompts/promptBuilder.js');
const { createLLM } = require('../../../common/ai/factory');
const sessionRepository = require('../../../common/repositories/session');
const summaryRepository = require('./repositories');
const modelStateService = require('../../../common/services/modelStateService');
const { createLogger } = require('../../../common/services/logger.js');

const logger = createLogger('SummaryService');
// const { getStoredApiKey, getStoredProvider, getCurrentModelInfo } = require('../../../window/windowManager.js');

class SummaryService {
    constructor() {
        this.previousAnalysisResult = null;
        this.analysisHistory = [];
        this.conversationHistory = [];
        this.currentSessionId = null;

        // Callbacks
        this.onAnalysisComplete = null;
        this.onStatusUpdate = null;
    }

    setCallbacks({ onAnalysisComplete, onStatusUpdate }) {
        this.onAnalysisComplete = onAnalysisComplete;
        this.onStatusUpdate = onStatusUpdate;
    }

    setSessionId(sessionId) {
        this.currentSessionId = sessionId;
    }

    sendToRenderer(channel, data) {
        const { windowPool } = require('../../../window/windowManager');
        const listenWindow = windowPool?.get('listen');

        if (listenWindow && !listenWindow.isDestroyed()) {
            listenWindow.webContents.send(channel, data);
        }
    }

    normalizeDisplayText(text) {
        if (typeof text !== 'string' || !text) return text;

        let normalized = text;
        const replacements = [
            ['ÔÇÖ', '’'],
            ['ÔÇª', '…'],
            ['ÔÇô', '–'],
            ['ÔÇö', '—'],
            ['ÔÇ£', '“'],
            ['ÔÇ"', '”'],
            ['ÔÇ¥', '•'],
            ['├®', 'é'],
            ['├¿', 'è'],
            ['├á', 'à'],
            ['├¢', 'â'],
            ['├ª', 'ê'],
            ['├«', 'ë'],
            ['├§', 'ç'],
            ['├╗', 'û'],
            ['├¹', 'ù'],
            ['├´', 'ô'],
            ['├î', 'î'],
            ['├ï', 'ï'],
            ['Ã©', 'é'],
            ['Ã¨', 'è'],
            ['Ã ', 'à'],
            ['Ã¢', 'â'],
            ['Ãª', 'ê'],
            ['Ã«', 'ë'],
            ['Ã§', 'ç'],
            ['Ã»', 'û'],
            ['Ã¹', 'ù'],
            ['Ã´', 'ô'],
            ['Ã®', 'î'],
            ['Ã¯', 'ï'],
            ['Â«', '«'],
            ['Â»', '»'],
        ];

        for (const [from, to] of replacements) {
            normalized = normalized.split(from).join(to);
        }

        return normalized.trim();
    }

    addConversationTurn(speaker, text) {
        const conversationText = `${speaker.toLowerCase()}: ${text.trim()}`;
        this.conversationHistory.push(conversationText);
        logger.info(`[CHAT] Added conversation text: ${conversationText}`);
        logger.info(` Total conversation history: ${this.conversationHistory.length} texts`);

        // Debug: show the actual conversation history
        console.log('DEBUG conversation history:', this.conversationHistory.map((text, i) => `${i + 1}: ${text.substring(0, 50)}...`));

        // Trigger analysis if needed
        this.triggerAnalysisIfNeeded();
    }

    getConversationHistory() {
        return this.conversationHistory;
    }

    resetConversationHistory() {
        this.conversationHistory = [];
        this.previousAnalysisResult = null;
        this.analysisHistory = [];
        logger.info('[LOADING] Conversation history and analysis state reset');
    }

    /**
     * Converts conversation history into text to include in the prompt.
     * @param {Array<string>} conversationTexts - Array of conversation texts ["me: ~~~", "them: ~~~", ...]
     * @param {number} maxTurns - Maximum number of recent turns to include
     * @returns {string} - Formatted conversation string for the prompt
     */
    formatConversationForPrompt(conversationTexts, maxTurns = 30) {
        if (conversationTexts.length === 0) return '';
        return conversationTexts.slice(-maxTurns).join('\n');
    }

    async makeOutlineAndRequests(conversationTexts, maxTurns = 30) {
        logger.info(`[SEARCH] makeOutlineAndRequests called - conversationTexts: ${conversationTexts.length}`);

        if (conversationTexts.length === 0) {
            logger.info('[WARNING] No conversation texts available for analysis');
            return null;
        }

        const recentConversation = this.formatConversationForPrompt(conversationTexts, maxTurns);

        // [Korean comment translated] [Korean comment translated] Result[Korean comment translated] [Korean comment translated] [Korean comment translated]
        let contextualPrompt = '';
        if (this.previousAnalysisResult) {
            contextualPrompt = `
Previous Analysis Context:
- Main Topic: ${this.previousAnalysisResult.topic.header}
- Key Points: ${this.previousAnalysisResult.summary.slice(0, 3).join(', ')}
- Last Actions: ${this.previousAnalysisResult.actions.slice(0, 2).join(', ')}

Please build upon this context while analyzing the new conversation segments.
`;
        }

        const systemPrompt = getSystemPrompt('claire_analysis', contextualPrompt, false)
            .replace('{{CONVERSATION_HISTORY}}', recentConversation);

        try {
            // Skip Firestore touch for temporary sessions
            if (this.currentSessionId && !this.currentSessionId.startsWith('temp_session_')) {
                await sessionRepository.touch(this.currentSessionId);
            }

            const modelInfo = modelStateService.getCurrentModelInfo('llm');
            console.log('DEBUG LLM modelInfo:', {
                hasModelInfo: !!modelInfo,
                provider: modelInfo?.provider,
                model: modelInfo?.model,
                hasApiKey: !!modelInfo?.apiKey
            });

            if (!modelInfo || !modelInfo.apiKey) {
                console.log('ERROR: LLM analysis failing - no model or API key');
                throw new Error('AI model or API key is not configured.');
            }
            logger.info(`[AI] Sending analysis request to ${modelInfo.provider} using model ${modelInfo.model}`);

            const messages = [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: `${contextualPrompt}

Analyse la conversation et produis un résumé développé et exploitable. Formate ta réponse EXACTEMENT avec ces sections Markdown :

**Title**
Titre de 3 à 6 mots sur le sujet principal.

**Type**
Un seul mot parmi : Réunion | Appel | Visio | Entretien | Présentation | Formation | Discussion | Sales Call

## Résumé
[2-3 phrases d'introduction : contexte général, participants si mentionnés, sujet principal abordé]

- Phrase directe sur le premier point clé, avec les infos spécifiques mentionnées (noms, chiffres, contexte)
- Phrase directe sur le deuxième point clé
- Phrase directe sur le troisième point si pertinent

## À retenir
- [Décision, engagement ou date clé — avec assez de contexte pour être compris seul]
- [Autre point critique si présent]
- (Si rien d'actionnable n'a été dit, omet cette section entière)

## Actions suggérées
- (Suggestion contextuelle courte, 3-5 mots, liée au sujet actuel)
- (2e suggestion contextuelle)
- (3e suggestion si pertinente)

RÈGLES :
- Chaque bullet du Résumé doit contenir des détails spécifiques issus de la conversation (noms, chiffres, concepts)
- L'introduction doit permettre de comprendre le sujet sans réécouter
- Ne commence PAS par "La conversation porte sur" ni "L'utilisateur a mentionné"
- Rédige dans la langue principale de la conversation
- Actions suggérées : JAMAIS de générique comme "Résumer la conversation"`,
                },
            ];

            logger.info('[AI] Sending analysis request to AI...');

            const llm = createLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.7,
                maxTokens: 1024,
                usePortkey: false,
                portkeyVirtualKey: undefined,
            });

            const completion = await llm.chat(messages);

            const responseText = this.normalizeDisplayText(completion.content);
            logger.info(`[OK] Analysis response received: ${responseText}`);
            const structuredData = this.parseResponseText(responseText, this.previousAnalysisResult);

            // Skip Firestore save for temporary sessions
            if (this.currentSessionId && !this.currentSessionId.startsWith('temp_session_')) {
                try {
                    summaryRepository.saveSummary({
                        sessionId: this.currentSessionId,
                        text: responseText,
                        tldr: structuredData.topic.header || structuredData.summary[0] || '',
                        bullet_json: JSON.stringify(structuredData.summary),
                        action_json: JSON.stringify(structuredData.actions),
                        model: modelInfo.model
                    });
                } catch (err) {
                    logger.error('Failed to save summary:', { err });
                }
            }

            // [Korean comment translated] Result Save
            this.previousAnalysisResult = structuredData;
            this.analysisHistory.push({
                timestamp: Date.now(),
                data: structuredData,
                conversationLength: conversationTexts.length,
            });

            if (this.analysisHistory.length > 10) {
                this.analysisHistory.shift();
            }

            return structuredData;
        } catch (error) {
            logger.error('[ERROR] Error during analysis generation:', { message: error.message });
            return this.previousAnalysisResult; // [Korean comment translated] [Korean comment translated] [Korean comment translated] Result [Korean comment translated]
        }
    }

    parseResponseText(responseText, previousResult) {
        const structuredData = {
            summary: [],
            topic: { header: '', type: '', bullets: [] },
            retenir: [],   // LLM-generated commitments/facts — shown as bullets, non-clickable
            actions: [],   // Quick-action buttons — always clickable
        };

        try {
            const lines = this.normalizeDisplayText(responseText).split('\n');
            let currentSection = '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                if (trimmedLine.startsWith('**Title**')) {
                    currentSection = 'title';
                    continue;
                } else if (trimmedLine.startsWith('**Type**')) {
                    currentSection = 'type';
                    continue;
                } else if (trimmedLine.startsWith('## Résumé') || trimmedLine.startsWith('## Summary') || trimmedLine.startsWith('## Notes')) {
                    currentSection = 'resume';
                    continue;
                } else if (trimmedLine.startsWith('## À retenir') || trimmedLine.startsWith('## A retenir')) {
                    currentSection = 'retenir';
                    continue;
                } else if (trimmedLine.startsWith('## Actions suggérées') || trimmedLine.startsWith('## Actions suggerées') || trimmedLine.startsWith('## Action Items') || trimmedLine.startsWith('## Actions')) {
                    currentSection = 'actions';
                    continue;
                }

                if (currentSection === 'title') {
                    const cleanTitle = this.normalizeDisplayText(trimmedLine.replace(/^\*+/, '').replace(/\*+$/, '').trim());
                    if (cleanTitle) {
                        structuredData.topic.header = cleanTitle;
                        currentSection = '';
                    }
                } else if (currentSection === 'type') {
                    const cleanType = this.normalizeDisplayText(trimmedLine.replace(/^\*+/, '').replace(/\*+$/, '').trim());
                    if (cleanType) {
                        structuredData.topic.type = cleanType;
                        currentSection = '';
                    }
                } else if (currentSection === 'resume') {
                    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                        const bullet = trimmedLine.replace(/^[-•]\s*/, '').trim();
                        if (bullet) structuredData.summary.push(bullet);
                    }
                } else if (currentSection === 'retenir') {
                    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                        const item = trimmedLine.replace(/^[-•]\s*/, '').replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]+\s*/u, '').trim();
                        if (item && !item.toLowerCase().includes('rien') && !item.toLowerCase().includes('omets')) {
                            structuredData.retenir.push(item);
                        }
                    }
                } else if (currentSection === 'actions') {
                    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                        const item = trimmedLine.replace(/^[-•]\s*/, '').replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]+\s*/u, '').trim();
                        if (item) structuredData.actions.push(item);
                    }
                }
            }

            // Fallback to previous result if nothing parsed
            if (!structuredData.topic.header && previousResult?.topic?.header) {
                structuredData.topic.header = previousResult.topic.header;
            }
            if (structuredData.summary.length === 0 && previousResult?.summary?.length) {
                structuredData.summary = previousResult.summary;
            }
            if (structuredData.retenir.length === 0 && previousResult?.retenir?.length) {
                structuredData.retenir = previousResult.retenir;
            }

            // Append always-present quick-actions after contextual ones, avoid duplicates
            const defaultActions = ['Que dois-je dire ?', 'Suggérer des questions'];
            defaultActions.forEach(a => {
                if (!structuredData.actions.includes(a)) structuredData.actions.push(a);
            });
            // Keep max 5 actions
            structuredData.actions = structuredData.actions.slice(0, 5);
        } catch (error) {
            logger.error('Error occurred:', { error });
            return previousResult || {
                summary: [],
                topic: { header: 'Analyse en cours...', bullets: [] },
                retenir: [],
                actions: ['Que dois-je dire ?', 'Suggérer des questions', 'Résumer en 1 phrase', 'Points clés à retenir'],
            };
        }

        logger.info('[DATA] Final structured data:', JSON.stringify(structuredData, null, 2));
        return structuredData;
    }

    /**
     * Triggers analysis immediately on first message and when questions are detected.
     * Also triggers at regular intervals for continuous insights.
     */
    async triggerAnalysisIfNeeded() {
        const length = this.conversationHistory.length;

        // Check if last message contains a question - if so, trigger immediately
        const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
        const hasQuestion = lastMessage && /\?|comment|pourquoi|quand|où|qui|quoi|quel|quelle/i.test(lastMessage);

        // Trigger analysis at strategic intervals for responsive insights
        const shouldTrigger =
            length === 1 ||  // INSTANT: First message triggers analysis immediately
            hasQuestion ||   // INSTANT: Question detected triggers analysis immediately
            length === 2 ||  // Second update after 2 messages
            length === 4 ||  // Third update
            (length >= 8 && length % 5 === 0);  // Then every 5 turns

        if (shouldTrigger) {
            logger.info(`Triggering analysis - ${length} conversation texts accumulated${hasQuestion ? ' (question detected)' : ''}`);

            const data = await this.makeOutlineAndRequests(this.conversationHistory);

            if (data) {
                logger.info('Sending structured data to renderer');
                console.log('DEBUG sending summary-update to renderer:', JSON.stringify(data, null, 2));
                this.sendToRenderer('summary-update', data);

                // Notify callback
                if (this.onAnalysisComplete) {
                    this.onAnalysisComplete(data);
                }
            } else {
                logger.info('No analysis data returned');
            }
        }
    }

    getCurrentAnalysisData() {
        return {
            previousResult: this.previousAnalysisResult,
            history: this.analysisHistory,
            conversationLength: this.conversationHistory.length,
        };
    }

    /**
     * Final summary pass triggered when the user explicitly ends the session.
     * Broadcasts progress to every BrowserWindow so the dashboard can show
     * its "analyzing" UI immediately and reveal the result the moment it's ready.
     *
     * @param {string} sessionId
     * @param {string[]} conversationTexts  snapshot captured BEFORE state reset
     */
    async generateFinalSummaryForSession(sessionId, conversationTexts) {
        if (!sessionId) {
            logger.warn('[SummaryService] generateFinalSummaryForSession: no sessionId, skipping');
            return null;
        }

        // Make sure saveSummary inside makeOutlineAndRequests targets the right session.
        const previousSessionId = this.currentSessionId;
        this.setSessionId(sessionId);

        this._broadcastSessionStatus('session:summary-started', { sessionId });

        try {
            if (!conversationTexts || conversationTexts.length === 0) {
                logger.info('[SummaryService] No conversation to summarize for session ' + sessionId);
                this._broadcastSessionStatus('session:summary-completed', { sessionId, empty: true });
                return null;
            }

            const data = await this.makeOutlineAndRequests(conversationTexts);

            if (!data) {
                this._broadcastSessionStatus('session:summary-failed', {
                    sessionId,
                    error: 'No data returned',
                });
                return null;
            }

            this._broadcastSessionStatus('session:summary-completed', { sessionId, data });
            return data;
        } catch (error) {
            logger.error('[SummaryService] final summary failed:', { error: error?.message, sessionId });
            this._broadcastSessionStatus('session:summary-failed', {
                sessionId,
                error: error?.message || String(error),
            });
            throw error;
        } finally {
            // Restore whatever sessionId was set before (usually null after closeSession).
            this.currentSessionId = previousSessionId;
        }
    }

    _broadcastSessionStatus(channel, payload) {
        try {
            const { BrowserWindow } = require('electron');
            BrowserWindow.getAllWindows().forEach((win) => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send(channel, payload);
                }
            });
        } catch (e) {
            logger.warn('[SummaryService] broadcast failed', { error: e?.message, channel });
        }
    }

    /**
     * Debug method to manually trigger analysis for testing
     */
    async forceAnalysis() {
        logger.info(`[TOOL] Force triggering analysis - ${this.conversationHistory.length} conversation texts`);

        if (this.conversationHistory.length === 0) {
            logger.warn('No conversation history available for analysis');
            return null;
        }

        const data = await this.makeOutlineAndRequests(this.conversationHistory);
        if (data) {
            logger.info('[OK] Force analysis completed, sending to renderer');
            this.sendToRenderer('summary-update', data);

            // Notify callback
            if (this.onAnalysisComplete) {
                this.onAnalysisComplete(data);
            }
            return data;
        } else {
            logger.warn('[ERROR] Force analysis returned no data');
            return null;
        }
    }
}

module.exports = SummaryService; 

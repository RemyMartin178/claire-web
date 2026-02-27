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

    addConversationTurn(speaker, text) {
        const conversationText = `${speaker.toLowerCase()}: ${text.trim()}`;
        this.conversationHistory.push(conversationText);
        logger.info(`[CHAT] Added conversation text: ${conversationText}`);
        logger.info(`📈 Total conversation history: ${this.conversationHistory.length} texts`);

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
            // ✅ Skip Firestore touch for temporary sessions
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

Analyse la conversation et fournis un résumé très structuré. Formate ta réponse EXACTEMENT avec ces 4 sections Markdown :

**Title**
Génère un titre de 3 à 5 mots maximum, centré uniquement sur les mots-clés (comme les titres courts de ChatGPT). N'utilise jamais de phrases d'introduction (par exemple évite "La discussion porte sur..."). Ton titre doit juste être le sujet traité (ex: "Plan marketing Q3", "Bug d'affichage iOS").

## Résumé
- (Premier point clé)
- (Deuxième point clé)

## À retenir
- ❓ (Première question suggérée concernant la conversation)
- ❓ (Deuxième question suggérée)
- ❓ (Troisième question suggérée)

## Notes
- **(Nom du sujet premier)**
  - (Détail)
  - (Détail)
- **(Nom du sujet deuxième)**
  - (Détail)

Rédige le contenu dans la langue principale de la conversation. Sois toujours extrêmement concis, factuel et utile.`,
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

            const responseText = completion.content;
            logger.info(`[OK] Analysis response received: ${responseText}`);
            const structuredData = this.parseResponseText(responseText, this.previousAnalysisResult);

            // ✅ Skip Firestore save for temporary sessions
            if (this.currentSessionId && !this.currentSessionId.startsWith('temp_session_')) {
                try {
                    summaryRepository.saveSummary({
                        sessionId: this.currentSessionId,
                        text: responseText,
                        tldr: structuredData.summary.join('\n'),
                        bullet_json: JSON.stringify(structuredData.topic.bullets),
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
            topic: { header: '', bullets: [] },
            actions: [],
            followUps: ['✉️ Draft a follow-up email', '[OK] Generate action items', '[TEXT] Show summary'],
        };

        // [Korean comment translated] Result[Korean comment translated] [Korean comment translated] [Korean comment translated] [Korean comment translated]
        if (previousResult) {
            structuredData.topic.header = previousResult.topic.header;
            structuredData.summary = [...previousResult.summary];
        }

        try {
            const lines = responseText.split('\n');
            let currentSection = '';
            let isCapturingTopic = false;
            let topicName = '';

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (trimmedLine.startsWith('**Title**')) {
                    currentSection = 'title';
                    continue;
                } else if (trimmedLine.startsWith('## Summary') || trimmedLine.startsWith('## Action Items') || trimmedLine.startsWith('## Notes') ||
                    trimmedLine.startsWith('## Résumé') || trimmedLine.startsWith('## À retenir') || trimmedLine.startsWith('## A retenir')) {
                    currentSection = 'body';
                    continue;
                }

                if (currentSection === 'title' && trimmedLine && !trimmedLine.startsWith('**Title**')) {
                    // Extract the first non-empty line after **Title** as the title.
                    // Remove leading dashes or asterisks if the AI added them.
                    const cleanTitle = trimmedLine.replace(/^[-*\s]+/, '');
                    if (cleanTitle && !structuredData.summary.length) {
                        structuredData.summary.push(cleanTitle);
                        // structuredData.summary[0] will be used as the short `tldr` Title.
                    }
                }
            }

            // [Korean comment translated] [Korean comment translated] [Korean comment translated]
            const defaultActions = ['✨ Que dois-je dire ?', '💡 Suggérer des questions'];
            defaultActions.forEach(action => {
                if (!structuredData.actions.includes(action)) {
                    structuredData.actions.push(action);
                }
            });

            // [Korean comment translated] [Korean comment translated] [Korean comment translated]
            structuredData.actions = structuredData.actions.slice(0, 5);

            // [Korean comment translated] Validation [Korean comment translated] [Korean comment translated] Data [Korean comment translated]
            if (structuredData.summary.length === 0 && previousResult) {
                structuredData.summary = previousResult.summary;
            }
            if (structuredData.topic.bullets.length === 0 && previousResult) {
                structuredData.topic.bullets = previousResult.topic.bullets;
            }
        } catch (error) {
            logger.error('Error occurred:', { error });
            // [Korean comment translated] [Korean comment translated] [Korean comment translated] Result [Korean comment translated]
            return (
                previousResult || {
                    summary: [],
                    topic: { header: 'Analysis in progress', bullets: [] },
                    actions: ['✨ What should I say next?', '[CHAT] Suggest follow-up questions'],
                    followUps: ['✉️ Draft a follow-up email', '[OK] Generate action items', '[TEXT] Show summary'],
                }
            );
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
            length === 2 ||  // Second update after 2 messages ✅
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
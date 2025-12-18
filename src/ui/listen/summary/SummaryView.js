import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { ThemeMixin } from '../../mixins/ThemeMixin.js';

export class SummaryView extends ThemeMixin(LitElement) {
    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        /* Inherit font styles from parent */

        /* highlight.js [Korean comment translated] [Korean comment translated] */
        .insights-container pre {
            background: var(--background-secondary, #f8f9fa) !important;
            border-radius: 8px !important;
            padding: 12px !important;
            margin: 8px 0 !important;
            overflow-x: auto !important;
            border: 1px solid var(--border-light, #e5e7eb) !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
            box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05)) !important;
        }

        .insights-container code {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace !important;
            font-size: 12px !important;
            background: transparent !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
            color: var(--text-primary, #1f2937) !important;
        }

        .insights-container pre code {
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
            display: block !important;
        }

        .insights-container p code {
            background: var(--background-tertiary, #f1f3f4) !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            color: var(--interactive-primary, #2563eb) !important;
            border: 1px solid var(--border-light, #e5e7eb) !important;
        }

        /* Light theme syntax highlighting */
        .hljs-keyword {
            color: #7c3aed !important;
        }
        .hljs-string {
            color: #059669 !important;
        }
        .hljs-comment {
            color: #6b7280 !important;
        }
        .hljs-number {
            color: #dc2626 !important;
        }
        .hljs-function {
            color: #2563eb !important;
        }
        .hljs-variable {
            color: #0891b2 !important;
        }
        .hljs-built_in {
            color: #ea580c !important;
        }
        .hljs-title {
            color: #2563eb !important;
        }
        .hljs-attr {
            color: #2563eb !important;
        }
        .hljs-tag {
            color: #7c3aed !important;
        }

        .insights-container {
            overflow-y: auto;
            padding: 16px 20px 20px 20px;
            position: relative;
            z-index: 1;
            min-height: 150px;
            max-height: 600px;
            flex: 1;
            background: transparent; /* Même style que AskView - transparent pour cohérence */
            border-radius: 12px;
            border: none;
            box-shadow: none;
            opacity: var(--window-opacity, 1.0);
        }

        /* Visibility handled by parent component */

        .insights-container::-webkit-scrollbar {
            width: 6px;
        }
        .insights-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }
        .insights-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }
        .insights-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        insights-title {
            color: #FFFFFF;
            font-size: 16px;
            font-weight: 600;
            font-family: 'Helvetica Neue', sans-serif;
            margin: 16px 0 12px 0;
            display: block;
            border-bottom: 2px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 4px;
        }

        .insights-container h4 {
            color: #FFFFFF;
            font-size: 14px;
            font-weight: 600;
            margin: 16px 0 10px 0;
            padding: 6px 12px;
            border-radius: 6px;
            background: transparent;
            cursor: default;
            border-left: 3px solid rgba(255, 255, 255, 0.3);
        }

        .insights-container h4:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .insights-container h4:first-child {
            margin-top: 0;
        }

        .outline-item {
            color: #FFFFFF;
            font-size: 13px;
            line-height: 1.5;
            margin: 6px 0;
            padding: 8px 12px;
            border-radius: 6px;
            background: transparent;
            transition: all 0.15s ease;
            cursor: pointer;
            word-wrap: break-word;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .outline-item:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateX(2px);
        }

        .request-item {
            color: #FFFFFF;
            font-size: 13px;
            line-height: 1.4;
            margin: 6px 0;
            padding: 8px 12px;
            border-radius: 6px;
            background: transparent;
            cursor: default;
            word-wrap: break-word;
            transition: all 0.15s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .request-item.clickable {
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .request-item.clickable:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateX(2px);
        }

        /* Markdown content styling - white text on transparent */
        .markdown-content {
            color: #FFFFFF;
            font-size: 13px;
            line-height: 1.6;
            margin: 6px 0;
            padding: 10px 14px;
            border-radius: 8px;
            background: transparent;
            cursor: pointer;
            word-wrap: break-word;
            transition: all 0.15s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .markdown-content:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateX(3px);
        }

        .markdown-content p {
            margin: 6px 0;
            color: #FFFFFF;
        }

        .markdown-content ul,
        .markdown-content ol {
            margin: 8px 0;
            padding-left: 20px;
        }

        .markdown-content li {
            margin: 4px 0;
            color: #FFFFFF;
        }

        .markdown-content a {
            color: rgba(147, 197, 253, 1);
            text-decoration: none;
            font-weight: 500;
        }

        .markdown-content a:hover {
            text-decoration: underline;
            color: rgba(191, 219, 254, 1);
        }

        .markdown-content strong {
            font-weight: 600;
            color: #FFFFFF;
        }

        .markdown-content em {
            font-style: italic;
            color: rgba(255, 255, 255, 0.7);
        }

        .empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            min-height: 200px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
            font-style: italic;
            background: transparent;
            border-radius: 8px;
            border: 2px dashed rgba(255, 255, 255, 0.2);
        }
    `;

    static properties = {
        structuredData: { type: Object },
        isVisible: { type: Boolean },
        hasCompletedRecording: { type: Boolean },
        windowOpacity: { type: Number },
    };

    constructor() {
        super();
        this.structuredData = {
            summary: [],
            topic: { header: '', bullets: [] },
            actions: [],
            followUps: [],
        };
        this.isVisible = true;
        this.hasCompletedRecording = false;
        this.windowOpacity = 1.0;

        // [Korean comment translated] [Korean comment translated] Initialize
        this.marked = null;
        this.hljs = null;
        this.isLibrariesLoaded = false;
        this.DOMPurify = null;
        this.isDOMPurifyLoaded = false;

        this.loadLibraries();
    }

    connectedCallback() {
        super.connectedCallback();
        if (window.api) {
            window.api.summaryView.onSummaryUpdate((event, data) => {
                this.structuredData = data;
                this.requestUpdate();
            });

            // Listen for opacity changes
            window.api.on('window-opacity-changed', (event, opacity) => {
                this.windowOpacity = opacity;
                this.updateOpacityStyle();
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.api) {
            window.api.summaryView.removeAllSummaryUpdateListeners();
        }
    }

    // Handle session reset from parent
    resetAnalysis() {
        this.structuredData = {
            summary: [],
            topic: { header: '', bullets: [] },
            actions: [],
            followUps: [],
        };
        this.requestUpdate();
    }

    updateOpacityStyle() {
        this.style.setProperty('--window-opacity', this.windowOpacity);
        this.requestUpdate();
    }

    async loadLibraries() {
        try {
            if (!window.marked) {
                await this.loadScript('../../assets/marked-4.3.0.min.js');
            }

            if (!window.hljs) {
                await this.loadScript('../../ui/assets/highlight-11.9.0.min.js');
            }

            if (!window.DOMPurify) {
                await this.loadScript('../../ui/assets/dompurify-3.0.7.min.js');
            }

            this.marked = window.marked;
            this.hljs = window.hljs;
            this.DOMPurify = window.DOMPurify;

            if (this.marked && this.hljs) {
                this.marked.setOptions({
                    highlight: (code, lang) => {
                        if (lang && this.hljs.getLanguage(lang)) {
                            try {
                                return this.hljs.highlight(code, { language: lang }).value;
                            } catch (err) {
                                console.warn('Highlight error:', err);
                            }
                        }
                        try {
                            return this.hljs.highlightAuto(code).value;
                        } catch (err) {
                            console.warn('Auto highlight error:', err);
                        }
                        return code;
                    },
                    breaks: true,
                    gfm: true,
                    pedantic: false,
                    smartypants: false,
                    xhtml: false,
                });

                this.isLibrariesLoaded = true;
                console.log('Markdown libraries loaded successfully');
            }

            if (this.DOMPurify) {
                this.isDOMPurifyLoaded = true;
                console.log('DOMPurify loaded successfully in SummaryView');
            }
        } catch (error) {
            console.error('Failed to load libraries:', error);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    parseMarkdown(text) {
        if (!text) return '';

        if (!this.isLibrariesLoaded || !this.marked) {
            return text;
        }

        try {
            return this.marked(text);
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return text;
        }
    }

    handleMarkdownClick(originalText) {
        this.handleRequestClick(originalText);
    }

    renderMarkdownContent() {
        if (!this.isLibrariesLoaded || !this.marked) {
            return;
        }

        const markdownElements = this.shadowRoot.querySelectorAll('[data-markdown-id]');
        markdownElements.forEach(element => {
            const originalText = element.getAttribute('data-original-text');
            if (originalText) {
                try {
                    let parsedHTML = this.parseMarkdown(originalText);

                    if (this.isDOMPurifyLoaded && this.DOMPurify) {
                        parsedHTML = this.DOMPurify.sanitize(parsedHTML);

                        if (this.DOMPurify.removed && this.DOMPurify.removed.length > 0) {
                            console.warn('Unsafe content detected in insights, showing plain text');
                            element.textContent = '[WARNING] ' + originalText;
                            return;
                        }
                    }

                    element.innerHTML = parsedHTML;
                } catch (error) {
                    console.error('Error rendering markdown for element:', error);
                    element.textContent = originalText;
                }
            }
        });
    }

    async handleRequestClick(requestText) {
        console.log('[FIRE] Analysis request clicked:', requestText);

        if (window.api) {
            try {
                const result = await window.api.summaryView.sendQuestionFromSummary(requestText);

                if (result.success) {
                    console.log('[OK] Question sent to AskView successfully');
                } else {
                    console.error('[ERROR] Failed to send question to AskView:', result.error);
                }
            } catch (error) {
                console.error('[ERROR] Error in handleRequestClick:', error);
            }
        }
    }

    getSummaryText() {
        const data = this.structuredData || { summary: [], topic: { header: '', bullets: [] }, actions: [] };
        let sections = [];

        if (data.summary && data.summary.length > 0) {
            sections.push(`Current Summary:\n${data.summary.map(s => `• ${s}`).join('\n')}`);
        }

        if (data.topic && data.topic.header && data.topic.bullets.length > 0) {
            sections.push(`\n${data.topic.header}:\n${data.topic.bullets.map(b => `• ${b}`).join('\n')}`);
        }

        if (data.actions && data.actions.length > 0) {
            sections.push(`\nActions:\n${data.actions.map(a => `▸ ${a}`).join('\n')}`);
        }

        if (data.followUps && data.followUps.length > 0) {
            sections.push(`\nFollow-Ups:\n${data.followUps.map(f => `▸ ${f}`).join('\n')}`);
        }

        return sections.join('\n\n').trim();
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        this.renderMarkdownContent();
    }

    render() {
        if (!this.isVisible) {
            return html`<div style="display: none;"></div>`;
        }

        const data = this.structuredData || {
            summary: [],
            topic: { header: '', bullets: [] },
            actions: [],
        };

        const hasAnyContent = data.summary.length > 0 || data.topic.bullets.length > 0 || data.actions.length > 0;

        return html`
            <div class="insights-container">
                ${!hasAnyContent
                    ? html`<div class="empty-state">Aucune analyse pour l'instant...</div>`
                    : html`
                        <insights-title>Résumé actuel</insights-title>
                        ${data.summary.length > 0
                            ? data.summary
                                  .slice(0, 5)
                                  .map(
                                      (bullet, index) => html`
                                          <div
                                              class="markdown-content"
                                              data-markdown-id="summary-${index}"
                                              data-original-text="${bullet}"
                                              @click=${() => this.handleMarkdownClick(bullet)}
                                          >
                                              ${bullet}
                                          </div>
                                      `
                                  )
                            : html` <div class="request-item">No content yet...</div> `}
                        ${data.topic.header
                            ? html`
                                  <insights-title>${data.topic.header}</insights-title>
                                  ${data.topic.bullets
                                      .slice(0, 3)
                                      .map(
                                          (bullet, index) => html`
                                              <div
                                                  class="markdown-content"
                                                  data-markdown-id="topic-${index}"
                                                  data-original-text="${bullet}"
                                                  @click=${() => this.handleMarkdownClick(bullet)}
                                              >
                                                  ${bullet}
                                              </div>
                                          `
                                      )}
                              `
                            : ''}
                        ${data.actions.length > 0
                            ? html`
                                  <insights-title>Actions</insights-title>
                                  ${data.actions
                                      .slice(0, 5)
                                      .map(
                                          (action, index) => html`
                                              <div
                                                  class="markdown-content"
                                                  data-markdown-id="action-${index}"
                                                  data-original-text="${action}"
                                                  @click=${() => this.handleMarkdownClick(action)}
                                              >
                                                  ${action}
                                              </div>
                                          `
                                      )}
                              `
                            : ''}
                        ${this.hasCompletedRecording && data.followUps && data.followUps.length > 0
                            ? html`
                                  <insights-title>Follow-Ups</insights-title>
                                  ${data.followUps.map(
                                      (followUp, index) => html`
                                          <div
                                              class="markdown-content"
                                              data-markdown-id="followup-${index}"
                                              data-original-text="${followUp}"
                                              @click=${() => this.handleMarkdownClick(followUp)}
                                          >
                                              ${followUp}
                                          </div>
                                      `
                                  )}
                              `
                            : ''}
                    `}
            </div>
        `;
    }
}

customElements.define('summary-view', SummaryView); 
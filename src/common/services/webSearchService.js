'use strict';

const { createLogger } = require('./logger');
const logger = createLogger('WebSearchService');

/**
 * Perform a web search and return results ready to inject into an LLM prompt.
 * Primary: Tavily API (TAVILY_API_KEY in .env)
 * Fallback: DuckDuckGo Instant Answer (no key, limited)
 */
async function search(query) {
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (tavilyKey) {
        return searchTavily(query, tavilyKey);
    }

    logger.warn('[WebSearch] No TAVILY_API_KEY found, falling back to DuckDuckGo');
    return searchDuckDuckGo(query);
}

async function searchTavily(query, apiKey) {
    const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

    const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: 'basic',
            max_results: 5,
            include_answer: true,
        }),
    });

    if (!res.ok) {
        throw new Error(`Tavily API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    return {
        query,
        source: 'tavily',
        answer: data.answer || null,
        results: (data.results || []).map(r => ({
            title: r.title || '',
            url: r.url || '',
            content: (r.content || '').slice(0, 400),
        })),
    };
}

async function searchDuckDuckGo(query) {
    const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
    const encoded = encodeURIComponent(query);
    const res = await fetch(
        `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`,
        { headers: { 'User-Agent': 'Claire-App/1.0' } }
    );

    if (!res.ok) {
        throw new Error(`DuckDuckGo API error: ${res.status}`);
    }

    const data = await res.json();
    const results = [];

    if (data.AbstractText) {
        results.push({
            title: data.AbstractSource || 'Résumé',
            url: data.AbstractURL || '',
            content: data.AbstractText.slice(0, 400),
        });
    }

    (data.RelatedTopics || [])
        .filter(t => t.Text && t.FirstURL)
        .slice(0, 4)
        .forEach(t => {
            results.push({
                title: t.Text.split(' - ')[0] || '',
                url: t.FirstURL,
                content: t.Text.slice(0, 300),
            });
        });

    return {
        query,
        source: 'duckduckgo',
        answer: data.AbstractText || null,
        results,
    };
}

/**
 * Format search results as a block to inject into the LLM system prompt.
 */
function formatResultsForPrompt({ query, results, answer, source }) {
    if (!results.length && !answer) return null;

    const lines = [
        `**RÉSULTATS DE RECHERCHE WEB** (source : ${source}, requête : "${query}")`,
        '---',
    ];

    if (answer) {
        lines.push(`Réponse directe : ${answer}\n`);
    }

    results.forEach((r, i) => {
        lines.push(`[${i + 1}] **${r.title}**`);
        if (r.url) lines.push(`URL : ${r.url}`);
        lines.push(r.content);
        lines.push('');
    });

    lines.push('---');
    lines.push('⚠️ Utilise ces résultats pour répondre. Cite les sources ([1], [2]…) si pertinent. Si une information semble obsolète, indique-le.');

    return lines.join('\n');
}

module.exports = { search, formatResultsForPrompt };

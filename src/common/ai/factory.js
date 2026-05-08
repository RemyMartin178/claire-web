// factory.js

/**
 * @typedef {object} ModelOption
 * @property {string} id 
 * @property {string} name
 */

/**
 * @typedef {object} Provider
 * @property {string} name
 * @property {() => any} handler
 * @property {ModelOption[]} llmModels
 * @property {ModelOption[]} sttModels
 */

/**
 * @type {Object.<string, Provider>}
 */
const PROVIDERS = {
  // Primary provider — all AI/STT routed through Claire's server-side keys
  'claire-api': {
      name: 'Claire',
      handler: () => require("./providers/claire-api"),
      llmModels: [
          { id: 'gpt-4o', name: 'GPT-4o' },
      ],
      sttModels: [
          { id: 'u3-rt-pro', name: 'Universal-3 RT Pro (Best)' },
          { id: 'u3-rt',     name: 'Universal-3 RT' },
          { id: 'nano',      name: 'Nano (Fast)' },
      ],
  },

  // Legacy providers kept for BYOK (bring-your-own-key) fallback only
  'openai': {
      name: 'OpenAI (BYOK)',
      handler: () => require("./providers/openai"),
      llmModels: [
          { id: 'gpt-4.1', name: 'GPT-4.1' },
      ],
      sttModels: [],
  },
  'assemblyai': {
      name: 'AssemblyAI (BYOK)',
      handler: () => require("./providers/assemblyai"),
      llmModels: [],
      sttModels: [
          { id: 'u3-rt-pro', name: 'Universal-3 RT Pro (Best)' },
          { id: 'u3-rt',     name: 'Universal-3 RT' },
          { id: 'nano',      name: 'Nano (Fast)' },
      ],
  },
  'anthropic': {
      name: 'Anthropic (BYOK)',
      handler: () => require("./providers/anthropic"),
      llmModels: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      ],
      sttModels: [],
  },
};

function sanitizeModelId(model) {
  return (typeof model === 'string') ? model : model;
}

function createSTT(provider, opts) {
  const handler = PROVIDERS[provider]?.handler();
  if (!handler?.createSTT) {
      throw new Error(`STT not supported for provider: ${provider}`);
  }
  if (opts && opts.model) {
    opts = { ...opts, model: sanitizeModelId(opts.model) };
  }
  return handler.createSTT(opts);
}

function createLLM(provider, opts) {
  const handler = PROVIDERS[provider]?.handler();
  if (!handler?.createLLM) {
      throw new Error(`LLM not supported for provider: ${provider}`);
  }
  if (opts && opts.model) {
    opts = { ...opts, model: sanitizeModelId(opts.model) };
  }
  return handler.createLLM(opts);
}

function createStreamingLLM(provider, opts) {
  const handler = PROVIDERS[provider]?.handler();
  if (!handler?.createStreamingLLM) {
      throw new Error(`Streaming LLM not supported for provider: ${provider}`);
  }
  if (opts && opts.model) {
    opts = { ...opts, model: sanitizeModelId(opts.model) };
  }
  return handler.createStreamingLLM(opts);
}

function getProviderClass(providerId) {
    const providerConfig = PROVIDERS[providerId];
    if (!providerConfig) return null;
    
    // The handler function returns the module, from which we get the class.
    const module = providerConfig.handler();
    
    // Map provider IDs to their actual exported class names
    const classNameMap = {
        'claire-api': null,
        'openai': 'OpenAIProvider',
        'anthropic': 'AnthropicProvider',
        'assemblyai': 'AssemblyAIProvider',
    };
    
    const className = classNameMap[providerId]; // Fixed: use providerId instead of undefined actualProviderId
    return className ? module[className] : null;
}

function getAvailableProviders() {
  const stt = [];
  const llm = [];
  for (const [id, provider] of Object.entries(PROVIDERS)) {
      if (provider.sttModels.length > 0) stt.push(id);
      if (provider.llmModels.length > 0) llm.push(id);
  }
  return { stt: [...new Set(stt)], llm: [...new Set(llm)] };
}

module.exports = {
  PROVIDERS,
  createSTT,
  createLLM,
  createStreamingLLM,
  getProviderClass,
  getAvailableProviders,
};
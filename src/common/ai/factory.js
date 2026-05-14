// factory.js — claire-api est le seul provider

const PROVIDERS = {
  'claire-api': {
    name: 'Claire',
    handler: () => require('./providers/claire-api'),
    llmModels: [
      { id: 'gpt-4o',      name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
    sttModels: [
      { id: 'u3-rt-pro', name: 'Universal-3 RT Pro (Best)' },
      { id: 'u3-rt',     name: 'Universal-3 RT' },
      { id: 'nano',      name: 'Nano (Fast)' },
    ],
  },
};

function createSTT(provider, opts) {
  const mod = PROVIDERS[provider]?.handler();
  if (!mod?.createSTT) throw new Error(`STT not supported for provider: ${provider}`);
  return mod.createSTT(opts);
}

function createLLM(provider, opts) {
  const mod = PROVIDERS[provider]?.handler();
  if (!mod?.createLLM) throw new Error(`LLM not supported for provider: ${provider}`);
  return mod.createLLM(opts);
}

function createStreamingLLM(provider, opts) {
  const mod = PROVIDERS[provider]?.handler();
  if (!mod?.createStreamingLLM) throw new Error(`Streaming LLM not supported for provider: ${provider}`);
  return mod.createStreamingLLM(opts);
}

function getAvailableProviders() {
  return { stt: ['claire-api'], llm: ['claire-api'] };
}

module.exports = { PROVIDERS, createSTT, createLLM, createStreamingLLM, getAvailableProviders };

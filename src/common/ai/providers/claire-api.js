// claire-api.js — routes all AI/STT through api.clairia.app (keys stay server-side)
const WebSocket = require('ws');
const { createLogger } = require('../../services/logger.js');

const logger = createLogger('ClaireAPI');

const API_URL = process.env.CLAIRE_API_URL || 'https://api.clairia.app';

async function getIdToken() {
  try {
    const authService = require('../../services/authService.js');
    const user = authService.currentUser;
    if (user && typeof user.getIdToken === 'function') {
      return await user.getIdToken();
    }
    logger.warn('[ClaireAPI] No authenticated Firebase user — cannot mint ID token');
  } catch (e) {
    logger.warn('[ClaireAPI] Could not get Firebase ID token:', e.message);
  }
  return null;
}

async function authHeaders() {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── LLM ────────────────────────────────────────────────────────────────────

function createLLM({ model = 'gpt-4o' } = {}) {
  return {
    generateContent: async ({ messages, temperature = 0.7, max_tokens } = {}) => {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ messages, model, temperature, max_tokens, stream: false }),
      });
      if (!res.ok) throw new Error(`ClaireAPI LLM error: ${res.status}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? '';
    },
  };
}

function createStreamingLLM({ model = 'gpt-4o' } = {}) {
  return {
    streamChat: async function* ({ messages, temperature = 0.7, signal } = {}) {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ messages, model, temperature, stream: true }),
        signal,
      });
      if (!res.ok) throw new Error(`ClaireAPI streaming error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') return;
          try {
            const json = JSON.parse(raw);
            const text = json.choices?.[0]?.delta?.content;
            if (text) yield text;
          } catch { /* partial line */ }
        }
      }
    },
  };
}

// ─── STT ────────────────────────────────────────────────────────────────────

async function fetchAssemblyAIToken() {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/api/token/assemblyai`, {
    headers,
  });
  if (!res.ok) throw new Error(`Failed to get AssemblyAI token: ${res.status}`);
  const { token } = await res.json();
  return token;
}

async function createRecallSdkUpload({ window, metadata = {} } = {}) {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/api/recall/sdk-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ window, metadata }),
  });
  if (!res.ok) throw new Error(`Failed to create Recall SDK upload: ${res.status}`);
  return await res.json();
}

async function createSTT({
  language = 'multi',
  sampleRate = 24000,
  callbacks = {},
  model = 'u3-rt-pro',
} = {}) {
  logger.info('[STT] Fetching AssemblyAI streaming token from Claire API...');
  const token = await fetchAssemblyAIToken();
  logger.info('[STT] Token received — connecting WebSocket directly to AssemblyAI');

  const url = new URL('wss://streaming.assemblyai.com/v3/ws');
  url.searchParams.append('sample_rate', sampleRate.toString());
  if (model) url.searchParams.append('speech_model', model);

  const ws = new WebSocket(url.toString(), {
    headers: { Authorization: token },
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('AssemblyAI WebSocket open timeout (10s)'));
    }, 10_000);

    ws.on('open', () => {
      clearTimeout(timeout);
      logger.info('[STT] AssemblyAI WebSocket connected');
      resolve({
        sendRealtimeInput: (buf) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(buf);
        },
        close: () => {
          if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'client closed');
        },
      });
    });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.error) { logger.error('[STT] AssemblyAI error:', msg.error); return; }

      const isTurn = msg.type === 'Turn' || msg.message_type === 'Turn';
      const isPartial = msg.type === 'PartialTranscript' || msg.message_type === 'PartialTranscript';
      const isFinal = msg.type === 'FinalTranscript' || msg.message_type === 'FinalTranscript' || (isTurn && msg.turn_is_formatted);
      const transcript = msg.text || msg.transcript || '';

      if ((isTurn || isPartial || isFinal) && transcript.trim()) {
        callbacks.onmessage?.({ ...msg, provider: 'assemblyai', transcript, is_final: isFinal });
      }
    });

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      callbacks.onclose?.({ code, reason: reason.toString() });
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      logger.error('[STT] WebSocket error:', err.message);
      callbacks.onerror?.(err);
      reject(err);
    });
  });
}

module.exports = { createLLM, createStreamingLLM, createSTT, createRecallSdkUpload };

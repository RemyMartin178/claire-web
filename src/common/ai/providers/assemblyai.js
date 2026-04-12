// providers/assemblyai.js

const WebSocket = require('ws');
const { createLogger } = require('../../services/logger.js');

const logger = createLogger('AssemblyAI');

/**
 * AssemblyAI Provider.
 */
class AssemblyAIProvider {
    /**
     * Valide la clé API AssemblyAI
     * @param {string} key - API Key
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    static async validateApiKey(key) {
        if (!key || typeof key !== 'string') {
            return { success: false, error: 'Invalid AssemblyAI API key format.' };
        }
        try {
            // Un appel d'authentification simple pour valider la clé (par exemple /v2/transcript)
            const response = await fetch('https://api.assemblyai.com/v2/transcript', {
                headers: { 'Authorization': key }
            });
            // 401 Unauthorized => failed. Anything else (like 405 Method Not Allowed or 200) => success
            if (response.status === 401) {
                return { success: false, error: 'Unauthorized: Invalid AssemblyAI API Key' };
            }
            return { success: true };
        } catch (error) {
            logger.error('Network error during AssemblyAI key validation:', { error });
            return { success: false, error: error.message || 'A network error occurred during validation.' };
        }
    }
}

function createSTT({
    apiKey,
    language = 'multi',
    sampleRate = 24000,
    callbacks = {},
    model = 'u3-rt-pro',
  }) {
    logger.info('[STT] AssemblyAI: Initialisation avec:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
        language,
        sampleRate,
        model
    });
    
    // Par exemple: wss://streaming.assemblyai.com/v3/ws?sample_rate=24000&speech_model=u3-rt-pro
    const url = new URL('wss://streaming.assemblyai.com/v3/ws');
    url.searchParams.append('sample_rate', sampleRate.toString());
    
    if (model) {
      url.searchParams.append('speech_model', model);
    }

    const ws = new WebSocket(url.toString(), {
      headers: { Authorization: apiKey }
    });
  
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => {
        ws.terminate();
        reject(new Error('AssemblyAI open timeout (10 s)'));
      }, 5_000); 
  
      ws.on('open', () => {
        clearTimeout(to);
        logger.info('[STT] AssemblyAI: Connexion WebSocket établie - transcription en temps réel activée');
        resolve({
          sendRealtimeInput: (buf) => {
            if (ws.readyState === WebSocket.OPEN) {
              // AssemblyAI v3 (/v3/ws) expects raw binary PCM frames, NOT JSON
              ws.send(buf);
            }
          },
          close: () => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1000, 'client closed');
            }
          },
        });
      });
  
      ws.on('message', raw => {
        let msg;
        try { 
          msg = JSON.parse(raw.toString()); 
        } catch (error) { 
          logger.warn('Failed to parse AssemblyAI message:', error);
          return; 
        }

        if (msg.error) {
          logger.error('AssemblyAI WebSocket Error from server:', msg.error);
          return;
        }
        
        // Handle AssemblyAI message types
        if (msg.message_type === 'PartialTranscript' || msg.type === 'PartialTranscript' || msg.message_type === 'Turn' || msg.type === 'Turn') {
          // Both `message_type` (v2) and `type` (v3) are commonly used
          // Note: In v3, it can be type: "Turn". The user script used msg.type === "Turn"
          // We translate these to standard callbacks
          
          let transcript = msg.text || msg.transcript || "";
          let isFinal = false;

          if (msg.message_type === 'FinalTranscript' || msg.type === 'FinalTranscript') {
            isFinal = true;
          }

          // v3: Turn with turn_is_formatted=true means the turn is finalized
          // Check both msg.type and msg.message_type to cover v2/v3
          if (msg.type === 'Turn' || msg.message_type === 'Turn') {
            if (msg.turn_is_formatted) {
              isFinal = true;
            }
          }

          if (transcript && transcript.trim().length > 0) {
            // Spread msg FIRST so our explicit fields (is_final) win
            callbacks.onmessage?.({
              ...msg,
              provider: 'assemblyai',
              transcript,
              is_final: isFinal,
              confidence: isFinal ? (msg.confidence || 0.95) : undefined,
            });
          }
        } 
      });
  
      ws.on('close', (code, reason) => {
        logger.info('AssemblyAI WebSocket closed:', { code, reason: reason.toString() });
        callbacks.onclose?.({ code, reason: reason.toString() });
      });
  
      ws.on('error', err => {
        clearTimeout(to);
        logger.error('AssemblyAI WebSocket error:', {
          error: err.message,
          readyState: ws.readyState
        });
        callbacks.onerror?.(err);
        reject(err);
      });
    });
}
  
function createLLM(opts) {
  logger.warn('LLM not supported.');
  return { generateContent: async () => { throw new Error("AssemblyAI does not support LLM functionality."); } };
}

function createStreamingLLM(opts) {
  logger.warn('Streaming LLM not supported.');
  return { streamChat: async () => { throw new Error("AssemblyAI does not support Streaming LLM functionality."); } };
}

module.exports = {
  AssemblyAIProvider,
  createSTT,
  createLLM,
  createStreamingLLM
};

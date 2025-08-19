// src/bridge/internalBridge.js
const { EventEmitter } = require('events');

// FeatureCore와 WindowCore를 잇는 내부 이벤트 버스
const internalBridge = new EventEmitter();
module.exports = internalBridge;

// 예시 이벤트
// internalBridge.on('content-protection-changed', (enabled) => {
//   // windowManager에서 처리
// });

// In-memory store for pending-session verifiers (desktop)
const pendingSessionVerifiers = new Map();

// API for other parts of the app to set/get verifier
internalBridge.on('mobile:setCodeVerifier', ({ session_id, code_verifier }) => {
  if (session_id && code_verifier) {
    pendingSessionVerifiers.set(session_id, code_verifier);
  }
});

internalBridge.on('mobile:getCodeVerifier', ({ session_id, reply }) => {
  const v = pendingSessionVerifiers.get(session_id);
  if (typeof reply === 'function') reply(v);
});
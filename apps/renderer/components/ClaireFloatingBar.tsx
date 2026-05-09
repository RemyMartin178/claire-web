'use client';

import { useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  MessageSquare,
  Eye,
  EyeOff,
  MoreHorizontal,
  X,
} from 'lucide-react';

/**
 * Floating control bar.
 * The wrapper div is draggable (-webkit-app-region: drag) — children opt out.
 */
export default function ClaireFloatingBar() {
  const [listening, setListening] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!listening) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2"
      style={{ pointerEvents: 'none' }}
    >
      {/* THE BAR */}
      <div
        className="claire-floating-bar"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Logo / app name pill */}
        <button
          className="claire-floating-btn !w-auto px-2.5 gap-1.5 text-xs font-medium text-white"
          onClick={() => setHidden((h) => !h)}
        >
          <span className="claire-glow-dot !size-4" />
          <span>Claire</span>
        </button>

        {/* Listen toggle */}
        {!listening ? (
          <button
            className="claire-floating-btn text-white"
            onClick={() => setListening(true)}
          >
            <Mic size={14} strokeWidth={2.2} />
          </button>
        ) : (
          <button
            className="claire-floating-btn-rec gap-1.5"
            onClick={() => setListening(false)}
          >
            <span className="claire-rec-dot !size-2" />
            <span className="font-mono tabular-nums">{formatTime(seconds)}</span>
          </button>
        )}

        {/* Ask / chat toggle (the iconic blue button) */}
        <button
          className="claire-primary-button h-7 px-3 text-xs font-medium rounded-full inline-flex items-center gap-1.5"
          onClick={() => setChatOpen((o) => !o)}
        >
          <MessageSquare size={12} strokeWidth={2.4} />
          <span>Ask</span>
          <span className="claire-kbd ml-0.5">⌘</span>
          <span className="claire-kbd">↵</span>
        </button>

        {/* Hide toggle */}
        <button
          className="claire-floating-btn text-white"
          onClick={() => setHidden((h) => !h)}
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        {/* More menu */}
        <button
          className="claire-floating-btn text-white"
        >
          <MoreHorizontal size={14} />
        </button>

        {/* Close (smaller utility variant) */}
        <button
          className="claire-floating-btn-sm ml-0.5"
        >
          <X size={12} />
        </button>
      </div>

      {/* CHAT PANEL (opens below the bar) */}
      {chatOpen && (
        <div
          className="claire-chat-panel"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex flex-col gap-2 px-2 pt-2 max-h-[400px] overflow-y-auto">
            {/* Sample assistant + user messages */}
            <div className="w-full flex justify-start">
              <div className="claire-msg-assistant">
                Bonjour ! Pose-moi une question sur ce que tu vois ou écoutes.
              </div>
            </div>
            <div className="w-full flex justify-end">
              <div className="claire-msg-user">
                Quels sont les points clés de la réunion ?
              </div>
            </div>
          </div>

          <div className="claire-chat-footer">
            <input
              type="text"
              placeholder="Pose ta question..."
              className="flex-1 bg-transparent outline-none text-xs text-white placeholder:text-white/40 px-1"
            />
            <button className="claire-floating-btn-sm">
              <MicOff size={12} />
            </button>
            <button className="claire-primary-button h-6 w-6 rounded-full inline-flex items-center justify-center">
              <span className="text-xs">↑</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

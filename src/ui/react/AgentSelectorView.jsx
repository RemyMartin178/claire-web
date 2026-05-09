import React, { useState, useEffect, useCallback } from 'react';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
.asv-root {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--surface-elevated, #ffffff);
  color: var(--text-primary, #1f2937);
  font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  border-radius: 12px;
}
.asv-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--surface-elevated, #ffffff);
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  z-index: 1;
  border: 1px solid var(--border-light, #e5e7eb);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
}
.asv-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light, #e5e7eb);
  background: var(--background-secondary, #f8f9fa);
  flex-shrink: 0;
}
.asv-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin: 0;
  text-align: center;
}
.asv-agents-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  margin: 0;
  max-height: 320px;
  min-height: 200px;
}
.asv-agents-list::-webkit-scrollbar { width: 6px; }
.asv-agents-list::-webkit-scrollbar-track { background: var(--background-secondary, #f8f9fa); border-radius: 3px; }
.asv-agents-list::-webkit-scrollbar-thumb { background: var(--border-medium, #d1d5db); border-radius: 3px; }
.asv-agents-list::-webkit-scrollbar-thumb:hover { background: var(--border-strong, #9ca3af); }

.asv-agent-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
  position: relative;
  border-bottom: 1px solid var(--border-light, #e5e7eb);
  width: 100%;
  text-align: left;
  box-sizing: border-box;
}
.asv-agent-item:last-child { border-bottom: none; }
.asv-agent-item:hover { background: var(--background-secondary, #f8f9fa); }
.asv-agent-item.asv-selected { background: var(--interactive-primary-light, #eff6ff); }
.asv-agent-item.asv-selected:hover { background: var(--interactive-primary-light, #eff6ff); }

.asv-agent-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--background-secondary, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--border-light, #e5e7eb);
}
.asv-agent-icon img { width: 100%; height: 100%; object-fit: cover; }
.asv-agent-icon-fallback { font-weight: 600; color: var(--text-primary, #1f2937); font-size: 12px; }
.asv-agent-item.asv-selected .asv-agent-icon { background: var(--interactive-primary-hover, #1d4ed8); }

.asv-agent-info { flex: 1; min-width: 0; }
.asv-agent-name { font-size: 13px; font-weight: 500; color: var(--text-primary, #1f2937); margin: 0 0 2px 0; line-height: 1.2; }
.asv-agent-description {
  font-size: 11px; color: var(--text-secondary, #6b7280); margin: 0; line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}

.asv-selected-indicator {
  position: absolute;
  right: 16px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--interactive-primary, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.asv-agent-item.asv-selected .asv-selected-indicator { opacity: 1; }
.asv-checkmark { width: 10px; height: 10px; stroke: white; stroke-width: 2; fill: none; }

.asv-loading-state, .asv-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
}
.asv-empty-state { flex-direction: column; text-align: center; }
.asv-empty-state-text { font-size: 14px; margin-bottom: 8px; }
.asv-empty-state-subtext { font-size: 12px; color: var(--text-tertiary, #9ca3af); }

body.has-glass .asv-root { background: rgba(20,20,20,0.95) !important; backdrop-filter: blur(20px) !important; color: rgba(255,255,255,0.9) !important; border-radius: 12px !important; }
body.has-glass .asv-title { color: rgba(255,255,255,0.9) !important; }
body.has-glass .asv-container { background: rgba(20,20,20,0.95) !important; backdrop-filter: blur(20px) !important; border: 1px solid rgba(255,255,255,0.2) !important; }
body.has-glass .asv-header { background: rgba(255,255,255,0.05) !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
body.has-glass .asv-agent-item { border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
body.has-glass .asv-agent-item:hover { background: rgba(255,255,255,0.1) !important; }
body.has-glass .asv-agent-item.asv-selected { background: rgba(37,99,235,0.3) !important; }
body.has-glass .asv-agent-name { color: rgba(255,255,255,0.9) !important; }
body.has-glass .asv-agent-description { color: rgba(255,255,255,0.6) !important; }
body.has-glass .asv-agent-icon { border: 1px solid rgba(255,255,255,0.2) !important; background: rgba(255,255,255,0.1) !important; }
body.has-glass .asv-agent-icon-fallback { color: rgba(255,255,255,0.9) !important; }
`;

const AGENT_AVATARS = ['alexander', 'alya', 'amy', 'fred', 'henry', 'raj'];

function getAgentAvatar(agent) {
  const agentId = String(agent.id || agent.name || 'default');
  const hash = agentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const avatarIndex = hash % AGENT_AVATARS.length;
  return `../assets/avatars/${AGENT_AVATARS[avatarIndex]}.svg`;
}

function getAgentInitials(name) {
  return name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();
}

export default function AgentSelectorView() {
  const [personalities, setPersonalities] = useState([]);
  const [selectedPersonality, setSelectedPersonality] = useState(null);
  const [loading, setLoading] = useState(true);

  injectStyles('agent-selector-view-styles', CSS);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      if (window.api && window.api.askView && window.api.askView.getPersonalities) {
        const loaded = await window.api.askView.getPersonalities();
        setPersonalities(Array.isArray(loaded) ? loaded : []);
        if (window.api.askView.getCurrentPersonality) {
          const current = await window.api.askView.getCurrentPersonality();
          setSelectedPersonality(current);
        }
      } else {
        setPersonalities([]);
      }
    } catch (error) {
      console.error('[AgentSelectorView] Failed to load agents:', error);
      setPersonalities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();

    const handleAgentSelectionChanged = (event) => {
      setSelectedPersonality(event.detail.agent);
    };

    window.addEventListener('agent-selection-changed', handleAgentSelectionChanged);
    return () => {
      window.removeEventListener('agent-selection-changed', handleAgentSelectionChanged);
    };
  }, [loadAgents]);

  const handleMouseEnter = useCallback(() => {
    if (window.api && window.api.mainHeader && window.api.mainHeader.cancelHideAgentSelectorWindow) {
      window.api.mainHeader.cancelHideAgentSelectorWindow();
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (window.api && window.api.mainHeader && window.api.mainHeader.hideAgentSelectorWindow) {
      window.api.mainHeader.hideAgentSelectorWindow();
    }
  }, []);

  const selectAgent = useCallback(async (personality) => {
    try {
      if (window.api?.sharedState?.patch || window.api?.askView?.setPersonality) {
        const result = window.api.sharedState?.patch
          ? await window.api.sharedState.patch({ activePersonality: personality.id })
          : await window.api.askView.setPersonality(personality.id);
        if (result?.success !== false) {
          setSelectedPersonality(personality);
          if (window.api.mainHeader && window.api.mainHeader.hideAgentSelectorWindow) {
            window.api.mainHeader.hideAgentSelectorWindow();
          }
          window.dispatchEvent(new CustomEvent('agent-selection-changed', {
            detail: { agent: personality }
          }));
        } else {
          console.error('[AgentSelectorView] Failed to set personality:', result.error);
        }
      }
    } catch (error) {
      console.error('[AgentSelectorView] Failed to select agent:', error);
    }
  }, []);

  return (
    <div className="asv-root" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="asv-container">
        <div className="asv-header">
          <div className="asv-title">Select AI Agent</div>
        </div>

        {loading ? (
          <div className="asv-loading-state">Loading agents...</div>
        ) : personalities.length === 0 ? (
          <div className="asv-empty-state">
            <div className="asv-empty-state-text">No agents available</div>
            <div className="asv-empty-state-subtext">Check your backend connection</div>
          </div>
        ) : (
          <div className="asv-agents-list">
            {personalities.map(personality => (
              <button
                key={personality.id}
                className={`asv-agent-item${selectedPersonality?.id === personality.id ? ' asv-selected' : ''}`}
                onClick={() => selectAgent(personality)}
              >
                <div className="asv-agent-icon">
                  <AgentAvatar personality={personality} />
                </div>
                <div className="asv-agent-info">
                  <div className="asv-agent-name">{personality.name}</div>
                  <div className="asv-agent-description">
                    {personality.description || 'No description available'}
                  </div>
                </div>
                <div className="asv-selected-indicator">
                  <svg className="asv-checkmark" viewBox="0 0 12 12">
                    <path d="M2 6L5 9L10 3" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentAvatar({ personality }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = getAgentAvatar(personality);

  if (imgFailed) {
    return <span className="asv-agent-icon-fallback">{getAgentInitials(personality.name)}</span>;
  }

  return (
    <img
      src={src}
      alt={personality.name}
      onError={() => setImgFailed(true)}
    />
  );
}

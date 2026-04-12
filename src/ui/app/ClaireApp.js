import React from 'react';
import ReactDOM from 'react-dom/client';

import '../listen/audioCore/renderer.js';

import ListenView from '../react/ListenView.jsx';
import AskView from '../react/AskView.jsx';
import SettingsView from '../react/SettingsView.jsx';
import AgentSelectorView from '../react/AgentSelectorView.jsx';
import ShortcutSettingsView from '../react/ShortcutSettingsView.jsx';
import ToastNotification from '../react/ToastNotification.jsx';

function ClaireApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view') || 'listen';

    React.useEffect(() => {
        document.body.classList.add('claire-app');

        if (window.api && window.api.claireApp && window.api.claireApp.onClickThroughToggled) {
            window.api.claireApp.onClickThroughToggled((_, isEnabled) => {
                // click-through state managed by main process window; no DOM action needed
                console.log('[ClaireApp] click-through toggled:', isEnabled);
            });
        } else {
            console.warn('[ClaireApp] window.api.claireApp not available - running in demo/test mode');
        }

        return () => {
            if (window.api && window.api.claireApp && window.api.claireApp.removeAllClickThroughListeners) {
                window.api.claireApp.removeAllClickThroughListeners();
            }
        };
    }, []);

    let content;
    switch (view) {
        case 'listen':
            content = React.createElement(ListenView);
            break;
        case 'ask':
            content = React.createElement(AskView);
            break;
        case 'settings':
            content = React.createElement(SettingsView);
            break;
        case 'agent-selector':
            content = React.createElement(AgentSelectorView);
            break;
        case 'shortcut-settings':
            content = React.createElement(ShortcutSettingsView);
            break;
        default:
            content = React.createElement('div', null, `Unknown view: ${view}`);
    }

    return React.createElement(React.Fragment, null,
        content,
        React.createElement(ToastNotification)
    );
}

const container = document.getElementById('claire');
const root = ReactDOM.createRoot(container);
root.render(React.createElement(ClaireApp));

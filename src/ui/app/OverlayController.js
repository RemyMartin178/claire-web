import React from 'react';
import ReactDOM from 'react-dom/client';

// Set up audio capture for the listen panel (same as ClaireApp.js does for the listen view)
import '../listen/audioCore/renderer.js';

// Register capture state handler for overlay mode (renderer.js skips it when view != 'listen')
if (window.api?.renderer?.onChangeListenCaptureState) {
    window.api.renderer.onChangeListenCaptureState((_event, { status }) => {
        if (status === 'stop') {
            window.pickleGlass?.stopCapture?.();
        } else {
            window.pickleGlass?.startCapture?.();
        }
    });
}

import OverlayRoot from '../react/OverlayRoot.jsx';

const container = document.getElementById('overlay-root');
const root = ReactDOM.createRoot(container);
root.render(React.createElement(OverlayRoot));

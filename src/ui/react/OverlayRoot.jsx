import React, { useState, useEffect, useRef, useCallback } from 'react';
import MainHeader from './MainHeader.jsx';
import ListenView from './ListenView.jsx';
import AskView from './AskView.jsx';
import SettingsView from './SettingsView.jsx';
import AgentSelectorView from './AgentSelectorView.jsx';
import ToastNotification from './ToastNotification.jsx';
import UpgradeOverlay from './UpgradeOverlay.jsx';

// ─── Layout helpers ────────────────────────────────────────────────────────────

const PAD = 8;

function computeLayout(pillX, pillY, pillW, pillH, screenW, screenH, panels, panelSizes) {
    const result = {};
    const headerBottomRel = pillY + pillH;
    const headerCenterX = pillX + pillW / 2;

    const spaceBelow = screenH - headerBottomRel;
    const spaceAbove = pillY;
    const strategy = spaceBelow >= 400 ? 'below' : spaceAbove >= 400 ? 'above' : spaceBelow > spaceAbove ? 'below' : 'above';

    const askVis = panels.ask;
    const listenVis = panels.listen;

    if (askVis || listenVis) {
        const askW = panelSizes.ask?.w ?? 670;
        const askH = panelSizes.ask?.h ?? 168;
        const listenW = panelSizes.listen?.w ?? 400;
        const listenH = panelSizes.listen?.h ?? 400;

        if (askVis && listenVis) {
            let askXRel = headerCenterX - askW / 2;
            let listenXRel = askXRel - listenW - PAD;
            if (listenXRel < PAD) { listenXRel = PAD; askXRel = listenXRel + listenW + PAD; }
            if (askXRel + askW > screenW - PAD) { askXRel = screenW - PAD - askW; listenXRel = askXRel - listenW - PAD; }
            if (strategy === 'above') {
                const bottom = pillY - PAD;
                result.ask = { x: Math.round(askXRel), y: Math.round(bottom - askH) };
                result.listen = { x: Math.round(listenXRel), y: Math.round(bottom - listenH) };
            } else {
                const top = headerBottomRel + PAD;
                result.ask = { x: Math.round(askXRel), y: Math.round(top) };
                result.listen = { x: Math.round(listenXRel), y: Math.round(top) };
            }
        } else {
            const name = askVis ? 'ask' : 'listen';
            const w = name === 'ask' ? askW : listenW;
            const h = name === 'ask' ? askH : listenH;
            let xRel = Math.max(PAD, Math.min(screenW - w - PAD, headerCenterX - w / 2));
            const yPos = strategy === 'above' ? pillY - PAD - h : headerBottomRel + PAD;
            result[name] = { x: Math.round(xRel), y: Math.round(yPos) };
        }
    }

    if (panels.settings) {
        const settingsW = panelSizes.settings?.w ?? 240;
        const settingsH = panelSizes.settings?.h ?? 500;
        const y = pillY + pillH + 5;
        let x;
        if (panels.ask && result.ask) {
            // Ask is open: place Settings to the right of Ask panel
            x = result.ask.x + (panelSizes.ask?.w ?? 670) + PAD;
        } else if (panels.listen && result.listen) {
            // Listen is open: place Settings to the right of Listen panel
            x = result.listen.x + (panelSizes.listen?.w ?? 400) + PAD;
        } else {
            x = pillX + pillW - settingsW + 170;
        }
        result.settings = {
            x: Math.round(Math.max(PAD, Math.min(screenW - settingsW - PAD, x))),
            y: Math.round(Math.max(PAD, Math.min(screenH - settingsH - PAD, y))),
        };
    }

    if (panels['agent-selector']) {
        result['agent-selector'] = {
            x: Math.round(pillX + 50),
            y: Math.round(pillY + pillH + 10),
        };
    }

    return result;
}

// ─── Panel animation helpers ───────────────────────────────────────────────────

const injectStyles = (id, css) => {
    if (!document.getElementById(id)) {
        const s = document.createElement('style');
        s.id = id; s.textContent = css;
        document.head.appendChild(s);
    }
};

const PANEL_CSS = `
@keyframes overlay-panel-in {
  0%   { opacity: 0; transform: translateY(-10px) scale(0.95); }
  70%  { transform: translateY(2px) scale(1.01); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes overlay-panel-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-8px) scale(0.96); }
}
.overlay-panel-entering { animation: overlay-panel-in 0.26s cubic-bezier(0.34,1.3,0.64,1) both; }
.overlay-panel-exiting  { animation: overlay-panel-out 0.18s ease-in both; pointer-events: none !important; }

/* Slide transition for repositioning */
.overlay-panel-common {
  transition: left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

`;

// ─── OverlayRoot ───────────────────────────────────────────────────────────────
//
// Click-through strategy — main-process polling:
//   The main process polls screen.getCursorScreenPoint() at ~60fps and toggles
//   setIgnoreMouseEvents based on hit-rects sent by the renderer.
//   • Cursor over interactive rect  → setIgnoreMouseEvents(false)      [buttons/drag work]
//   • Cursor elsewhere              → setIgnoreMouseEvents(true, {forward:true}) [click-through]
//   No IPC round-trip on click events → zero latency for button presses.



export default function OverlayRoot() {
    const screenW = window.screen.width;
    const screenH = window.screen.height;

    const initPos = { x: Math.round((screenW - 202) / 2), y: 21 };

    const [pillPos, setPillPos] = useState(initPos);
    const pillPosRef = useRef(initPos);
    const pillContainerRef = useRef(null);

    const [pillSize, setPillSize] = useState({ w: 202, h: 58 });
    const pillSizeRef = useRef({ w: 202, h: 58 });

    // Panel refs for hit-rect polling
    const listenPanelRef       = useRef(null);
    const askPanelRef          = useRef(null);
    const settingsPanelRef     = useRef(null);
    const agentSelectorPanelRef = useRef(null);

    injectStyles('overlay-panel-anim', PANEL_CSS);

    const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);

    const [panels, setPanels] = useState({
        header: true,             // floating bar — visible by default, can be hidden when a session ends
        listen: false,
        ask: false,
        settings: false,
        'agent-selector': false,
    });
    const panelsRef = useRef({ header: true, listen: false, ask: false, settings: false, 'agent-selector': false });
    const [panelAnimClass, setPanelAnimClass] = useState({});

    const [panelSizes, setPanelSizes] = useState({
        ask: { w: 670, h: 168 },
        listen: { w: 400, h: 400 },
        settings: { w: 240, h: 500 },
        'agent-selector': { w: 320, h: 380 },
    });
    const panelSizesRef = useRef({
        ask: { w: 670, h: 168 },
        listen: { w: 400, h: 400 },
        settings: { w: 240, h: 500 },
        'agent-selector': { w: 320, h: 380 },
    });

    // ── Hit-rect polling helpers ───────────────────────────────────────────────
    // Collects absolute screen rects of all interactive elements and sends them
    // to the main process so it can toggle setIgnoreMouseEvents at 60fps.
    const updateHitRects = useCallback(() => {
        if (!window.api?.overlay?.setHitRects) return;
        const rects = [];
        const addRef = (ref) => {
            if (!ref.current) return;
            const r = ref.current.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                rects.push({
                    x: Math.round(r.left + window.screenX),
                    y: Math.round(r.top  + window.screenY),
                    width:  Math.round(r.width),
                    height: Math.round(r.height),
                });
            }
        };
        addRef(pillContainerRef);
        addRef(listenPanelRef);
        addRef(askPanelRef);
        addRef(settingsPanelRef);
        addRef(agentSelectorPanelRef);
        // Toast notifications must be interactive — include their rect
        const toastWrapper = document.querySelector('.toast-wrapper');
        if (toastWrapper) {
            const r = toastWrapper.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                rects.push({
                    x: Math.round(r.left + window.screenX),
                    y: Math.round(r.top  + window.screenY),
                    width:  Math.round(r.width),
                    height: Math.round(r.height),
                });
            }
        }
        window.api.overlay.setHitRects(rects);
    }, []);

    const handleDragStart = useCallback(() => {
        window.api?.overlay?.setDragging?.(true);
    }, []);

    // Dynamically track the actual size of the pill to avoid clamping issues
    useEffect(() => {
        if (!pillContainerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                const rect = entry.target.getBoundingClientRect();
                const newW = Math.round(rect.width);
                const newH = Math.round(rect.height);
                if (newW > 0 && newH > 0) {
                    // Only update if changes by at least 2px to ignore subpixel noise
                    if (Math.abs(pillSizeRef.current.w - newW) > 2 || Math.abs(pillSizeRef.current.h - newH) > 2) {
                        const size = { w: newW, h: newH };
                        pillSizeRef.current = size;
                        setPillSize(size);
                        requestAnimationFrame(updateHitRects);
                    }
                }
            }
        });
        
        // Let React mount first
        const timer = setTimeout(() => {
            if (pillContainerRef.current && pillContainerRef.current.firstElementChild) {
                observer.observe(pillContainerRef.current.firstElementChild);
            }
        }, 100);
        
        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [updateHitRects]);

    // ── IPC: panel visibility & resize ────────────────────────────────────────
    useEffect(() => {
        if (!window.api) return;

        const onPanelVisibility = (_, { name, visible }) => {
            if (visible) {
                panelsRef.current = { ...panelsRef.current, [name]: true };
                setPanels(prev => ({ ...prev, [name]: true }));
                setPanelAnimClass(prev => ({ ...prev, [name]: 'overlay-panel-entering' }));
            } else {
                setPanelAnimClass(prev => ({ ...prev, [name]: 'overlay-panel-exiting' }));
                setTimeout(() => {
                    panelsRef.current = { ...panelsRef.current, [name]: false };
                    setPanels(prev => ({ ...prev, [name]: false }));
                    setPanelAnimClass(prev => { const n = { ...prev }; delete n[name]; return n; });
                }, 200);
            }
        };
        window.api.on('overlay:panel-visibility', onPanelVisibility);

        const onPanelResize = (_, { name, width, height }) => {
            if (!name) return;
            panelSizesRef.current = {
                ...panelSizesRef.current,
                [name]: { w: width ?? panelSizesRef.current[name]?.w, h: height ?? panelSizesRef.current[name]?.h },
            };
            setPanelSizes(prev => ({
                ...prev,
                [name]: { w: width ?? prev[name]?.w, h: height ?? prev[name]?.h },
            }));
            // hit-rects are updated by the useEffect below, after DOM commit
        };
        window.api.on('overlay:panel-resize', onPanelResize);

        // FIX: Local direct DOM events from panels running inside the same overlay window
        const onLocalPanelResize = (e) => {
            const { name, width, height } = e.detail;
            onPanelResize(null, { name, width, height });
            // Since this is native DOM, we also trigger updateHitRects directly
            requestAnimationFrame(updateHitRects);
        };
        window.addEventListener('local-panel-resize', onLocalPanelResize);

        // Toast notifications change their size — refresh hit-rects when they appear/disappear
        const onToastChanged = () => requestAnimationFrame(updateHitRects);
        window.addEventListener('claire-toast-changed', onToastChanged);

        const onLocalPanelClose = (e) => {
            const name = e.detail?.name;
            if (!name) return;
            setPanelAnimClass(prev => ({ ...prev, [name]: 'overlay-panel-exiting' }));
            setTimeout(() => {
                panelsRef.current = { ...panelsRef.current, [name]: false };
                setPanels(prev => ({ ...prev, [name]: false }));
                setPanelAnimClass(prev => { const n = { ...prev }; delete n[name]; return n; });
                requestAnimationFrame(updateHitRects);
                // Notify backend only when the listen panel closes
                if (name === 'listen') {
                    window.api?.mainHeader?.sendListenButtonClick?.('Done');
                }
            }, 200);
        };
        window.addEventListener('local-panel-close', onLocalPanelClose);

        const onUpgradeOpen = () => setShowUpgradeOverlay(true);
        window.addEventListener('upgrade-overlay-open', onUpgradeOpen);

        window.api.overlay?.getInitialState?.().then(state => {
            if (state?.pillX != null && state?.pillY != null) {
                const pos = { x: state.pillX, y: state.pillY };
                pillPosRef.current = pos;
                setPillPos(pos);
            }
            requestAnimationFrame(updateHitRects);
        }).catch(() => {});

        // Send initial rects once the first render is painted
        requestAnimationFrame(updateHitRects);

        return () => {
            window.removeEventListener('local-panel-resize', onLocalPanelResize);
            window.removeEventListener('local-panel-close', onLocalPanelClose);
            window.removeEventListener('claire-toast-changed', onToastChanged);
            window.removeEventListener('upgrade-overlay-open', onUpgradeOpen);
        };
    }, [updateHitRects]);

    // ── Hit-rects : mise à jour après chaque commit DOM ───────────────────────
    // useEffect garantit que les refs des panels sont valides (divs dans le DOM)
    useEffect(() => {
        updateHitRects();
    }, [panels, panelSizes, pillPos, updateHitRects]);

    // When upgrade overlay is open, the whole screen must be interactive
    useEffect(() => {
        if (!window.api?.overlay?.setHitRects) return;
        if (showUpgradeOverlay) {
            window.api.overlay.setHitRects([{ x: 0, y: 0, width: screenW, height: screenH }]);
        } else {
            requestAnimationFrame(updateHitRects);
        }
    }, [showUpgradeOverlay, screenW, screenH, updateHitRects]);

    // ── Drag: direct DOM at 60fps, single React update on drop ────────────────
    const handlePosChange = useCallback((x, y) => {
        const cx = Math.max(0, Math.min(x, screenW - pillSizeRef.current.w));
        const cy = Math.max(0, Math.min(y, screenH - pillSizeRef.current.h));
        pillPosRef.current = { x: cx, y: cy };
        if (pillContainerRef.current) {
            pillContainerRef.current.style.left = cx + 'px';
            pillContainerRef.current.style.top  = cy + 'px';
        }
        // Move panels in real-time without React re-render
        const pos = computeLayout(cx, cy, pillSizeRef.current.w, pillSizeRef.current.h, screenW, screenH, panelsRef.current, panelSizesRef.current);
        if (listenPanelRef.current && pos.listen) {
            listenPanelRef.current.style.left = pos.listen.x + 'px';
            listenPanelRef.current.style.top  = pos.listen.y + 'px';
        }
        if (askPanelRef.current && pos.ask) {
            askPanelRef.current.style.left = pos.ask.x + 'px';
            askPanelRef.current.style.top  = pos.ask.y + 'px';
        }
        if (settingsPanelRef.current && pos.settings) {
            settingsPanelRef.current.style.left = pos.settings.x + 'px';
            settingsPanelRef.current.style.top  = pos.settings.y + 'px';
        }
        if (agentSelectorPanelRef.current && pos['agent-selector']) {
            agentSelectorPanelRef.current.style.left = pos['agent-selector'].x + 'px';
            agentSelectorPanelRef.current.style.top  = pos['agent-selector'].y + 'px';
        }
    }, [screenW, screenH]);

    const handleDragEnd = useCallback((x, y) => {
        const cx = Math.max(0, Math.min(x, screenW - pillSizeRef.current.w));
        const cy = Math.max(0, Math.min(y, screenH - pillSizeRef.current.h));
        const pos = { x: cx, y: cy };
        pillPosRef.current = pos;
        setPillPos(pos);
        window.api?.overlay?.notifyPillPosition?.(cx, cy);
        window.api?.overlay?.setDragging?.(false);
        requestAnimationFrame(updateHitRects);
    }, [screenW, screenH, updateHitRects]);

    const positions = computeLayout(
        pillPos.x, pillPos.y, pillSizeRef.current.w, pillSizeRef.current.h,
        screenW, screenH, panels, panelSizes
    );

    const panelStyle = (pos, size, zIndex = 900) => ({
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        pointerEvents: 'auto',
        zIndex,
        overflow: 'hidden',
        borderRadius: 16,
    });

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            overflow: 'hidden',
            background: 'transparent',
            pointerEvents: 'none', // transparent areas pass events to apps below
        }}>
            {panels.header && (
                <div
                    ref={pillContainerRef}
                    style={{
                        position: 'absolute',
                        left: pillPos.x,
                        top: pillPos.y,
                        pointerEvents: 'auto', // pill is fully interactive
                        zIndex: 1000,
                    }}
                >
                    <MainHeader
                        overlayMode={true}
                        overlayPosX={pillPos.x}
                        overlayPosY={pillPos.y}
                        onOverlayPosChange={handlePosChange}
                        onOverlayDragEnd={handleDragEnd}
                        onOverlayDragStart={handleDragStart}
                    />
                </div>
            )}

            {panels.listen && positions.listen && (
                <div ref={listenPanelRef} className={`overlay-panel-common ${panelAnimClass.listen || ''}`} style={panelStyle(positions.listen, panelSizes.listen)}>
                    <ListenView />
                </div>
            )}

            {panels.ask && positions.ask && (
                <div ref={askPanelRef} className={`overlay-panel-common ${panelAnimClass.ask || ''}`} style={panelStyle(positions.ask, panelSizes.ask)}>
                    <AskView />
                </div>
            )}

            {panels.settings && positions.settings && (
                <div ref={settingsPanelRef} className={`overlay-panel-common ${panelAnimClass.settings || ''}`} style={panelStyle(positions.settings, panelSizes.settings, 950)}>
                    <SettingsView />
                </div>
            )}

            {panels['agent-selector'] && positions['agent-selector'] && (
                <div ref={agentSelectorPanelRef} className={`overlay-panel-common ${panelAnimClass['agent-selector'] || ''}`} style={{
                    position: 'absolute',
                    left: positions['agent-selector'].x,
                    top: positions['agent-selector'].y,
                    width: panelSizes['agent-selector']?.w ?? 320,
                    height: panelSizes['agent-selector']?.h ?? 380,
                    pointerEvents: 'auto',
                    zIndex: 950,
                    overflow: 'hidden',
                    borderRadius: 12,
                }}>
                    <AgentSelectorView />
                </div>
            )}

            <ToastNotification />

            {showUpgradeOverlay && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'auto' }}>
                    <UpgradeOverlay onClose={() => setShowUpgradeOverlay(false)} />
                </div>
            )}
        </div>
    );
}

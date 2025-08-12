import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class MainHeader extends LitElement {
    static properties = {
        isTogglingSession: { type: Boolean, state: true },
        shortcuts: { type: Object, state: true },
        listenSessionStatus: { type: String, state: true },
    };

    static styles = css`
        :host {
            display: flex;
            transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s ease-out;
        }

        :host(.hiding) {
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }

        :host(.showing) {
            animation: slideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        :host(.sliding-in) {
            animation: fadeIn 0.2s ease-out forwards;
        }

        :host(.hidden) {
            opacity: 0;
            transform: translateY(-150%) scale(0.85);
            pointer-events: none;
        }


        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        .header {
            -webkit-app-region: drag;
            width: max-content;
            height: 40px;
            padding: 6px 10px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            justify-content: space-between;
            align-items: center;
            display: inline-flex;
            box-sizing: border-box;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
        }

        .header::before { display: none; }

        .header::after { display: none; }

        .listen-button {
            -webkit-app-region: no-drag;
            height: 28px;
            padding: 0 12px;
            background: transparent;
            border-radius: 10px;
            justify-content: center;
            width: auto;
            align-items: center;
            gap: 6px;
            display: flex;
            border: 1px solid transparent;
            cursor: pointer;
            position: relative;
        }

        .listen-button:disabled {
            cursor: default;
            opacity: 0.8;
        }

        .listen-button.active { background: rgba(215, 0, 0, 0.18); }
        .listen-button.active:hover { background: rgba(255, 20, 20, 0.22); }

        .listen-button.paused { background: rgba(128, 128, 128, 0.3); }
        .listen-button.paused:hover { background: rgba(150, 150, 150, 0.4); }

        .listen-button.done {
            background-color: #d70000;
            transition: background-color 0.15s ease;
        }

        .listen-button.done .action-text-content {
            color: white;
        }
        
        .listen-button.done .listen-icon svg rect,
        .listen-button.done .listen-icon svg path {
            fill: white;
        }

        .listen-button.done:hover {
            background-color: #ff0000;
        }

        .listen-button:hover { background: rgba(255, 255, 255, 0.10); }

        .sound-level-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 8px;
            opacity: 0.8;
        }

        .sound-bar {
            animation: soundWave 1.5s ease-in-out infinite;
        }

        .sound-bar-1 {
            animation-delay: 0s;
        }

        .sound-bar-2 {
            animation-delay: 0.2s;
        }

        .sound-bar-3 {
            animation-delay: 0.4s;
        }

        @keyframes soundWave {
            0%, 100% {
                opacity: 0.4;
                transform: scaleY(0.6);
            }
            50% {
                opacity: 1;
                transform: scaleY(1.2);
            }
        }

        .listen-button::before,
        .listen-button::after { display: none; }

        .listen-button.done::after {
            display: none;
        }

        .loading-dots {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .loading-dots span {
            width: 6px;
            height: 6px;
            background-color: white;
            border-radius: 50%;
            animation: pulse 1.4s infinite ease-in-out both;
        }
        .loading-dots span:nth-of-type(1) {
            animation-delay: -0.32s;
        }
        .loading-dots span:nth-of-type(2) {
            animation-delay: -0.16s;
        }
        @keyframes pulse {
            0%, 80%, 100% {
                opacity: 0.2;
            }
            40% {
                opacity: 1.0;
            }
        }

        .header-actions {
            -webkit-app-region: no-drag;
            height: 28px;
            box-sizing: border-box;
            justify-content: flex-start;
            align-items: center;
            gap: 9px;
            display: flex;
            padding: 0 10px;
            border-radius: 8px;
            transition: background 0.15s ease;
        }

        .header-actions:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .ask-action {
            margin-left: 4px;
        }

        .action-button,
        .action-text {
            padding-bottom: 1px;
            justify-content: center;
            align-items: center;
            gap: 10px;
            display: flex;
        }

        .action-text-content {
            color: white;
            font-size: 12px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500; /* Medium */
            word-wrap: break-word;
        }

        .icon-container {
            justify-content: flex-start;
            align-items: center;
            gap: 4px;
            display: flex;
        }

        .icon-container.ask-icons svg,
        .icon-container.showhide-icons svg {
            width: 12px;
            height: 12px;
        }

        .listen-icon svg {
            width: 12px;
            height: 11px;
            position: relative;
            top: 1px;
        }

        .icon-box {
            color: white;
            font-size: 12px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 13%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .settings-button {
            -webkit-app-region: no-drag;
            padding: 5px;
            border-radius: 50%;
            background: transparent;
            transition: background 0.15s ease;
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .settings-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .settings-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3px;
        }

        .settings-icon svg {
            width: 16px;
            height: 16px;
        }
        /* ────────────────[ GLASS BYPASS ]─────────────── */
        :host-context(body.has-glass) .header,
        :host-context(body.has-glass) .listen-button,
        :host-context(body.has-glass) .header-actions,
        :host-context(body.has-glass) .settings-button {
            background: transparent !important;
            filter: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
        }
        :host-context(body.has-glass) .icon-box {
            background: transparent !important;
            border: none !important;
        }

        :host-context(body.has-glass) .header::before,
        :host-context(body.has-glass) .header::after,
        :host-context(body.has-glass) .listen-button::before,
        :host-context(body.has-glass) .listen-button::after {
            display: none !important;
        }

        :host-context(body.has-glass) .header-actions:hover,
        :host-context(body.has-glass) .settings-button:hover,
        :host-context(body.has-glass) .listen-button:hover::before {
            background: transparent !important;
        }
        :host-context(body.has-glass) * {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
        }

        :host-context(body.has-glass) .header,
        :host-context(body.has-glass) .listen-button,
        :host-context(body.has-glass) .header-actions,
        :host-context(body.has-glass) .settings-button,
        :host-context(body.has-glass) .icon-box {
            border-radius: 0 !important;
        }
        :host-context(body.has-glass) {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            will-change: auto !important;
        }
        `;

    constructor() {
        super();
        this.shortcuts = {};
        this.isVisible = true;
        this.isAnimating = false;
        this.hasSlidIn = false;
        this.settingsHideTimer = null;
        this.isTogglingSession = false;
        this.listenSessionStatus = 'beforeSession';
        this.animationEndTimer = null;
        this.handleAnimationEnd = this.handleAnimationEnd.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.dragState = null;
        this.wasJustDragged = false;
    }

    _getListenButtonText(status) {
        switch (status) {
            case 'beforeSession': return 'Écouter';
            case 'inSession'   : return '';
            case 'paused'      : return '';
            case 'afterSession': return 'Terminé';
            default            : return 'Écouter';
        }
    }

    async handleMouseDown(e) {
        e.preventDefault();

        const initialPosition = await window.api.mainHeader.getHeaderPosition();

        this.dragState = {
            initialMouseX: e.screenX,
            initialMouseY: e.screenY,
            initialWindowX: initialPosition.x,
            initialWindowY: initialPosition.y,
            moved: false,
        };

        window.addEventListener('mousemove', this.handleMouseMove, { capture: true });
        window.addEventListener('mouseup', this.handleMouseUp, { once: true, capture: true });
    }

    handleMouseMove(e) {
        if (!this.dragState) return;

        const deltaX = Math.abs(e.screenX - this.dragState.initialMouseX);
        const deltaY = Math.abs(e.screenY - this.dragState.initialMouseY);
        
        if (deltaX > 3 || deltaY > 3) {
            this.dragState.moved = true;
        }

        const newWindowX = this.dragState.initialWindowX + (e.screenX - this.dragState.initialMouseX);
        const newWindowY = this.dragState.initialWindowY + (e.screenY - this.dragState.initialMouseY);

        window.api.mainHeader.moveHeaderTo(newWindowX, newWindowY);
    }

    handleMouseUp(e) {
        if (!this.dragState) return;

        const wasDragged = this.dragState.moved;

        window.removeEventListener('mousemove', this.handleMouseMove, { capture: true });
        this.dragState = null;

        if (wasDragged) {
            this.wasJustDragged = true;
            setTimeout(() => {
                this.wasJustDragged = false;
            }, 0);
        }
    }

    toggleVisibility() {
        if (this.isAnimating) {
            console.log('[MainHeader] Animation already in progress, ignoring toggle');
            return;
        }
        
        if (this.animationEndTimer) {
            clearTimeout(this.animationEndTimer);
            this.animationEndTimer = null;
        }
        
        this.isAnimating = true;
        
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    hide() {
        this.classList.remove('showing');
        this.classList.add('hiding');
    }
    
    show() {
        this.classList.remove('hiding', 'hidden');
        this.classList.add('showing');
    }
    
    handleAnimationEnd(e) {
        if (e.target !== this) return;
    
        this.isAnimating = false;
    
        if (this.classList.contains('hiding')) {
            this.classList.add('hidden');
            if (window.api) {
                window.api.mainHeader.sendHeaderAnimationFinished('hidden');
            }
        } else if (this.classList.contains('showing')) {
            if (window.api) {
                window.api.mainHeader.sendHeaderAnimationFinished('visible');
            }
        }
    }

    startSlideInAnimation() {
        if (this.hasSlidIn) return;
        this.classList.add('sliding-in');
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener('animationend', this.handleAnimationEnd);

        if (window.api) {

            this._sessionStateTextListener = (event, { success }) => {
                if (success) {
                    // Only change state if we're not manually handling it
                    if (this.listenSessionStatus === 'beforeSession') {
                        this.listenSessionStatus = 'inSession';
                    } else if (this.listenSessionStatus === 'afterSession') {
                        this.listenSessionStatus = 'beforeSession';
                    }
                } else {
                    this.listenSessionStatus = 'beforeSession';
                }
                this.isTogglingSession = false;
            };
            window.api.mainHeader.onListenChangeSessionResult(this._sessionStateTextListener);

            this._shortcutListener = (event, keybinds) => {
                console.log('[MainHeader] Received updated shortcuts:', keybinds);
                this.shortcuts = keybinds;
            };
            window.api.mainHeader.onShortcutsUpdated(this._shortcutListener);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('animationend', this.handleAnimationEnd);
        
        if (this.animationEndTimer) {
            clearTimeout(this.animationEndTimer);
            this.animationEndTimer = null;
        }
        
        if (window.api) {
            if (this._sessionStateTextListener) {
                window.api.mainHeader.removeOnListenChangeSessionResult(this._sessionStateTextListener);
            }
            if (this._shortcutListener) {
                window.api.mainHeader.removeOnShortcutsUpdated(this._shortcutListener);
            }
        }
    }

    showSettingsWindow(element) {
        if (this.wasJustDragged) return;
        if (window.api) {
            console.log(`[MainHeader] showSettingsWindow called at ${Date.now()}`);
            window.api.mainHeader.showSettingsWindow();

        }
    }

    hideSettingsWindow() {
        if (this.wasJustDragged) return;
        if (window.api) {
            console.log(`[MainHeader] hideSettingsWindow called at ${Date.now()}`);
            window.api.mainHeader.hideSettingsWindow();
        }
    }

    async _handleListenClick() {
        if (this.wasJustDragged) return;
        if (this.isTogglingSession) {
            return;
        }

        this.isTogglingSession = true;

        try {
            const listenButtonText = this._getListenButtonText(this.listenSessionStatus);
            
            // Handle state transitions for pause/resume
            if (this.listenSessionStatus === 'inSession') {
                // When pausing, change to paused state
                this.listenSessionStatus = 'paused';
                this.requestUpdate();
            } else if (this.listenSessionStatus === 'paused') {
                // When resuming from paused state, change back to inSession state
                this.listenSessionStatus = 'inSession';
                this.requestUpdate();
            }
            
            // Map UI label (FR) to backend command (EN) expected by main process
            const commandMap = {
                'Écouter': 'Listen',
                'Terminé': 'Done',
                'Listen': 'Listen',
                'Stop': 'Stop',
                'Done': 'Done',
            };
            const commandToSend = commandMap[listenButtonText] || 'Listen';
            if (window.api) {
                await window.api.mainHeader.sendListenButtonClick(commandToSend);
            }
        } catch (error) {
            console.error('IPC invoke for session change failed:', error);
            this.isTogglingSession = false;
        }
    }

    async _handleAskClick() {
        if (this.wasJustDragged) return;

        try {
            if (window.api) {
                await window.api.mainHeader.sendAskButtonClick();
            }
        } catch (error) {
            console.error('IPC invoke for ask button failed:', error);
        }
    }

    async _handleToggleAllWindowsVisibility() {
        if (this.wasJustDragged) return;

        try {
            if (window.api) {
                await window.api.mainHeader.sendToggleAllWindowsVisibility();
            }
        } catch (error) {
            console.error('IPC invoke for all windows visibility button failed:', error);
        }
    }

    async _handleTerminateClick() {
        if (this.wasJustDragged) return;
        if (this.isTogglingSession) {
            return;
        }

        this.isTogglingSession = true;

        try {
            // Force return to initial state
            this.listenSessionStatus = 'beforeSession';
            this.requestUpdate();
            
            if (window.api) {
                await window.api.mainHeader.sendListenButtonClick('Done');
            }
        } catch (error) {
            console.error('IPC invoke for terminate button failed:', error);
        } finally {
            this.isTogglingSession = false;
        }
    }


    renderShortcut(accelerator) {
        if (!accelerator) return html``;

        const keyMap = {
            'Cmd': '⌘', 'Command': '⌘',
            'Ctrl': '⌃', 'Control': '⌃',
            'Alt': '⌥', 'Option': '⌥',
            'Shift': '⇧',
            'Enter': '↵',
            'Backspace': '⌫',
            'Delete': '⌦',
            'Tab': '⇥',
            'Escape': '⎋',
            'Up': '↑', 'Down': '↓', 'Left': '←', 'Right': '→',
            '\\': html`<svg viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:6px; height:12px;"><path d="M1.5 1.3L5.1 10.6" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        };

        const keys = accelerator.split('+');
        return html`${keys.map(key => html`
            <div class="icon-box">${keyMap[key] || key}</div>
        `)}`;
    }

    render() {
        const listenButtonText = this._getListenButtonText(this.listenSessionStatus);
    
        const buttonClasses = {
            active: this.listenSessionStatus === 'inSession',
            paused: this.listenSessionStatus === 'paused',
            done: listenButtonText === 'Terminé',
        };
        const showPauseIcon = this.listenSessionStatus === 'inSession';
        const showPlayIcon = this.listenSessionStatus === 'paused';
        const showStopIcon = listenButtonText === 'Terminé';

        return html`
            <div class="header">
                <button 
                    class="listen-button ${Object.keys(buttonClasses).filter(k => buttonClasses[k]).join(' ')}"
                    @click=${this._handleListenClick}
                    ?disabled=${this.isTogglingSession}
                >
                    ${this.isTogglingSession
                        ? html`
                            <div class="loading-dots">
                                <span></span><span></span><span></span>
                            </div>
                        `
                        : html`
                            ${listenButtonText ? html`
                                <div class="action-text">
                                    <div class="action-text-content">${listenButtonText}</div>
                                </div>
                            ` : ''}
                            <div class="listen-icon">
                                ${showPauseIcon
                                    ? html`
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="6" y="4" width="4" height="16" rx="1" fill="white"/>
                                            <rect x="14" y="4" width="4" height="16" rx="1" fill="white"/>
                                        </svg>
                                    `
                                    : showPlayIcon
                                    ? html`
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <polygon points="5,3 19,12 5,21" fill="white"/>
                                        </svg>
                                    `
                                    : showStopIcon
                                    ? html`
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="6" y="6" width="12" height="12" rx="1" fill="white"/>
                                        </svg>
                                    `
                                    : html`
                                        <svg width="16" height="16" viewBox="0 0 12 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1.69922 2.7515C1.69922 2.37153 2.00725 2.0635 2.38722 2.0635H2.73122C3.11119 2.0635 3.41922 2.37153 3.41922 2.7515V8.2555C3.41922 8.63547 3.11119 8.9435 2.73122 8.9435H2.38722C2.00725 8.9435 1.69922 8.63547 1.69922 8.2555V2.7515Z" fill="white"/>
                                            <path d="M5.13922 1.3755C5.13922 0.995528 5.44725 0.6875 5.82722 0.6875H6.17122C6.55119 0.6875 6.85922 0.995528 6.85922 1.3755V9.6315C6.85922 10.0115 6.55119 10.3195 6.17122 10.3195H5.82722C5.44725 10.3195 5.13922 10.0115 5.13922 9.6315V1.3755Z" fill="white"/>
                                            <path d="M8.57922 3.0955C8.57922 2.71553 8.88725 2.4075 9.26722 2.4075H9.61122C9.99119 2.4075 10.2992 2.71553 10.2992 3.0955V7.9115C10.2992 8.29147 9.99119 8.5995 9.61122 8.5995H9.26722C8.88725 8.5995 8.57922 8.29147 8.57922 7.9115V3.0955Z" fill="white"/>
                                        </svg>
                                    `}
                            </div>
                        `}
                </button>
                
                ${this.listenSessionStatus === 'inSession' ? html`
                    <div class="sound-level-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="4" y="8" width="2" height="8" rx="1" fill="white" class="sound-bar sound-bar-1"/>
                            <rect x="8" y="6" width="2" height="12" rx="1" fill="white" class="sound-bar sound-bar-2"/>
                            <rect x="12" y="4" width="2" height="16" rx="1" fill="white" class="sound-bar sound-bar-3"/>
                        </svg>
                    </div>
                ` : ''}
                
                ${this.listenSessionStatus === 'paused' ? html`
                    <button 
                        class="listen-button done"
                        @click=${() => this._handleTerminateClick()}
                        ?disabled=${this.isTogglingSession}
                    >
                        <div class="action-text">
                            <div class="action-text-content">Terminé</div>
                        </div>
                        <div class="listen-icon">
                            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="9" height="9" rx="1" fill="white"/>
                            </svg>
                        </div>
                    </button>
                ` : ''}

                <div class="header-actions ask-action" @click=${() => this._handleAskClick()}>
                    <div class="action-text">
                        <div class="action-text-content">Demander</div>
                    </div>
                </div>

                <div class="header-actions" @click=${() => this._handleToggleAllWindowsVisibility()}>
                    <div class="action-text">
                        <div class="action-text-content">Cacher</div>
                    </div>
                    <div class="icon-container">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: rgba(255, 255, 255, 0.7);">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>

                <button 
                    class="settings-button"
                    @mouseenter=${(e) => this.showSettingsWindow(e.currentTarget)}
                    @mouseleave=${() => this.hideSettingsWindow()}
                >
                    <div class="settings-icon">
                        <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.0013 3.16406C7.82449 3.16406 7.65492 3.2343 7.5299 3.35932C7.40487 3.48435 7.33464 3.65392 7.33464 3.83073C7.33464 4.00754 7.40487 4.17711 7.5299 4.30213C7.65492 4.42716 7.82449 4.4974 8.0013 4.4974C8.17811 4.4974 8.34768 4.42716 8.47271 4.30213C8.59773 4.17711 8.66797 4.00754 8.66797 3.83073C8.66797 3.65392 8.59773 3.48435 8.47271 3.35932C8.34768 3.2343 8.17811 3.16406 8.0013 3.16406ZM8.0013 7.83073C7.82449 7.83073 7.65492 7.90097 7.5299 8.02599C7.40487 8.15102 7.33464 8.32058 7.33464 8.4974C7.33464 8.67421 7.40487 8.84378 7.5299 8.9688C7.65492 9.09382 7.82449 9.16406 8.0013 9.16406C8.17811 9.16406 8.34768 9.09382 8.47271 8.9688C8.59773 8.84378 8.66797 8.67421 8.66797 8.4974C8.66797 8.32058 8.59773 8.15102 8.47271 8.02599C8.34768 7.90097 8.17811 7.83073 8.0013 7.83073ZM8.0013 12.4974C7.82449 12.4974 7.65492 12.5676 7.5299 12.6927C7.40487 12.8177 7.33464 12.9873 7.33464 13.1641C7.33464 13.3409 7.40487 13.5104 7.5299 13.6355C7.65492 13.7605 7.82449 13.8307 8.0013 13.8307C8.17811 13.8307 8.34768 13.7605 8.47271 13.6355C8.59773 13.5104 8.66797 13.3409 8.66797 13.1641C8.66797 12.9873 8.59773 12.8177 8.47271 12.6927C8.34768 12.5676 8.17811 12.4974 8.0013 12.4974Z" fill="white" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </button>
            </div>
        `;
    }
}

customElements.define('main-header', MainHeader);

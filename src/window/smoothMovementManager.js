const { screen } = require('electron');

class SmoothMovementManager {
    constructor(windowPool) {
        this.windowPool = windowPool;
        this.stepSize = 80;
        this.animationDuration = 300;
        this.headerPosition = { x: 0, y: 0 };
        this.isAnimating = false;
        this.hiddenPosition = null;
        this.lastVisiblePosition = null;
        this.currentDisplayId = null;
        this.animationFrameId = null;

        this.animationTimers = new Map();
        this.activeAnimations = new Set();

        // Utiliser setTimeout au lieu de requestAnimationFrame (pas disponible dans Node.js)
        this.useRequestAnimationFrame = false;

        // Optimisations pour 60 FPS fluides
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = 0;
        this.frameCount = 0;
    }

    /**
     * @param {BrowserWindow} win
     * @returns {boolean}
     */
    _isWindowValid(win) {
        if (!win || win.isDestroyed()) {
            // 해당 창의 타이머가 있으면 정리
            if (this.animationTimers.has(win)) {
                clearTimeout(this.animationTimers.get(win));
                this.animationTimers.delete(win);
            }
            return false;
        }
        return true;
    }

    /**
     *
     * @param {BrowserWindow} win
     * @param {number} targetX
     * @param {number} targetY
     * @param {object} [options]
     * @param {object} [options.sizeOverride]
     * @param {function} [options.onComplete]
     * @param {number} [options.duration]
     */
    animateWindow(win, targetX, targetY, options = {}) {
        if (!this._isWindowValid(win)) {
            if (options.onComplete) options.onComplete();
            return;
        }

        const { sizeOverride, onComplete, duration: animDuration } = options;
        const start = win.getBounds();
        const duration = animDuration || this.animationDuration;
        const { width, height } = sizeOverride || start;

        const animationId = Symbol('window_animation');
        this.activeAnimations.add(animationId);

        let startTime = null;
        let lastUpdateTime = 0;

        const step = (currentTime) => {
            if (!this._isWindowValid(win) || !this.activeAnimations.has(animationId)) {
                this.activeAnimations.delete(animationId);
                if (onComplete) onComplete();
                return;
            }

            if (startTime === null) {
                startTime = currentTime;
                lastUpdateTime = currentTime;
            }

            // Frame rate limiting pour garantir 60 FPS
            const timeSinceLastUpdate = currentTime - lastUpdateTime;
            if (timeSinceLastUpdate < this.frameInterval) {
                setTimeout(() => step(), this.frameInterval);
                return;
            }

            const elapsed = currentTime - startTime;
            const p = Math.min(elapsed / duration, 1);

            // Utiliser une fonction d'easing plus fluide avec optimisation
            let eased;
            if (p < 0.5) {
                const t = p * 2;
                eased = 0.5 * t * t * t;
            } else {
                const t = (p - 0.5) * 2;
                eased = 0.5 + 0.5 * (1 - Math.pow(1 - t, 3));
            }

            // Interpolation ultra-précise pour éviter tout mouvement saccadé
            const x = start.x + (targetX - start.x) * eased;
            const y = start.y + (targetY - start.y) * eased;

            // Utiliser des coordonnées sub-pixel pour plus de fluidité
            win.setBounds({
                x: p >= 1 ? Math.round(x) : x,
                y: p >= 1 ? Math.round(y) : y,
                width,
                height
            });

            lastUpdateTime = currentTime;

            if (p < 1) {
                setTimeout(() => step(), this.frameInterval);
            } else {
                this.activeAnimations.delete(animationId);
                this.layoutManager?.updateLayout();
                if (onComplete) {
                    onComplete();
                }
            }
        };

        setTimeout(() => step(), this.frameInterval);
    }

    fade(win, { from, to, duration = 250, onComplete }) {
        if (!this._isWindowValid(win)) {
          if (onComplete) onComplete();
          return;
        }
        const startOpacity = from ?? win.getOpacity();

        const animationId = Symbol('fade_animation');
        this.activeAnimations.add(animationId);

        let startTime = null;
        let lastUpdateTime = 0;

        const step = (currentTime) => {
            if (!this._isWindowValid(win) || !this.activeAnimations.has(animationId)) {
                this.activeAnimations.delete(animationId);
                if (onComplete) onComplete();
                return;
            }

            if (startTime === null) {
                startTime = currentTime;
                lastUpdateTime = currentTime;
            }

            // Frame rate limiting pour fluidité maximale
            const timeSinceLastUpdate = currentTime - lastUpdateTime;
            if (timeSinceLastUpdate < this.frameInterval) {
                setTimeout(() => step(), this.frameInterval);
                return;
            }

            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing optimisé pour les transitions d'opacité
            const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            win.setOpacity(startOpacity + (to - startOpacity) * eased);

            lastUpdateTime = currentTime;

            if (progress < 1) {
                setTimeout(() => step(), this.frameInterval);
            } else {
                this.activeAnimations.delete(animationId);
                win.setOpacity(to);
                if (onComplete) onComplete();
            }
        };

        setTimeout(() => step(), this.frameInterval);
    }
    
    animateWindowBounds(win, targetBounds, options = {}) {
        if (this.animationTimers.has(win)) {
            clearTimeout(this.animationTimers.get(win));
        }

        if (!this._isWindowValid(win)) {
            if (options.onComplete) options.onComplete();
            return;
        }

        this.isAnimating = true;

        const startBounds = win.getBounds();
        const startTime = performance.now();
        const duration = options.duration || this.animationDuration;

        const animationId = Symbol('bounds_animation');
        this.activeAnimations.add(animationId);

        const step = (timestamp) => {
            if (!this._isWindowValid(win) || !this.activeAnimations.has(animationId)) {
                this.activeAnimations.delete(animationId);
                if (this.animationTimers.size === 0) {
                    this.isAnimating = false;
                }
                if (options.onComplete) options.onComplete();
                return;
            }

            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Utiliser une fonction d'easing plus fluide
            const eased = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            const newBounds = {
                x: progress >= 1 ? Math.round(startBounds.x + (targetBounds.x - startBounds.x) * eased) : (startBounds.x + (targetBounds.x - startBounds.x) * eased),
                y: progress >= 1 ? Math.round(startBounds.y + (targetBounds.y - startBounds.y) * eased) : (startBounds.y + (targetBounds.y - startBounds.y) * eased),
                width: progress >= 1 ? Math.round(startBounds.width + ((targetBounds.width ?? startBounds.width) - startBounds.width) * eased) : (startBounds.width + ((targetBounds.width ?? startBounds.width) - startBounds.width) * eased),
                height: progress >= 1 ? Math.round(startBounds.height + ((targetBounds.height ?? startBounds.height) - startBounds.height) * eased) : (startBounds.height + ((targetBounds.height ?? startBounds.height) - startBounds.height) * eased),
            };

            win.setBounds(newBounds);

            if (progress < 1) {
                if (this.useRequestAnimationFrame) {
                    setTimeout(() => step(), this.frameInterval);
                } else {
                    setTimeout(() => setTimeout(() => step(), this.frameInterval), 1000 / 60);
                }
            } else {
                this.activeAnimations.delete(animationId);
                win.setBounds(targetBounds);
                this.animationTimers.delete(win);

                if (this.animationTimers.size === 0) {
                    this.isAnimating = false;
                }

                if (options.onComplete) options.onComplete();
            }
        };

        if (this.useRequestAnimationFrame) {
            setTimeout(() => step(), this.frameInterval);
        } else {
            step(startTime);
        }
    }
    
    animateWindowPosition(win, targetPosition, options = {}) {
        if (!this._isWindowValid(win)) {
            if (options.onComplete) options.onComplete();
            return;
        }
        const currentBounds = win.getBounds();
        const targetBounds = { ...currentBounds, ...targetPosition };
        this.animateWindowBounds(win, targetBounds, options);
    }
    
    animateLayout(layout, animated = true) {
        if (!layout) return;
        for (const winName in layout) {
            const win = this.windowPool.get(winName);
            const targetBounds = layout[winName];
            if (win && !win.isDestroyed() && targetBounds) {
                if (animated) {
                    this.animateWindowBounds(win, targetBounds);
                } else {
                    win.setBounds(targetBounds);
                }
            }
        }
    }

    // Animation d'apparition de la barre flottante lors de la connexion
    animateHeaderAppearance(win, options = {}) {
        if (!this._isWindowValid(win)) {
            if (options.onComplete) options.onComplete();
            return;
        }

        const { onComplete, duration = 800 } = options;
        const finalBounds = win.getBounds();

        // Position de départ : en dessous avec un effet de rebond plus marqué
        const startBounds = {
            x: finalBounds.x,
            y: finalBounds.y + 50,
            width: finalBounds.width * 0.7,
            height: finalBounds.height * 0.7
        };

        // Masquer la fenêtre et la positionner au départ
        win.setOpacity(0);
        win.setBounds(startBounds);

        const animationId = Symbol('header_appearance');
        this.activeAnimations.add(animationId);

        let startTime = null;
        let lastUpdateTime = 0;

        const step = (currentTime) => {
            if (!this._isWindowValid(win) || !this.activeAnimations.has(animationId)) {
                this.activeAnimations.delete(animationId);
                if (onComplete) onComplete();
                return;
            }

            if (startTime === null) {
                startTime = currentTime;
                lastUpdateTime = currentTime;
            }

            // Frame rate limiting pour fluidité maximale
            const timeSinceLastUpdate = currentTime - lastUpdateTime;
            if (timeSinceLastUpdate < this.frameInterval) {
                setTimeout(() => step(), this.frameInterval);
                return;
            }

            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing sophistiqué avec effet de rebond
            let eased;
            if (progress < 0.6) {
                // Phase d'accélération
                const t = progress / 0.6;
                eased = t * t;
            } else if (progress < 0.8) {
                // Phase de rebond subtil
                const t = (progress - 0.6) / 0.2;
                eased = 0.6 + 0.4 * (1 - Math.pow(1 - t, 2));
            } else {
                // Phase finale fluide
                const t = (progress - 0.8) / 0.2;
                eased = 1 - Math.pow(1 - t, 3);
            }

            // Interpolation ultra-fluide avec calculs optimisés
            const currentBounds = {
                x: startBounds.x + (finalBounds.x - startBounds.x) * eased,
                y: startBounds.y + (finalBounds.y - startBounds.y) * eased,
                width: startBounds.width + (finalBounds.width - startBounds.width) * eased,
                height: startBounds.height + (finalBounds.height - startBounds.height) * eased
            };

            win.setBounds(currentBounds);

            // Apparition de l'opacité avec timing sophistiqué
            const opacityProgress = Math.max(0, (progress - 0.1) / 0.7);
            const opacity = opacityProgress < 0.5
                ? 2 * opacityProgress * opacityProgress * opacityProgress
                : 1 - Math.pow(-2 * opacityProgress + 2, 3) / 2;

            win.setOpacity(Math.min(1, opacity));

            lastUpdateTime = currentTime;

            if (progress < 1) {
                setTimeout(() => step(), this.frameInterval);
            } else {
                this.activeAnimations.delete(animationId);
                win.setBounds(finalBounds);
                win.setOpacity(1);
                if (onComplete) onComplete();
            }
        };

        setTimeout(() => step(), this.frameInterval);
    }

    // Animation de disparition de la barre flottante lors de la déconnexion
    animateHeaderDisappearance(win, options = {}) {
        if (!this._isWindowValid(win)) {
            if (options.onComplete) options.onComplete();
            return;
        }

        const { onComplete, duration = 400 } = options;
        const startBounds = win.getBounds();

        const startTime = performance.now();
        const animationId = Symbol('header_disappearance');
        this.activeAnimations.add(animationId);

        const step = (timestamp) => {
            if (!this._isWindowValid(win) || !this.activeAnimations.has(animationId)) {
                this.activeAnimations.delete(animationId);
                if (onComplete) onComplete();
                return;
            }

            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing pour la disparition
            const eased = 1 - Math.pow(1 - progress, 2); // ease-out-quad

            // Réduire l'opacité en premier
            const opacity = Math.max(0, 1 - (progress * 1.5));
            win.setOpacity(opacity);

            // Puis réduire la taille
            const scale = Math.max(0.7, 1 - (progress * 0.3));
            const currentBounds = {
                x: startBounds.x,
                y: startBounds.y + (progress * 20),
                width: startBounds.width * scale,
                height: startBounds.height * scale
            };

            win.setBounds(currentBounds);

            if (progress < 1) {
                setTimeout(() => step(), this.frameInterval);
            } else {
                this.activeAnimations.delete(animationId);
                if (onComplete) onComplete();
            }
        };

        setTimeout(() => step(), this.frameInterval);
    }

    destroy() {
        // Annuler toutes les animations en cours
        this.activeAnimations.clear();

        if (this.animationFrameId) {
            clearTimeout(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Nettoyer les timers restants
        for (const timerId of this.animationTimers.values()) {
            clearTimeout(timerId);
        }
        this.animationTimers.clear();

        this.isAnimating = false;
        console.log('[Movement] Manager destroyed');
    }
}

module.exports = SmoothMovementManager;

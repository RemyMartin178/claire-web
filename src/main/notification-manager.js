/**
 * XERUS NOTIFICATION MANAGER
 * Cross-platform notification system for Xerus
 * 
 * Handles:
 * - System notifications (Windows/macOS)
 * - STT completion notifications
 * - Conversation updates
 * - Error notifications
 * - Session state changes
 */

const { platformManager } = require('./platform-manager');
const { app, BrowserWindow } = require('electron');
const { createLogger } = require('../common/services/logger.js');

const logger = createLogger('Main.Notification-manager');

class NotificationManager {
    constructor() {
        this.enabled = true;
        this.notifications = new Map();
        this.settings = {
            showSTTComplete: false,
            showConversationUpdates: false,
            showErrors: true,
            showSessionChanges: true,
            sound: false,
            duration: 5000
        };
        
        this.initialize();
    }

    /**
     * Get notification capabilities
     */
    getCapabilities() {
        return {
            enabled: this.enabled,
            systemNotifications: platformManager.capabilities.systemNotifications,
            sound: this.settings.sound,
            duration: this.settings.duration,
            platform: platformManager.capabilities.platform
        };
    }

    /**
     * Initialize notification system
     */
    initialize() {
        logger.info('[NotificationManager] Initializing notification system');
        
        // Check if notifications are supported
        if (!platformManager.capabilities.systemNotifications) {
            logger.warn('System notifications not supported');
            this.enabled = false;
            return;
        }

        // Set up notification permissions
        this.requestPermissions();
        
        logger.info('[NotificationManager] Notification system initialized');
    }

    /**
     * Request notification permissions
     */
    async requestPermissions() {
        try {
            // On Windows, notifications are usually allowed by default
            if (process.platform === 'win32') {
                logger.info('[NotificationManager] Windows notifications enabled');
                return true;
            }
            
            // On macOS, we may need to request permissions
            if (process.platform === 'darwin') {
                logger.info('[NotificationManager] macOS notifications enabled');
                return true;
            }
            
            return false;
        } catch (error) {
            logger.error('Error requesting permissions:', { error });
            return false;
        }
    }

    /**
     * Show STT completion notification
     */
    showSTTComplete(speaker, text, options = {}) {
        if (!this.enabled || !this.settings.showSTTComplete) return;

        const speakerName = speaker === 'Me' ? 'Vous' : speaker === 'Them' ? 'Système' : speaker;
        const title = `Transcription - ${speakerName}`;
        const body = text.length > 100 ? text.substring(0, 100) + '...' : text;
        
        const notificationOptions = {
            ...options,
            onClick: () => {
                this.focusMainWindow();
            },
            sound: this.settings.sound,
            tag: 'stt-complete'
        };

        return this.showNotification(title, body, notificationOptions);
    }

    /**
     * Show conversation update notification
     */
    showConversationUpdate(message, options = {}) {
        if (!this.enabled || !this.settings.showConversationUpdates) return;

        const title = 'Conversation Updated';
        const body = message;
        
        const notificationOptions = {
            ...options,
            onClick: () => {
                this.focusMainWindow();
            },
            sound: this.settings.sound,
            tag: 'conversation-update'
        };

        return this.showNotification(title, body, notificationOptions);
    }

    /**
     * Show error notification
     */
    showError(error, options = {}) {
        if (!this.enabled || !this.settings.showErrors) return;

        const title = 'Xerus Error';
        const body = typeof error === 'string' ? error : error.message || 'An error occurred';
        
        const notificationOptions = {
            ...options,
            urgency: 'critical',
            onClick: () => {
                this.focusMainWindow();
            },
            sound: this.settings.sound,
            tag: 'error'
        };

        return this.showNotification(title, body, notificationOptions);
    }

    /**
     * Show session state change notification
     */
    showSessionChange(state, options = {}) {
        if (!this.enabled || !this.settings.showSessionChanges) return;

        const configs = {
            'started': {
                subtitle: 'Claire',
                title: 'Écoute démarrée',
                duration: 3500,
                action: null,
            },
            'stopped': {
                subtitle: 'Claire',
                title: 'Écoute arrêtée',
                duration: 4000,
                action: { label: 'Voir l\'activité', channel: 'dashboard:open' },
            },
            'paused': {
                subtitle: 'Claire',
                title: 'Écoute en pause',
                duration: 3000,
                action: null,
            },
            'resumed': {
                subtitle: 'Claire',
                title: 'Écoute reprise',
                duration: 3000,
                action: null,
            },
            'error': {
                subtitle: 'Claire',
                title: 'Erreur lors de l\'écoute',
                duration: 5000,
                action: null,
            },
            'no_transcript': {
                subtitle: 'Claire',
                title: 'Aucune transcription détectée',
                duration: 5000,
                action: null,
            },
            'notes_ready': {
                subtitle: 'Claire',
                title: 'Notes prêtes',
                duration: 5000,
                action: { label: 'Voir les notes', channel: 'dashboard:open' },
            },
            'summary_ready': {
                subtitle: 'Claire',
                title: 'Résumé prêt',
                duration: 5000,
                action: { label: 'Voir le résumé', channel: 'dashboard:open' },
            },
            'zoom_ended': {
                subtitle: 'Zoom',
                title: 'Réunion Zoom terminée',
                duration: 6000,
                action: { label: 'Récupérer les notes', channel: 'dashboard:open' },
            },
            'meetings_done': {
                subtitle: 'Claire',
                title: 'Réunions terminées ? Récupérez vos notes',
                duration: 7000,
                action: { label: 'Voir les notes', channel: 'dashboard:open' },
            },
            'quota_exceeded': {
                subtitle: 'Claire',
                title: 'Quota atteint — Mettez à jour votre plan',
                duration: 6000,
                action: null,
            },
            'network_error': {
                subtitle: 'Claire',
                title: 'Erreur réseau — Vérifiez votre connexion',
                duration: 5000,
                action: null,
            },
            'auth_required': {
                subtitle: 'Claire',
                title: 'Connexion requise',
                duration: 5000,
                action: { label: 'Se connecter', channel: 'auth:open' },
            },
        };

        const cfg = configs[state] || { subtitle: 'Claire', title: `Session ${state}`, duration: 4000, action: null };

        return this.showNotification(cfg.subtitle, cfg.title, {
            ...options,
            tag: `session-${state}`,
            duration: cfg.duration,
            action: cfg.action,
        });
    }

    /**
     * Show Zoom meeting ended notification
     */
    showZoomEnded() {
        return this.showSessionChange('zoom_ended');
    }

    /**
     * Show "meetings done, get notes" notification
     */
    showMeetingsDone() {
        return this.showSessionChange('meetings_done');
    }

    /**
     * Show notes ready notification after session summary
     */
    showNotesReady() {
        return this.showSessionChange('notes_ready');
    }

    /**
     * Show summary ready notification
     */
    showSummaryReady() {
        return this.showSessionChange('summary_ready');
    }

    /**
     * Show quota exceeded notification
     */
    showQuotaExceeded() {
        return this.showSessionChange('quota_exceeded');
    }

    /**
     * Show network error notification
     */
    showNetworkError() {
        return this.showSessionChange('network_error');
    }

    /**
     * Show auth required notification
     */
    showAuthRequired() {
        return this.showSessionChange('auth_required');
    }

    /**
     * Show custom notification — in-app toast (bas gauche overlay) au lieu de notif OS
     */
    showNotification(title, body, options = {}) {
        if (!this.enabled) return false;

        try {
            // Map vers l'icône toast
            let icon = 'info';
            if (options.urgency === 'critical' || options.tag === 'error') icon = 'warn';
            else if (options.tag === 'stt-complete') icon = 'mic';
            else if (options.tag === 'session-change') icon = 'ok';

            const toastData = {
                icon,
                subtitle: title,
                title: body,
                duration: options.duration || this.settings.duration || 4000,
                action: options.action || null,
            };

            // Envoyer à toutes les fenêtres renderer (l'overlay capte via onShowToast)
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(win => {
                if (!win.isDestroyed()) {
                    win.webContents.send('show-toast', toastData);
                }
            });

            // Store reference
            const notificationId = options.tag || `notification-${Date.now()}`;
            this.notifications.set(notificationId, { title, body, timestamp: Date.now(), ...options });
            if (this.settings.duration > 0) {
                setTimeout(() => this.notifications.delete(notificationId), this.settings.duration);
            }

            return true;
        } catch (error) {
            logger.error('Error showing in-app notification:', { error });
            return false;
        }
    }

    /**
     * Show warning notification
     */
    showWarning(message, options = {}) {
        return this.showNotification('Claire', message, { ...options, tag: 'warning', urgency: 'normal' });
    }

    /**
     * Show info notification
     */
    showInfo(message, options = {}) {
        return this.showNotification('Claire', message, { ...options, tag: 'info' });
    }

    /**
     * Show Windows-specific toast notification
     */
    showWindowsToast(title, body, options = {}) {
        if (process.platform !== 'win32') {
            return this.showNotification(title, body, options);
        }

        return platformManager.showWindowsToast(title, body, options);
    }

    /**
     * Show macOS-specific notification
     */
    showMacOSNotification(title, body, options = {}) {
        if (process.platform !== 'darwin') {
            return this.showNotification(title, body, options);
        }

        return platformManager.showMacOSNotification(title, body, options);
    }

    /**
     * Show a meeting reminder notification.
     * @param {string} eventTitle - Calendar event title
     * @param {number} minutesBefore - 60 or 5
     * @param {{ time: string, attendees: string[], platform: string|null }} details
     */
    showMeetingReminder(eventTitle, minutesBefore, details = {}) {
        const label = minutesBefore >= 60 ? '1h' : '5 min';
        const title = `Réunion dans ${label} — ${eventTitle || 'Réunion'}`;

        const lines = [];
        if (details.time) lines.push(details.time);
        if (details.attendees?.length) {
            const names = details.attendees.slice(0, 3).join(', ');
            lines.push(`Avec : ${names}${details.attendees.length > 3 ? ` +${details.attendees.length - 3}` : ''}`);
        }
        if (details.platform) lines.push(`Via : ${details.platform}`);
        lines.push('Voir le détail → clairia.app/activity');

        const body = lines.join('\n') || `Une réunion est prévue${details.time ? ` à ${details.time}` : ''}.\nVoir le détail → clairia.app/activity`;

        return this.showNotification(title, body, { tag: 'meeting-reminder', duration: 8000 });
    }

    /**
     * Focus main window when notification is clicked
     */
    focusMainWindow() {
        const windows = BrowserWindow.getAllWindows();
        const mainWindow = windows.find(win => win.webContents.getURL().includes('header'));
        
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
            mainWindow.show();
        }
    }

    /**
     * Update notification settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        logger.info('[NotificationManager] Settings updated:', this.settings);
    }

    /**
     * Enable/disable notifications
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        logger.info('Notifications');
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.clear();
        logger.info('[NotificationManager] All notifications cleared');
    }

    /**
     * Get notification history
     */
    getHistory() {
        return Array.from(this.notifications.values());
    }

    /**
     * Get notification settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Check if notifications are supported
     */
    isSupported() {
        return this.enabled && platformManager.capabilities.systemNotifications;
    }
}

// Export singleton instance
const notificationManager = new NotificationManager();

module.exports = {
    notificationManager,
    NotificationManager
};
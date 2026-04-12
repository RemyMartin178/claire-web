const { createLogger } = require('../common/services/logger.js');
const { notificationManager } = require('./notification-manager.js');

const logger = createLogger('MeetingNotifier');

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const WINDOW_1H = { min: 58, max: 62 };  // minutes before start
const WINDOW_5M = { min: 3,  max: 7  };

let _timer = null;
let _port = null;
let _getToken = null;
const _notified = new Set(); // tracks "eventId-1h" / "eventId-5m"

function _formatTime(dateStr) {
    try {
        return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateStr;
    }
}

function _extractPlatform(event) {
    const entry = event.conferenceData?.entryPoints?.[0];
    if (entry?.label) return entry.label;
    if (entry?.uri) {
        if (entry.uri.includes('meet.google')) return 'Google Meet';
        if (entry.uri.includes('zoom.us')) return 'Zoom';
        if (entry.uri.includes('teams.microsoft')) return 'Microsoft Teams';
        return entry.uri;
    }
    if (event.location) return event.location;
    return null;
}

function _extractAttendees(event) {
    if (!Array.isArray(event.attendees)) return [];
    return event.attendees
        .filter(a => !a.self && a.displayName)
        .map(a => a.displayName);
}

async function _poll() {
    if (!_port || !_getToken) return;

    let token;
    try {
        token = await _getToken();
    } catch (e) {
        logger.warn('[MeetingNotifier] Could not get auth token:', e.message);
        return;
    }
    if (!token) return;

    let events;
    try {
        const res = await fetch(`http://localhost:${_port}/api/v1/tools/googleCalendar/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ parameters: { operation: 'listEvents' } }),
        });
        if (!res.ok) {
            if (res.status !== 404 && res.status !== 401) {
                logger.warn('[MeetingNotifier] Calendar API returned', res.status);
            }
            return;
        }
        const data = await res.json();
        events = data.events || data.result?.events || [];
    } catch (e) {
        logger.warn('[MeetingNotifier] Failed to fetch calendar events:', e.message);
        return;
    }

    const now = Date.now();
    for (const event of events) {
        const startStr = event.start?.dateTime || event.start?.date;
        if (!startStr) continue;

        const startMs = new Date(startStr).getTime();
        const minutesUntil = (startMs - now) / 60000;

        const checks = [
            { key: '1h', inWindow: minutesUntil >= WINDOW_1H.min && minutesUntil <= WINDOW_1H.max, minutes: 60 },
            { key: '5m', inWindow: minutesUntil >= WINDOW_5M.min && minutesUntil <= WINDOW_5M.max, minutes: 5 },
        ];

        for (const { key, inWindow, minutes } of checks) {
            const notifId = `${event.id}-${key}`;
            if (inWindow && !_notified.has(notifId)) {
                _notified.add(notifId);
                const details = {
                    time: _formatTime(startStr),
                    attendees: _extractAttendees(event),
                    platform: _extractPlatform(event),
                };
                const title = event.summary || '';
                logger.info(`[MeetingNotifier] Notifying: "${title}" in ${minutes} min`);
                notificationManager.showMeetingReminder(title, minutes, details);
            }
        }
    }

    // Prune stale notif IDs (events > 2h in the past)
    for (const id of _notified) {
        // IDs are in format "<eventId>-1h" or "<eventId>-5m", no easy date lookup — prune by size
        if (_notified.size > 200) _notified.clear();
    }
}

function start(port, getTokenFn) {
    if (_timer) return;
    _port = port;
    _getToken = getTokenFn;
    logger.info('[MeetingNotifier] Starting, poll interval 5 min');
    _poll(); // immediate first check
    _timer = setInterval(_poll, POLL_INTERVAL_MS);
}

function stop() {
    if (_timer) {
        clearInterval(_timer);
        _timer = null;
    }
    _notified.clear();
    logger.info('[MeetingNotifier] Stopped');
}

module.exports = { start, stop };

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Create a new session
router.post('/login', async (req, res) => {
    try {
        const { userId, browserInfo, osInfo } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const result = await pool.query(
            `INSERT INTO user_sessions (user_id, ip_address, user_agent, os_info, browser_info) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, ipAddress, userAgent, osInfo, browserInfo]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to register session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Update session last active time
router.put('/:sessionId/active', async (req, res) => {
    try {
        const { sessionId } = req.params;

        await pool.query(
            `UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [sessionId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update session activity:', error);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// Get all active sessions for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT * FROM user_sessions WHERE user_id = $1 AND is_active = true ORDER BY last_seen_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Failed to list sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Revoke a specific session
router.delete('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        await pool.query(
            `UPDATE user_sessions SET is_active = false WHERE id = $1`,
            [sessionId]
        );

        res.json({ success: true, message: 'Session revoked' });
    } catch (error) {
        console.error('Failed to revoke session:', error);
        res.status(500).json({ error: 'Failed to revoke session' });
    }
});

// Revoke all other sessions for a user
router.delete('/user/:userId/others', async (req, res) => {
    try {
        const { userId } = req.params;
        const { exceptSessionId } = req.body;

        if (!exceptSessionId) {
            return res.status(400).json({ error: 'Current session ID is required to keep it active' });
        }

        await pool.query(
            `UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND id != $2`,
            [userId, exceptSessionId]
        );

        res.json({ success: true, message: 'Other sessions revoked' });
    } catch (error) {
        console.error('Failed to revoke other sessions:', error);
        res.status(500).json({ error: 'Failed to revoke other sessions' });
    }
});

module.exports = router;

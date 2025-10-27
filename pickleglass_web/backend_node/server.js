/**
 * Standalone Backend Server for Claire
 * This server can be deployed to production (Railway, Render, Heroku, etc.)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// CORS Configuration
const allowedOrigins = [
    process.env.PICKLEGLASS_WEB_URL,
    process.env.APP_WEB_URL,
    'https://app.clairia.app',
    'http://localhost:3000',
].filter(Boolean);

console.log('🔧 Backend CORS allowed:', allowedOrigins.join(', '));

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        console.warn('🔒 CORS blocked origin:', origin);
        return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({ 
        message: "Claire Backend API is running",
        version: "1.0.0",
        status: "healthy"
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Import routes
app.use('/api/v1/tools', require('./routes/tools'));
app.use('/api/v1/knowledge', require('./routes/knowledge'));

// Fallback for unknown routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.path 
    });
});

// Start server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`✅ Claire Backend Server started`);
    console.log(`📍 Server running on http://${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

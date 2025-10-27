const express = require('express');
const cors = require('cors');
// const db = require('./db'); // No longer needed
const { identifyUser } = require('./middleware/auth');

function createApp(eventBridge) {
    const app = express();

    const allowedOrigins = [
        process.env.PICKLEGLASS_WEB_URL,
        process.env.pickleglass_WEB_URL,
        process.env.APP_WEB_URL,
        'https://app.clairia.app',
        'http://localhost:3000',
    ].filter(Boolean);
    console.log(`🔧 Backend CORS allowed: ${allowedOrigins.join(', ')}`);

    app.use(cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (allowedOrigins.includes(origin)) return cb(null, true);
            return cb(null, false);
        },
        credentials: true,
        methods: ['GET','POST','OPTIONS'],
        allowedHeaders: ['content-type','authorization']
    }));

    app.use(express.json());

    app.get('/', (req, res) => {
        res.json({ message: "pickleglass API is running" });
    });

    app.use((req, res, next) => {
        req.bridge = eventBridge;
        next();
    });

    app.use('/api', identifyUser);

    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/user', require('./routes/user'));
    app.use('/api/conversations', require('./routes/conversations'));
    app.use('/api/presets', require('./routes/presets'));

    // New routes for tools and knowledge base
    // Debug middleware for API calls
    app.use((req, res, next) => {
        console.log(`🔍 [${req.method}] ${req.path}`);
        console.log(`🔍 Headers:`, req.headers);
        console.log(`🔍 Origin:`, req.get('origin'));
        next();
    });

    app.use('/api/v1/tools', require('./routes/tools'));
    app.use('/api/v1/knowledge', require('./routes/knowledge'));

    app.get('/api/sync/status', (req, res) => {
        res.json({
            status: 'online',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    });

    app.post('/api/desktop/set-user', (req, res) => {
        res.json({
            success: true,
            message: "Direct IPC communication is now used. This endpoint is deprecated.",
            user: req.body,
            deprecated: true
        });
    });

    app.get('/api/desktop/status', (req, res) => {
        res.json({
            connected: true,
            current_user: null,
            communication_method: "IPC",
            file_based_deprecated: true
        });
    });

    return app;
}

module.exports = createApp;

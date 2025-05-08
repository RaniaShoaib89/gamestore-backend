const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors({
    origin: /^http:\/\/localhost:\d+$/,  // Allows any localhost port, 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Test route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Server is running',
        timestamp: '2025-05-05 19:02:11',
        user: 'RaniaShoaib89'
    });
});

// Import routes and middleware
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gameRoutes = require('./routes/games');
const cartRoutes = require('./routes/cart');
const { auth } = require('./middleware/auth');

// Mount routes
app.use('/api/auth', authRoutes); // Mount auth routes first
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/cart', auth, cartRoutes); // Use auth middleware directly

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        message: 'Server error',
        error: err.message 
    });
});

// Modified server startup configuration
const PORT = 3001;
let server;

try {
    // Try IPv4 first
    server = app.listen(PORT, '127.0.0.1', () => {
        console.log('\nServer Status:');
        console.log('==============');
        console.log(`Time: 2025-05-05 19:02:11`);
        console.log(`User: RaniaShoaib89`);
        console.log('\nServer is running on:');
        console.log(`http://127.0.0.1:${PORT}`);
        console.log(`http://localhost:${PORT}`);
    });
} catch (err) {
    console.error('Failed to start server on IPv4:', err);
    // Try alternative binding
    server = app.listen(PORT, () => {
        console.log('\nServer Status:');
        console.log('==============');
        console.log(`Time: 2025-05-05 19:02:11`);
        console.log(`User: RaniaShoaib89`);
        console.log('\nServer is running on port', PORT);
    });
}

// Enhanced error handling
server.on('error', (error) => {
    console.error('\nServer Error:', error.message);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please:`);
        console.error('1. Close any other application using this port');
        console.error('2. Or change the port number');
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});



const cors = require('cors');

// CORS options configuration
const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true
};

// CORS middleware function
const corsMiddleware = cors(corsOptions);

// Authentication middleware function
const auth = (req, res, next) => {
    // Check for either session.user or session.userId
    if (req.session && (req.session.user || req.session.userId)) {
        // If we have the full user object, use that
        if (req.session.user) {
            req.user = {
                id: req.session.user.id || req.session.user.user_ID,
                username: req.session.user.username,
                role: req.session.user.role
            };
        } else {
            // If we only have userId, create a minimal user object
            req.user = { id: req.session.userId };
        }
        return next();
    }
    return res.status(401).json({ 
        message: 'Unauthorized',
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    auth,
    corsMiddleware
}; 
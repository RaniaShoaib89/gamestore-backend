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
    if (req.session && req.session.user) {
        req.user = req.session.user;
        return next();
    }
    return res.status(401).json({ message: 'Unauthorized' });
};

module.exports = {
    auth,
    corsMiddleware
};
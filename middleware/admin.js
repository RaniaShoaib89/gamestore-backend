const adminAuth = (req, res, next) => {
    // Check if user exists and has admin role
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({
        message: 'Access denied. Admin privileges required.',
        timestamp: new Date().toISOString()
    });
};

module.exports = adminAuth; 
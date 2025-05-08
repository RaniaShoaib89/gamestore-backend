const express = require('express');
const promisePool = require('../db/database');
const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        
        const [rows] = await promisePool.query('SELECT * FROM user WHERE user_Name = ?', [username]); // Use 'user_Name' as the column name

        if (rows.length === 0 || password !== rows[0].password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0]; // Get the first user from the result
        req.session.user = {
            id: user.user_ID,
            username: user.user_Name,
            role: user.role
        };

        return res.json({ 
            user: req.session.user,
            message: 'Login successful' 
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Add logout route
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Add check login status route
router.get('/status', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({
            isLoggedIn: true,
            user: req.session.user
        });
    }
    return res.status(401).json({
        isLoggedIn: false,
        message: 'Not logged in'
    });
});

module.exports = router;
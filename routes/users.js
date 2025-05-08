const express = require('express');
const router = express.Router();
const pool = require('../db/database');
const { auth } = require('../middleware/auth');

// Profile route
router.get('/profile', auth, async (req, res) => {
    try {
        const [user] = await pool.query(
            'SELECT user_ID, user_Name, email, role FROM User WHERE user_ID = ?',
            [req.user.id]
        );
        
        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
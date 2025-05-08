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
        // Set both session user object and userId
        req.session.user = {
            id: user.user_ID,
            username: user.user_Name,
            role: user.role
        };
        req.session.userId = user.user_ID; // Add this line to set session userId

        return res.json({ 
            user: {
                ...req.session.user,
                user_ID: user.user_ID
            },
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

// Add signup route
router.post('/signup', async (req, res) => {
    const { username, email, password, role } = req.body;

    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if username already exists
        const [existingUser] = await promisePool.query(
            'SELECT user_Name FROM user WHERE user_Name = ?',
            [username]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Check if email already exists
        const [existingEmail] = await promisePool.query(
            'SELECT email FROM user WHERE email = ?',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        // Insert new user
        const [result] = await promisePool.query(
            'INSERT INTO user (user_Name, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, password, role || 'user']
        );

        res.status(201).json({
            message: 'User created successfully',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
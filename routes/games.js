const express = require('express');
const router = express.Router();
const pool = require('../db/database');
const auth = require('../middleware/auth'); // Updated import

// Get all games
router.get('/', async (req, res) => {
    try {
        const [games] = await pool.query(`
            SELECT g.*, i.stockQuantity 
            FROM Games g 
            LEFT JOIN Inventory i ON g.game_ID = i.game_ID
        `);
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching games' });
    }
});

// Get game by ID
router.get('/:id', async (req, res) => {
    try {
        const [game] = await pool.query(`
            SELECT g.*, i.stockQuantity 
            FROM Games g 
            LEFT JOIN Inventory i ON g.game_ID = i.game_ID 
            WHERE g.game_ID = ?
        `, [req.params.id]);
        
        if (game.length === 0) {
            return res.status(404).json({ message: 'Game not found' });
        }
        
        res.json(game[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching game' });
    }
});

// Search games by title
router.get('/search/:query', async (req, res) => {
    try {
        const searchQuery = `%${req.params.query}%`;
        const [games] = await pool.query(`
            SELECT g.*, i.stockQuantity 
            FROM Games g 
            LEFT JOIN Inventory i ON g.game_ID = i.game_ID
            WHERE g.title LIKE ?
        `, [searchQuery]);
        
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: 'Error searching games' });
    }
});

module.exports = router;
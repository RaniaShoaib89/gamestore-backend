const express = require('express');
const router = express.Router();
const pool = require('../db/database');
const auth = require('../middleware/auth'); // Updated import

// Get all games
router.get('/', async (req, res) => {
    try {
        const [games] = await pool.query(`
            SELECT game_ID, title, description, price, genre, platform, image_url 
            FROM Games
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
            SELECT game_ID, title, description, price, genre, platform, image_url
            FROM Games 
            WHERE game_ID = ?
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
            SELECT * 
            FROM Games 
            WHERE title LIKE ?
        `, [searchQuery]);
        
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: 'Error searching games' });
    }
});

// Filter games by genre
router.get('/filter/genre/:genre', async (req, res) => {
    try {
        const genre = req.params.genre;
        const [games] = await pool.query(`
            SELECT * 
            FROM Games 
            WHERE genre = ?
        `, [genre]);
        
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: 'Error filtering games by genre' });
    }
});

// Get all distinct genres
router.get('/genres/all', async (req, res) => {
    try {
        const [genres] = await pool.query(`
            SELECT DISTINCT genre 
            FROM Games 
            ORDER BY genre
        `);
        res.json(genres.map(g => g.genre));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching genres' });
    }
});

// Get detailed game information
router.get('/details/:id', async (req, res) => {
    try {
        const [gameDetails] = await pool.query(`
            SELECT game_ID, title, description, price, genre, platform, image_url
            FROM Games
            WHERE game_ID = ?
        `, [req.params.id]);
        
        if (gameDetails.length === 0) {
            return res.status(404).json({ message: 'Game not found' });
        }
        
        res.json(gameDetails[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching game details' });
    }
});

module.exports = router;
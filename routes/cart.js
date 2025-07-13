const express = require('express');
const router = express.Router();
const pool = require('../db/database');
const { auth } = require('../middleware/auth');

// Wrap auth middleware in error handling
const authMiddleware = async (req, res, next) => {
    try {
        await auth(req, res, next);
    } catch (error) {
        res.status(401).json({
            message: 'Authentication failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Get user's cart
router.get('/', async (req, res) => {
    try {
        // Check if user is logged in via session
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                message: 'Please login to view cart',
                timestamp: new Date().toISOString()
            });
        }

        console.log('Fetching cart for user:', req.session.userId);
        
     
        const [items] = await pool.query(`
            SELECT 
                c.*,
                g.title,
                g.description,
                g.price,
                g.genre,
                g.platform,
                (g.price * c.quantity) as total_price
            FROM Cart c
            JOIN Games g ON c.game_id = g.game_ID
            WHERE c.user_id = ?
        `, [req.session.userId]);

        const total = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

        res.json({
            items: items,
            total: parseFloat(total).toFixed(2),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ 
            message: 'Error fetching cart',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
    try {
        const { game_ID, quantity = 1 } = req.body;

        if (!game_ID) {
            return res.status(400).json({ 
                message: 'Game ID is required',
                timestamp: new Date().toISOString()
            });
        }

        // Validate game exists
        const [game] = await pool.query(
            'SELECT * FROM Games WHERE game_ID = ?',
            [game_ID]
        );

        if (game.length === 0) {
            return res.status(404).json({ 
                message: 'Game not found',
                timestamp: new Date().toISOString()
            });
        }

        // Check inventory
        const [inventory] = await pool.query(
            'SELECT * FROM Inventory WHERE game_ID = ?',
            [game_ID]
        );

        if (inventory.length === 0) {
            return res.status(400).json({ 
                message: 'This game is not available in inventory',
                timestamp: new Date().toISOString()
            });
        }

        // Check if requested quantity is available
        if (inventory[0].stockQuantity < quantity) {
            return res.status(400).json({ 
                message: 'Requested quantity not available in inventory',
                timestamp: new Date().toISOString()
            });
        }

        // Check if item already in cart
        const [existingItem] = await pool.query(
            'SELECT * FROM Cart WHERE user_id = ? AND game_id = ?',
            [req.user.id, game_ID]
        );

        if (existingItem.length > 0) {
            // Check if total quantity (existing + new) is available
            const totalQuantity = existingItem[0].quantity + quantity;
            if (inventory[0].stockQuantity < totalQuantity) {
                return res.status(400).json({ 
                    message: 'Total quantity exceeds available inventory',
                    timestamp: new Date().toISOString()
                });
            }

            // Update quantity if item exists
            await pool.query(
                'UPDATE Cart SET quantity = quantity + ? WHERE user_id = ? AND game_id = ?',
                [quantity, req.user.id, game_ID]
            );
        } else {
            // Add new item if it doesn't exist
            await pool.query(
                'INSERT INTO Cart (user_id, game_id, quantity) VALUES (?, ?, ?)',
                [req.user.id, game_ID, quantity]
            );
        }

        res.json({ 
            message: 'Item added to cart successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ 
            message: 'Error adding item to cart',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Update item quantity in cart
router.put('/update/:gameId', auth, async (req, res) => {
    try {
        const { gameId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ 
                message: 'Valid quantity is required',
                timestamp: new Date().toISOString()
            });
        }
        
        const [result] = await pool.query(
            'UPDATE Cart SET quantity = ? WHERE user_id = ? AND game_id = ?',
            [quantity, req.user.id, gameId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Item not found in cart',
                timestamp: new Date().toISOString()
            });
        }

        res.json({ 
            message: 'Quantity updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ 
            message: 'Error updating quantity',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Remove item from cart
router.delete('/remove/:gameId', auth, async (req, res) => {
    try {
        const { gameId } = req.params;

        const [result] = await pool.query(
            'DELETE FROM Cart WHERE user_id = ? AND game_id = ?',
            [req.user.id, gameId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Item not found in cart',
                timestamp: new Date().toISOString()
            });
        }

        res.json({ 
            message: 'Item removed from cart successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error removing item:', error);
        res.status(500).json({ 
            message: 'Error removing item from cart',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Clear entire cart
router.delete('/clear', auth, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM Cart WHERE user_id = ?',
            [req.user.id]
        );

        res.json({ 
            message: 'Cart cleared successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ 
            message: 'Error clearing cart',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
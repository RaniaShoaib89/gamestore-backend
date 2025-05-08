const express = require('express');
const router = express.Router();
const pool = require('../db/database');
const auth = require('../middleware/auth');

// Wrap auth middleware in error handling
const authMiddleware = async (req, res, next) => {
    try {
        await auth(req, res, next);
    } catch (error) {
        res.status(401).json({
            message: 'Authentication failed',
            error: error.message,
            timestamp: '2025-05-05 18:43:36'
        });
    }
};

// Get or create cart function to reuse across routes
const getOrCreateCart = async (userId) => {
    let [cart] = await pool.query(
        'SELECT * FROM Cart WHERE user_ID = ?',
        [userId]
    );

    if (cart.length === 0) {
        const [result] = await pool.query(
            'INSERT INTO Cart (user_ID) VALUES (?)',
            [userId]
        );
        cart = [{ cart_ID: result.insertId }];
    }
    return cart[0];
};

// Get user's cart
router.get('/', async (req, res) => {
    try {
        // Check if user is logged in via session
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                message: 'Please login to view cart',
                timestamp: '2025-05-05 18:43:36'
            });
        }

        console.log('Fetching cart for user:', req.session.userId);
        const cart = await getOrCreateCart(req.session.userId);

        const [items] = await pool.query(`
            SELECT 
                g.*,
                ci.quantity,
                (g.price * ci.quantity) as total_price
            FROM Cart_Items ci
            JOIN Games g ON ci.game_ID = g.game_ID
            WHERE ci.cart_ID = ?
        `, [cart.cart_ID]);

        const total = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

        res.json({
            cart_ID: cart.cart_ID,
            items: items,
            total: parseFloat(total).toFixed(2),
            timestamp: '2025-05-05 18:43:36'
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ 
            message: 'Error fetching cart',
            error: error.message,
            timestamp: '2025-05-05 18:43:36'
        });
    }
});

// Add item to cart
router.post('/add', authMiddleware, async (req, res) => {
    try {
        const { game_ID, quantity = 1 } = req.body;

        if (!game_ID) {
            return res.status(400).json({ 
                message: 'Game ID is required',
                timestamp: '2025-05-05 18:43:36'
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
                timestamp: '2025-05-05 18:43:36'
            });
        }

        // Get or create cart
        let [cart] = await pool.query(
            'SELECT * FROM Cart WHERE user_ID = ?',
            [req.user.id]
        );

        if (cart.length === 0) {
            const [result] = await pool.query(
                'INSERT INTO Cart (user_ID) VALUES (?)',
                [req.user.id]
            );
            cart = [{ cart_ID: result.insertId }];
        }

        // Check if item already in cart
        const [existingItem] = await pool.query(
            'SELECT * FROM Cart_Items WHERE cart_ID = ? AND game_ID = ?',
            [cart[0].cart_ID, game_ID]
        );

        if (existingItem.length > 0) {
            // Update quantity if item exists
            await pool.query(
                'UPDATE Cart_Items SET quantity = quantity + ? WHERE cart_ID = ? AND game_ID = ?',
                [quantity, cart[0].cart_ID, game_ID]
            );
        } else {
            // Add new item if it doesn't exist
            await pool.query(
                'INSERT INTO Cart_Items (cart_ID, game_ID, quantity) VALUES (?, ?, ?)',
                [cart[0].cart_ID, game_ID, quantity]
            );
        }

        res.json({ 
            message: 'Item added to cart successfully',
            timestamp: '2025-05-05 18:43:36'
        });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ 
            message: 'Error adding item to cart',
            error: error.message,
            timestamp: '2025-05-05 18:43:36'
        });
    }
});

// Update item quantity in cart
router.put('/update/:gameId', authMiddleware, async (req, res) => {
    try {
        const { gameId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ 
                message: 'Valid quantity is required',
                timestamp: '2025-05-05 18:43:36'
            });
        }

        const cart = await getOrCreateCart(req.user.id);
        
        const [result] = await pool.query(
            'UPDATE Cart_Items SET quantity = ? WHERE cart_ID = ? AND game_ID = ?',
            [quantity, cart.cart_ID, gameId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Item not found in cart',
                timestamp: '2025-05-05 18:43:36'
            });
        }

        res.json({ 
            message: 'Quantity updated successfully',
            timestamp: '2025-05-05 18:43:36'
        });
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ 
            message: 'Error updating quantity',
            error: error.message,
            timestamp: '2025-05-05 18:43:36'
        });
    }
});

// Remove item from cart
router.delete('/remove/:gameId', authMiddleware, async (req, res) => {
    try {
        const { gameId } = req.params;
        const cart = await getOrCreateCart(req.user.id);

        const [result] = await pool.query(
            'DELETE FROM Cart_Items WHERE cart_ID = ? AND game_ID = ?',
            [cart.cart_ID, gameId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Item not found in cart',
                timestamp: '2025-05-05 18:43:36'
            });
        }

        res.json({ 
            message: 'Item removed from cart successfully',
            timestamp: '2025-05-05 18:43:36'
        });
    } catch (error) {
        console.error('Error removing item:', error);
        res.status(500).json({ 
            message: 'Error removing item from cart',
            error: error.message,
            timestamp: '2025-05-05 18:43:36'
        });
    }
});

// Clear entire cart
router.delete('/clear', authMiddleware, async (req, res) => {
    try {
        const cart = await getOrCreateCart(req.user.id);

        await pool.query(
            'DELETE FROM Cart_Items WHERE cart_ID = ?',
            [cart.cart_ID]
        );

        res.json({ 
            message: 'Cart cleared successfully',
            timestamp: '2025-05-05 18:43:36'
        });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ 
            message: 'Error clearing cart',
            error: error.message,
            timestamp: '2025-05-05 18:43:36'
        });
    }
});

module.exports = router;
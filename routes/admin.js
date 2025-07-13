const express = require('express');
const router = express.Router();
const pool = require('../db/database');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/admin');

// Get all orders (admin only)
router.get('/orders', auth, adminAuth, async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT 
                o.*,
                u.user_Name,
                p.paymentStatus,
                p.paymentMethod
            FROM Orders o
            JOIN User u ON o.user_ID = u.user_ID
            LEFT JOIN Payment p ON o.order_ID = p.order_ID
            ORDER BY o.orderDate DESC
        `);

        // Get order details for each order
        for (let order of orders) {
            const [details] = await pool.query(`
                SELECT 
                    od.*,
                    g.title,
                    g.genre,
                    g.platform
                FROM Order_Details od
                JOIN Games g ON od.game_ID = g.game_ID
                WHERE od.order_ID = ?
            `, [order.order_ID]);
            order.items = details;
        }

        res.json({
            orders: orders,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            message: 'Error fetching orders',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get inventory status (admin only)
router.get('/inventory', auth, adminAuth, async (req, res) => {
    try {
        const [inventory] = await pool.query(`
            SELECT 
                i.*,
                g.title,
                g.price,
                g.genre,
                g.platform
            FROM Inventory i
            JOIN Games g ON i.game_ID = g.game_ID
            ORDER BY i.stockQuantity ASC
        `);

        res.json({
            inventory: inventory,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({
            message: 'Error fetching inventory',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Update inventory (admin only)
router.put('/inventory/:gameId', auth, adminAuth, async (req, res) => {
    try {
        const { gameId } = req.params;
        const { stockQuantity } = req.body;

        if (stockQuantity < 0) {
            return res.status(400).json({
                message: 'Stock quantity cannot be negative',
                timestamp: new Date().toISOString()
            });
        }

        const [result] = await pool.query(
            'UPDATE Inventory SET stockQuantity = ? WHERE game_ID = ?',
            [stockQuantity, gameId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Game not found in inventory',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            message: 'Inventory updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({
            message: 'Error updating inventory',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get all users (admin only)
router.get('/users', auth, adminAuth, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                user_ID,
                user_Name,
                email,
                role
            FROM User
            ORDER BY user_ID
        `);

        res.json({
            users: users,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            message: 'Error fetching users',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Update order status (admin only)
router.put('/orders/:orderId/status', auth, adminAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!['Pending', 'Completed', 'Cancelled'].includes(status)) {
            return res.status(400).json({
                message: 'Invalid status',
                timestamp: new Date().toISOString()
            });
        }

        const [result] = await pool.query(
            'UPDATE Orders SET status = ? WHERE order_ID = ?',
            [status, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Order not found',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            message: 'Order status updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            message: 'Error updating order status',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router; 
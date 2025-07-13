const express = require('express');
const router = express.Router();
const pool = require('../db/database');
const { auth } = require('../middleware/auth');

// Checkout and create order
router.post('/checkout', auth, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // 1. Get cart items
        const [cartItems] = await connection.query(`
            SELECT 
                c.*,
                g.price,
                g.title
            FROM Cart c
            JOIN Games g ON c.game_id = g.game_ID
            WHERE c.user_id = ?
        `, [req.user.id]);

        if (cartItems.length === 0) {
            return res.status(400).json({
                message: 'Cart is empty',
                timestamp: new Date().toISOString()
            });
        }

        // 2. Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0);

        // 3. Create order
        const [orderResult] = await connection.query(
            'INSERT INTO Orders (user_ID, orderDate, totalAmount, status) VALUES (?, NOW(), ?, ?)',
            [req.user.id, totalAmount, 'Pending']
        );
        const orderId = orderResult.insertId;

        // 4. Create order details
        for (const item of cartItems) {
            await connection.query(
                'INSERT INTO Order_Details (order_ID, game_ID, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.game_id, item.quantity, item.price]
            );

        }

        // 5. Create payment record
        const [paymentResult] = await connection.query(
            'INSERT INTO Payment (order_ID, paymentDate, paymentStatus, paymentMethod) VALUES (?, NOW(), ?, ?)',
            [orderId, 'Paid', 'Credit Card'] 
        );

        // 6. Update order status
        await connection.query(
            'UPDATE Orders SET status = ? WHERE order_ID = ?',
            ['Completed', orderId]
        );

        // 7. Clear the cart
        await connection.query(
            'DELETE FROM Cart WHERE user_id = ?',
            [req.user.id]
        );

        await connection.commit();

        res.json({
            message: 'Order placed successfully',
            orderId: orderId,
            totalAmount: totalAmount,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error during checkout:', error);
        res.status(500).json({
            message: 'Error processing checkout',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        connection.release();
    }
});

// Get user's orders
router.get('/my-orders', auth, async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT 
                o.*,
                p.paymentStatus,
                p.paymentMethod
            FROM Orders o
            LEFT JOIN Payment p ON o.order_ID = p.order_ID
            WHERE o.user_ID = ?
            ORDER BY o.orderDate DESC
        `, [req.user.id]);

        // Get order details for each order
        for (let order of orders) {
            const [details] = await pool.query(`
                SELECT 
                    od.*,
                    g.title,
                    g.genre,
                    g.platform
                    g.image_url
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

// Get specific order details
router.get('/:orderId', auth, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Get order with payment info
        const [orders] = await pool.query(`
            SELECT 
                o.*,
                p.paymentStatus,
                p.paymentMethod
            FROM Orders o
            LEFT JOIN Payment p ON o.order_ID = p.order_ID
            WHERE o.order_ID = ? AND o.user_ID = ?
        `, [orderId, req.user.id]);

        if (orders.length === 0) {
            return res.status(404).json({
                message: 'Order not found',
                timestamp: new Date().toISOString()
            });
        }

        const order = orders[0];

        // Get order details
        const [details] = await pool.query(`
            SELECT 
                od.*,
                g.title,
                g.genre,
                g.platform
            FROM Order_Details od
            JOIN Games g ON od.game_ID = g.game_ID
            WHERE od.order_ID = ?
        `, [orderId]);

        order.items = details;

        res.json({
            order: order,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            message: 'Error fetching order details',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Create a new order
router.post('/', auth, async (req, res) => {
    const { game_ID, quantity } = req.body;
    const user_ID = req.user.user_ID;

    try {
        // First check if the game exists in inventory
        const [inventory] = await pool.query(
            'SELECT * FROM Inventory WHERE game_ID = ?',
            [game_ID]
        );

        if (inventory.length === 0) {
            return res.status(400).json({ 
                message: 'This game is not available in inventory' 
            });
        }

        // Check if requested quantity is available
        if (inventory[0].quantity < quantity) {
            return res.status(400).json({ 
                message: 'Requested quantity not available in inventory' 
            });
        }

        // Start transaction
        await pool.query('START TRANSACTION');

        // Create order
        const [orderResult] = await pool.query(
            'INSERT INTO Orders (user_ID, game_ID, quantity, order_date, status) VALUES (?, ?, ?, NOW(), "pending")',
            [user_ID, game_ID, quantity]
        );

        // Update inventory
        await pool.query(
            'UPDATE Inventory SET quantity = quantity - ? WHERE game_ID = ?',
            [quantity, game_ID]
        );

        // Commit transaction
        await pool.query('COMMIT');

        res.status(201).json({
            message: 'Order placed successfully',
            order_ID: orderResult.insertId
        });

    } catch (error) {
        // Rollback in case of error
        await pool.query('ROLLBACK');
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Error placing order' });
    }
});

module.exports = router; 
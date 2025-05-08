const mysql = require('mysql2');

// Use the same config object
const config = {
    currentTime: '2025-05-05 17:44:58',
    currentUser: 'RaniaShoaib89',
    database: {
        host: 'localhost',
        user: 'root',
        password: 'Morley_minto4321',
        name: 'GAME_STORE'
    }
};

// Create the connection pool
const pool = mysql.createPool({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convert pool to use promises
const promisePool = pool.promise();

// Test the connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database Connection Failed:', err.message);
    } else {
        console.log('✅ Database Connection Successful!');
        console.log(`Connected as ID: ${connection.threadId}`);
        console.log(`Time: ${config.currentTime}`);
        console.log(`User: ${config.currentUser}`);
        connection.release();
    }
});

module.exports = promisePool;
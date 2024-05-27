const express = require('express');
const mysql = require('promise-mysql');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
// const bcrypt = require('bcryptjs');
const cors = require('cors');
// const jwt=require('jsonwebtoken');
// const AWS = require('aws-sdk');
// const multer = require('multer');
// const multerS3 = require('multer-s3');
// const path = require('path');
const PORT = 5000;
const app=express();
app.use(bodyParser.json());
app.use(express.json());
app.use(cors({
    origin: '*', // Allow requests from all origins, replace '*' with your frontend domain if needed
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow the specified HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow the specified headers
}));




 const createTcpPool = async (config) => {
    const dbConfig = {
        host: '34.66.234.203',
        port: '3306',
        user: 'insert_ac',
        password: 'google@123',
        database: 'abc_da',
        ...config,
    };
    return mysql.createPool(dbConfig);
};

const createPool = async () => {
    return createTcpPool({
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });
};

let pool;

(async () => {
    try {
        pool = await createPool();
        console.log('MySQL connection pool initialized.');
    } catch (error) {
        console.error('Error initializing MySQL connection pool:', error);
    }
})();

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    console.log('Client connected');
    // WebSocket message handling
});




const signup = async (req, res) => {
    try {
        const { first_name, last_name, email_id, password,company_name } = req.body;

        if (!first_name || !last_name || !email_id || !password|| !company_name) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const connection = await pool.getConnection();
        try {
            // Check if user already exists
            const queryExistingUser = `SELECT * FROM user_data WHERE email_id = ?`;
            const existingUser = await connection.query(queryExistingUser, [email_id]);
            if (existingUser.length > 0) {
                return res.status(400).json({ message: 'User already exists' });
            }
            // Hash the password
            // const secretkey='waris1918'
            // const hashedPassword =jwt.sign({password},secretkey,{expiresIn:'36500d'});
            // const pass=hashedPassword;
            
            // Create user and hash data
            const queryCreateUser = `
                INSERT INTO user_data (first_name, last_name, email_id,company_name) VALUES (?, ?, ?,?)
            `;
            const resultUser = await connection.query(queryCreateUser, [first_name, last_name, email_id,company_name]);
            const userId = resultUser.insertId;
            console.log(userId)
            const queryforHashEntry=`SELECT user_id FROM abc_da.user_data WHERE email_id=?`;
            const resultquery=await connection.query(queryforHashEntry,[email_id]);
            console.log(resultquery);
            const queryCreateHashData = `insert into hash_data(user_id, hash_value) VALUES(?, ?);`;
            const resultHash = await connection.query(queryCreateHashData, [userId,password]);
            const hashId = resultHash.insertId;

            res.status(201).json({ message: 'User created successfully', userId,hashId });
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ message: 'Server error' });
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: err.message });
    }
};


const sign = async (req, res) => {
    try {
        const { email_id, password } = req.body;
        const connection = await pool.getConnection();

        try {
            // Check if user exists
            const queryExistingUser = `SELECT * FROM user_data WHERE email_id = ?`;
            const [existingUser] = await connection.query(queryExistingUser, [email_id]);

            if (existingUser.length === 0) {
                return res.status(400).json({ message: 'Email not registered' });
            } else {
                const queryForHashEntry = `
                    SELECT hash_data.hash_value 
                    FROM user_data 
                    JOIN hash_data ON user_data.user_id = hash_data.user_id
                    WHERE user_data.email_id = ?;
                `;
                const [hashResult] = await connection.query(queryForHashEntry, [email_id]);

                if (hashResult.length === 0) {
                    return res.status(500).json({ message: 'Hash not found for user' });
                }
               const val=hashResult.hash_value;
                console.log(password);
                console.log(hashResult.hash_value)
                if (val===password) {
                    return res.json({ message: 'Password matched' });
                } else {
                    return res.status(400).json({ message: 'Password incorrect' });
                }
            }
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ message: 'Server error' });
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// Auth route
app.post('/api/auth/login',sign);
app.post('/api/auth/signup', signup);

// HTTP Server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Upgrade HTTP Server for WebSocket
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Enable SSL when connecting to TiDB Cloud or when DB_SSL is set
const sslOptions = process.env.DB_SSL === 'true' || (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com'))
  ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  : undefined;

// Create reusable MySQL connection pool using promises
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 4000,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'expenseflow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true, // Return MySQL DATE/DATETIME as exact strings to prevent UTC timezone shifts
  ...(sslOptions && { ssl: sslOptions })
});

module.exports = pool;

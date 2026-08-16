const pool = require('./config/db');

async function testDatabaseConnection() {
  console.log('Testing MySQL Database Connection...');
  console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`User: ${process.env.DB_USER}`);

  try {
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to MySQL database!');

    // Test basic query
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log('✅ Simple query test output:', rows[0]);

    // Check if tables exist
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 Current tables in database:', tables.map(t => Object.values(t)[0]));

    // Try selecting categories if category table exists
    try {
      const [categories] = await connection.query('SELECT * FROM categories');
      console.log('🏷️ Categories found:', categories.map(c => c.name));
    } catch (catErr) {
      console.log('ℹ️ Categories table not yet populated or schema not loaded yet.');
    }

    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Connection Failed!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('\nTroubleshooting Checklist:');
    console.error('1. Is your MySQL service running?');
    console.error('2. Did you create the "expenseflow" database and import database/schema.sql?');
    console.error('3. Are your credentials correct in server/.env?');
    process.exit(1);
  }
}

testDatabaseConnection();

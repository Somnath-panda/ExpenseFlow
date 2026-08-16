const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function initializeDatabase() {
  console.log('Initializing ExpenseFlow Database...');
  console.log(`Connecting to MySQL host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306} as user '${process.env.DB_USER}'`);

  try {
    // 1. Connect without selecting database to ensure database exists
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL Server');

    // 2. Read schema.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const sqlScript = fs.readFileSync(schemaPath, 'utf8');

    // 3. Execute multi-statement SQL script
    console.log('📄 Executing database/schema.sql...');
    await connection.query(sqlScript);

    console.log('🎉 Database and tables initialized successfully!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize database!');
    console.error('Error:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. MySQL server is running.');
    console.error('2. Update server/.env with your correct DB_PASSWORD.');
    console.error('3. Run "npm run init-db" again.');
    process.exit(1);
  }
}

initializeDatabase();

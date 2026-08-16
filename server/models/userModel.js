const pool = require('../config/db');

const userModel = {
  // Create a new user in the database
  async create(name, email, passwordHash) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );
    return result.insertId;
  },

  // Find user by email (includes password hash for auth comparison)
  async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT id, name, email, password, created_at FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  // Find user by ID (excludes password for security)
  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }
};

module.exports = userModel;

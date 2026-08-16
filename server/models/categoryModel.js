const pool = require('../config/db');

const categoryModel = {
  // Fetch all categories
  async getAll() {
    const [rows] = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
    return rows;
  },

  // Find category by ID
  async findById(id) {
    const [rows] = await pool.query('SELECT id, name FROM categories WHERE id = ?', [id]);
    return rows[0] || null;
  }
};

module.exports = categoryModel;

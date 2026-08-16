const pool = require('../config/db');

const expenseModel = {
  // Create a new expense record
  async create({ user_id, category_id, title, amount, description, expense_date }) {
    const [result] = await pool.query(
      `INSERT INTO expenses (user_id, category_id, title, amount, description, expense_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, category_id, title, amount, description || null, expense_date]
    );
    return result.insertId;
  },

  // Fetch a single expense belonging to a specific user
  async findById(id, user_id) {
    const [rows] = await pool.query(
      `SELECT e.id, e.user_id, e.category_id, c.name AS category_name, e.title,
              CAST(e.amount AS DOUBLE) AS amount, e.description, e.expense_date, e.created_at
       FROM expenses e
       JOIN categories c ON e.category_id = c.id
       WHERE e.id = ? AND e.user_id = ?`,
      [id, user_id]
    );
    return rows[0] || null;
  },

  // Fetch all expenses for a user with dynamic filtering and search
  async findAll(user_id, filters = {}) {
    let sql = `
      SELECT e.id, e.user_id, e.category_id, c.name AS category_name, e.title,
             CAST(e.amount AS DOUBLE) AS amount, e.description, e.expense_date, e.created_at
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ?
    `;
    const params = [user_id];

    // Filter by Category (Category ID or Category Name)
    if (filters.category) {
      if (!isNaN(filters.category)) {
        sql += ` AND e.category_id = ?`;
        params.push(parseInt(filters.category, 10));
      } else {
        sql += ` AND LOWER(c.name) = LOWER(?)`;
        params.push(filters.category.trim());
      }
    }

    // Filter by Month (1-12)
    if (filters.month) {
      const monthNum = parseInt(filters.month, 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        sql += ` AND MONTH(e.expense_date) = ?`;
        params.push(monthNum);
      }
    }

    // Filter by Year
    if (filters.year) {
      const yearNum = parseInt(filters.year, 10);
      if (!isNaN(yearNum)) {
        sql += ` AND YEAR(e.expense_date) = ?`;
        params.push(yearNum);
      }
    }

    // Filter by Minimum Amount
    if (filters.minAmount !== undefined && filters.minAmount !== '') {
      const min = parseFloat(filters.minAmount);
      if (!isNaN(min)) {
        sql += ` AND e.amount >= ?`;
        params.push(min);
      }
    }

    // Filter by Maximum Amount
    if (filters.maxAmount !== undefined && filters.maxAmount !== '') {
      const max = parseFloat(filters.maxAmount);
      if (!isNaN(max)) {
        sql += ` AND e.amount <= ?`;
        params.push(max);
      }
    }

    // Search by title or description
    if (filters.search) {
      const searchTerm = `%${filters.search.trim()}%`;
      sql += ` AND (e.title LIKE ? OR e.description LIKE ?)`;
      params.push(searchTerm, searchTerm);
    }

    // Newest expenses first
    sql += ` ORDER BY e.expense_date DESC, e.created_at DESC`;

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  // Update an existing expense belonging to user
  async update(id, user_id, data) {
    const fields = [];
    const params = [];

    if (data.category_id !== undefined) {
      fields.push('category_id = ?');
      params.push(data.category_id);
    }
    if (data.title !== undefined) {
      fields.push('title = ?');
      params.push(data.title);
    }
    if (data.amount !== undefined) {
      fields.push('amount = ?');
      params.push(data.amount);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description);
    }
    if (data.expense_date !== undefined) {
      fields.push('expense_date = ?');
      params.push(data.expense_date);
    }

    if (fields.length === 0) return false;

    const sql = `UPDATE expenses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    params.push(id, user_id);

    const [result] = await pool.query(sql, params);
    return result.affectedRows > 0;
  },

  // Delete an expense belonging to user
  async delete(id, user_id) {
    const [result] = await pool.query(
      'DELETE FROM expenses WHERE id = ? AND user_id = ?',
      [id, user_id]
    );
    return result.affectedRows > 0;
  }
};

module.exports = expenseModel;

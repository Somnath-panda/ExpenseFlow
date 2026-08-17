const pool = require('../config/db');

const budgetModel = {
  // 1. Insert or update a monthly budget safely
  async upsertBudget({ user_id, month, year, amount }) {
    const [result] = await pool.query(
      `INSERT INTO budgets (user_id, month, year, amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [user_id, month, year, amount]
    );
    return result;
  },

  // 2. Fetch budget details and compute spending, remaining, percentage, and threshold status
  async getBudgetDetails(userId, month, year) {
    const targetMonth = parseInt(month, 10) || (new Date().getMonth() + 1);
    const targetYear = parseInt(year, 10) || new Date().getFullYear();

    // Fetch budget record
    const [budgetRows] = await pool.query(
      `SELECT id, user_id, month, year, CAST(amount AS DOUBLE) AS amount, created_at
       FROM budgets
       WHERE user_id = ? AND month = ? AND year = ?`,
      [userId, targetMonth, targetYear]
    );

    // Fetch total expenses for that month & year
    const [expenseRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalSpent, COUNT(id) AS transactionCount
       FROM expenses
       WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?`,
      [userId, targetMonth, targetYear]
    );

    const budget = budgetRows[0] ? parseFloat(Number(budgetRows[0].amount).toFixed(2)) : 0;
    const spent = parseFloat(Number(expenseRows[0]?.totalSpent || 0).toFixed(2));
    const transactionCount = parseInt(expenseRows[0]?.transactionCount || 0, 10);
    const remaining = parseFloat(Number(budget - spent).toFixed(2));
    const percentageUsed = budget > 0 ? parseFloat(((spent / budget) * 100).toFixed(1)) : 0;

    let status = 'normal'; // 'normal' (0-79%), 'warning' (80-99%), 'exceeded' (100%+)
    let alertMessage = 'You are within your monthly budget limit.';

    if (budget === 0) {
      status = 'unbudgeted';
      alertMessage = 'No budget has been set for this month.';
    } else if (percentageUsed >= 100) {
      status = 'exceeded';
      const exceededBy = Math.abs(remaining);
      alertMessage = `Budget exceeded by ₹${exceededBy.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
    } else if (percentageUsed >= 80) {
      status = 'warning';
      alertMessage = `⚠️ You have used ${percentageUsed}% of your monthly budget.`;
    }

    return {
      month: targetMonth,
      year: targetYear,
      budget,
      spent,
      remaining,
      percentageUsed,
      transactionCount,
      status,
      alertMessage,
      isSet: Boolean(budgetRows[0])
    };
  },

  // 3. Fetch all historical budgets for a user
  async getAllBudgets(userId) {
    const [rows] = await pool.query(
      `SELECT 
         b.id, b.month, b.year, CAST(b.amount AS DOUBLE) AS budget_amount,
         COALESCE(SUM(e.amount), 0) AS total_spent,
         COUNT(e.id) AS transaction_count
       FROM budgets b
       LEFT JOIN expenses e ON e.user_id = b.user_id 
                           AND MONTH(e.expense_date) = b.month 
                           AND YEAR(e.expense_date) = b.year
       WHERE b.user_id = ?
       GROUP BY b.id, b.month, b.year, b.amount
       ORDER BY b.year DESC, b.month DESC`,
      [userId]
    );

    return rows.map(r => {
      const budget = parseFloat(Number(r.budget_amount).toFixed(2));
      const spent = parseFloat(Number(r.total_spent).toFixed(2));
      const remaining = parseFloat(Number(budget - spent).toFixed(2));
      const percentageUsed = budget > 0 ? parseFloat(((spent / budget) * 100).toFixed(1)) : 0;
      return {
        id: r.id,
        month: r.month,
        year: r.year,
        budget,
        spent,
        remaining,
        percentageUsed,
        transactionCount: parseInt(r.transaction_count, 10)
      };
    });
  }
};

module.exports = budgetModel;

const pool = require('../config/db');

const dashboardModel = {
  // 1. Calculate overall and current-month summary KPIs
  async getSummary(userId) {
    // Total expenses, transaction count, highest, average
    const [overallRows] = await pool.query(
      `SELECT 
         COALESCE(SUM(amount), 0) AS totalExpenses,
         COUNT(*) AS transactionCount,
         COALESCE(MAX(amount), 0) AS highestExpense,
         COALESCE(AVG(amount), 0) AS averageExpense
       FROM expenses 
       WHERE user_id = ?`,
      [userId]
    );

    // Current month expenses
    const [monthlyRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS monthlyExpenses
       FROM expenses 
       WHERE user_id = ? 
         AND MONTH(expense_date) = MONTH(CURRENT_DATE()) 
         AND YEAR(expense_date) = YEAR(CURRENT_DATE())`,
      [userId]
    );

    // Current month budget
    const [budgetRows] = await pool.query(
      `SELECT COALESCE(amount, 0) AS monthlyBudget
       FROM budgets 
       WHERE user_id = ? 
         AND month = MONTH(CURRENT_DATE()) 
         AND year = YEAR(CURRENT_DATE())`,
      [userId]
    );

    const totalExpenses = parseFloat(Number(overallRows[0]?.totalExpenses || 0).toFixed(2));
    const transactionCount = parseInt(overallRows[0]?.transactionCount || 0, 10);
    const highestExpense = parseFloat(Number(overallRows[0]?.highestExpense || 0).toFixed(2));
    const averageExpense = parseFloat(Number(overallRows[0]?.averageExpense || 0).toFixed(2));

    const monthlyExpenses = parseFloat(Number(monthlyRows[0]?.monthlyExpenses || 0).toFixed(2));
    const monthlyBudget = parseFloat(Number(budgetRows[0]?.monthlyBudget || 0).toFixed(2));
    const remainingBudget = parseFloat(Number(monthlyBudget - monthlyExpenses).toFixed(2));

    return {
      totalExpenses,
      monthlyExpenses,
      monthlyBudget,
      remainingBudget,
      transactionCount,
      highestExpense,
      averageExpense
    };
  },

  // 2. Calculate category breakdown spending
  async getCategorySummary(userId) {
    const [rows] = await pool.query(
      `SELECT 
         c.id AS category_id,
         c.name AS category_name,
         COALESCE(SUM(e.amount), 0) AS total_amount,
         COUNT(e.id) AS count
       FROM categories c
       LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = ?
       GROUP BY c.id, c.name
       HAVING total_amount > 0
       ORDER BY total_amount DESC`,
      [userId]
    );

    let overallSum = 0;
    const categories = rows.map(r => {
      const amount = parseFloat(Number(r.total_amount).toFixed(2));
      overallSum += amount;
      return {
        id: r.category_id,
        name: r.category_name,
        amount,
        count: parseInt(r.count, 10)
      };
    });

    const categorySummary = categories.map(cat => ({
      ...cat,
      percentage: overallSum > 0 ? parseFloat(((cat.amount / overallSum) * 100).toFixed(1)) : 0
    }));

    return {
      totalSpending: parseFloat(overallSum.toFixed(2)),
      categories: categorySummary
    };
  },

  // 3. Calculate 12-month spending trend for a given year
  async getMonthlySummary(userId, year = new Date().getFullYear()) {
    const targetYear = parseInt(year, 10) || new Date().getFullYear();

    const [rows] = await pool.query(
      `SELECT 
         MONTH(expense_date) AS month,
         COALESCE(SUM(amount), 0) AS total_amount,
         COUNT(id) AS count
       FROM expenses
       WHERE user_id = ? AND YEAR(expense_date) = ?
       GROUP BY MONTH(expense_date)
       ORDER BY month ASC`,
      [userId, targetYear]
    );

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthlyMap = {};
    rows.forEach(r => {
      monthlyMap[r.month] = {
        amount: parseFloat(Number(r.total_amount).toFixed(2)),
        count: parseInt(r.count, 10)
      };
    });

    const months = monthNames.map((name, index) => {
      const monthNumber = index + 1;
      const data = monthlyMap[monthNumber] || { amount: 0, count: 0 };
      return {
        month: monthNumber,
        name,
        amount: data.amount,
        count: data.count
      };
    });

    return {
      year: targetYear,
      months
    };
  }
};

module.exports = dashboardModel;

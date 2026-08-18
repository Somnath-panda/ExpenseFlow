const budgetModel = require('../models/budgetModel');

const MAX_BUDGET_AMOUNT = 999999999.99;

const budgetController = {
  // GET /api/budget
  async getBudget(req, res, next) {
    try {
      const userId = req.user.id;
      const month = req.query.month ? parseInt(req.query.month, 10) : (new Date().getMonth() + 1);
      const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

      if (isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({
          success: false,
          message: 'Invalid month. Month must be an integer between 1 and 12.'
        });
      }

      if (isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year. Year must be a valid 4-digit year between 2000 and 2100.'
        });
      }

      const budgetData = await budgetModel.getBudgetDetails(userId, month, year);
      const allBudgets = req.query.history === 'true' ? await budgetModel.getAllBudgets(userId) : undefined;

      return res.status(200).json({
        success: true,
        message: 'Budget details retrieved successfully',
        data: {
          ...budgetData,
          ...(allBudgets && { history: allBudgets })
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/budget
  async setBudget(req, res, next) {
    try {
      const userId = req.user.id;
      const { month, year, amount } = req.body;

      const parsedMonth = parseInt(month, 10);
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month is required and must be an integer between 1 and 12.'
        });
      }

      const parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Year is required and must be a valid 4-digit year between 2000 and 2100.'
        });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount is required and must be a positive number greater than 0.'
        });
      }

      if (parsedAmount > MAX_BUDGET_AMOUNT) {
        return res.status(400).json({
          success: false,
          message: `Budget amount cannot exceed ₹${MAX_BUDGET_AMOUNT.toLocaleString('en-IN')}.`
        });
      }

      await budgetModel.upsertBudget({
        user_id: userId,
        month: parsedMonth,
        year: parsedYear,
        amount: parsedAmount
      });

      const updatedBudget = await budgetModel.getBudgetDetails(userId, parsedMonth, parsedYear);

      return res.status(201).json({
        success: true,
        message: 'Monthly budget set successfully',
        data: updatedBudget
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/budget
  async updateBudget(req, res, next) {
    try {
      const userId = req.user.id;
      const { month, year, amount } = req.body;

      const parsedMonth = parseInt(month, 10);
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month is required and must be an integer between 1 and 12.'
        });
      }

      const parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Year is required and must be a valid 4-digit year between 2000 and 2100.'
        });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount is required and must be a positive number greater than 0.'
        });
      }

      if (parsedAmount > MAX_BUDGET_AMOUNT) {
        return res.status(400).json({
          success: false,
          message: `Budget amount cannot exceed ₹${MAX_BUDGET_AMOUNT.toLocaleString('en-IN')}.`
        });
      }

      await budgetModel.upsertBudget({
        user_id: userId,
        month: parsedMonth,
        year: parsedYear,
        amount: parsedAmount
      });

      const updatedBudget = await budgetModel.getBudgetDetails(userId, parsedMonth, parsedYear);

      return res.status(200).json({
        success: true,
        message: 'Monthly budget updated successfully',
        data: updatedBudget
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = budgetController;

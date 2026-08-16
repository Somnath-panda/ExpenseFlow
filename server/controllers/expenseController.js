const expenseModel = require('../models/expenseModel');
const categoryModel = require('../models/categoryModel');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const expenseController = {
  // POST /api/expenses
  async createExpense(req, res, next) {
    try {
      const { title, amount, category_id, description, expense_date } = req.body;
      const user_id = req.user.id; // Enforce authenticated user's ID

      // 1. Validate Title
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Title is required and must not be empty.'
        });
      }

      // 2. Validate Amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount is required and must be greater than 0.'
        });
      }

      // 3. Validate Category ID
      const parsedCategoryId = parseInt(category_id, 10);
      if (isNaN(parsedCategoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Category ID is required and must be a valid integer.'
        });
      }

      const categoryExists = await categoryModel.findById(parsedCategoryId);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID. Category does not exist.'
        });
      }

      // 4. Validate Expense Date
      if (!expense_date || !DATE_REGEX.test(expense_date)) {
        return res.status(400).json({
          success: false,
          message: 'Expense date is required and must be in YYYY-MM-DD format.'
        });
      }

      // 5. Create Expense
      const insertId = await expenseModel.create({
        user_id,
        category_id: parsedCategoryId,
        title: title.trim(),
        amount: parsedAmount,
        description: description ? description.trim() : null,
        expense_date
      });

      const newExpense = await expenseModel.findById(insertId, user_id);

      return res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        data: {
          expense: newExpense
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/expenses
  async getExpenses(req, res, next) {
    try {
      const user_id = req.user.id;
      const filters = {
        category: req.query.category,
        month: req.query.month,
        year: req.query.year,
        minAmount: req.query.minAmount || req.query.min_amount,
        maxAmount: req.query.maxAmount || req.query.max_amount,
        search: req.query.search
      };

      const expenses = await expenseModel.findAll(user_id, filters);

      return res.status(200).json({
        success: true,
        message: 'Expenses retrieved successfully',
        data: {
          count: expenses.length,
          expenses
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/expenses/:id
  async getExpenseById(req, res, next) {
    try {
      const expenseId = parseInt(req.params.id, 10);
      if (isNaN(expenseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid expense ID parameter.'
        });
      }

      const expense = await expenseModel.findById(expenseId, req.user.id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Expense retrieved successfully',
        data: {
          expense
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/expenses/:id
  async updateExpense(req, res, next) {
    try {
      const expenseId = parseInt(req.params.id, 10);
      if (isNaN(expenseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid expense ID parameter.'
        });
      }

      const user_id = req.user.id;

      // 1. Verify existence & ownership
      const existingExpense = await expenseModel.findById(expenseId, user_id);
      if (!existingExpense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found.'
        });
      }

      const { title, amount, category_id, description, expense_date } = req.body;
      const updateData = {};

      // 2. Validate optional updates
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Title must not be empty.'
          });
        }
        updateData.title = title.trim();
      }

      if (amount !== undefined) {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Amount must be a number greater than 0.'
          });
        }
        updateData.amount = parsedAmount;
      }

      if (category_id !== undefined) {
        const parsedCategoryId = parseInt(category_id, 10);
        if (isNaN(parsedCategoryId)) {
          return res.status(400).json({
            success: false,
            message: 'Category ID must be a valid integer.'
          });
        }
        const categoryExists = await categoryModel.findById(parsedCategoryId);
        if (!categoryExists) {
          return res.status(400).json({
            success: false,
            message: 'Invalid category ID. Category does not exist.'
          });
        }
        updateData.category_id = parsedCategoryId;
      }

      if (description !== undefined) {
        updateData.description = description ? description.trim() : null;
      }

      if (expense_date !== undefined) {
        if (!DATE_REGEX.test(expense_date)) {
          return res.status(400).json({
            success: false,
            message: 'Expense date must be in YYYY-MM-DD format.'
          });
        }
        updateData.expense_date = expense_date;
      }

      // 3. Perform update
      await expenseModel.update(expenseId, user_id, updateData);
      const updatedExpense = await expenseModel.findById(expenseId, user_id);

      return res.status(200).json({
        success: true,
        message: 'Expense updated successfully',
        data: {
          expense: updatedExpense
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/expenses/:id
  async deleteExpense(req, res, next) {
    try {
      const expenseId = parseInt(req.params.id, 10);
      if (isNaN(expenseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid expense ID parameter.'
        });
      }

      const user_id = req.user.id;

      // Verify existence & ownership
      const existingExpense = await expenseModel.findById(expenseId, user_id);
      if (!existingExpense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found.'
        });
      }

      await expenseModel.delete(expenseId, user_id);

      return res.status(200).json({
        success: true,
        message: 'Expense deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = expenseController;

const dashboardModel = require('../models/dashboardModel');

const dashboardController = {
  // GET /api/dashboard/summary
  async getSummary(req, res, next) {
    try {
      const userId = req.user.id;
      const summary = await dashboardModel.getSummary(userId);

      return res.status(200).json({
        success: true,
        message: 'Dashboard summary retrieved successfully',
        data: summary
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/dashboard/category-summary
  async getCategorySummary(req, res, next) {
    try {
      const userId = req.user.id;
      const categorySummary = await dashboardModel.getCategorySummary(userId);

      return res.status(200).json({
        success: true,
        message: 'Category summary retrieved successfully',
        data: categorySummary
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/dashboard/monthly-summary
  async getMonthlySummary(req, res, next) {
    try {
      const userId = req.user.id;
      const year = req.query.year || new Date().getFullYear();
      const monthlySummary = await dashboardModel.getMonthlySummary(userId, year);

      return res.status(200).json({
        success: true,
        message: 'Monthly summary retrieved successfully',
        data: monthlySummary
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = dashboardController;

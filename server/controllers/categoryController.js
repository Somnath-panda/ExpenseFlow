const categoryModel = require('../models/categoryModel');

const categoryController = {
  // GET /api/categories
  async getCategories(req, res, next) {
    try {
      const categories = await categoryModel.getAll();
      return res.status(200).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: {
          categories
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = categoryController;

const express = require('express');
const router = express.Router();
const { Op, fn, col } = require('sequelize');
const db = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCreateCategory, validateUUIDParam } = require('../middleware/validate');

const Category = db.Category;
const Book = db.Book;

// ─────────────────────────────────────────────
// GET / — List all categories with book counts
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']],
    });

    // Recalculate actual book counts from the books table for accuracy
    const bookCounts = await Book.findAll({
      where: { isActive: true },
      attributes: [
        'category',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['category'],
      raw: true,
    });

    const countMap = {};
    for (const bc of bookCounts) {
      countMap[bc.category] = parseInt(bc.count, 10);
    }

    const categoriesWithCounts = categories.map((cat) => {
      const catJSON = cat.toJSON();
      catJSON.bookCount = countMap[catJSON.name] || 0;
      return catJSON;
    });

    res.json({
      success: true,
      data: categoriesWithCounts,
    });
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving categories',
    });
  }
});

// ─────────────────────────────────────────────
// POST / — Create a category (admin only)
// ─────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validateCreateCategory,
  async (req, res) => {
    try {
      const { name, description, icon } = req.body;

      const existing = await Category.findOne({ where: { name } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Category already exists',
        });
      }

      const category = await Category.create({ name, description, icon });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error) {
      console.error('Error creating category:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Category already exists',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating category',
      });
    }
  }
);

// ─────────────────────────────────────────────
// PUT /:id — Update a category (admin only)
// ─────────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validateUUIDParam,
  validateCreateCategory,
  async (req, res) => {
    try {
      const category = await Category.findByPk(req.params.id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      const { name, description, icon } = req.body;

      // If renaming, check for duplicate
      if (name && name !== category.name) {
        const existing = await Category.findOne({ where: { name } });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'A category with this name already exists',
          });
        }

        // Update book records that reference the old category name
        await Book.update(
          { category: name },
          { where: { category: category.name } }
        );
      }

      await category.update({
        name: name || category.name,
        description: description !== undefined ? description : category.description,
        icon: icon !== undefined ? icon : category.icon,
      });

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category,
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating category',
      });
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /:id — Delete a category (admin only)
// ─────────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validateUUIDParam,
  async (req, res) => {
    try {
      const category = await Category.findByPk(req.params.id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      // Check if books exist in this category
      const bookCount = await Book.count({
        where: { category: category.name, isActive: true },
      });

      if (bookCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category: ${bookCount} active book(s) still belong to this category. Reassign them first.`,
        });
      }

      await category.destroy();

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting category',
      });
    }
  }
);

module.exports = router;

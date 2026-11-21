const express = require('express');
const { param, query, body } = require('express-validator');
const { Op } = require('sequelize');
const validate = require('../middleware/validate');
const { authenticateToken, authorize } = require('../middleware/auth');
const { User } = require('../models');
const { activeUsers } = require('../utils/metrics');

const router = express.Router();

// All user management routes require authentication
router.use(authenticateToken);

// ─── GET /stats/overview ─────────────────────────────────────────────────────
// Must be defined BEFORE /:id to avoid route conflict
router.get(
  '/stats/overview',
  authorize('admin'),
  async (req, res, next) => {
    try {
      const totalUsers = await User.count();
      const activeUsersCount = await User.count({ where: { isActive: true } });
      const inactiveUsersCount = await User.count({ where: { isActive: false } });

      const studentCount = await User.count({ where: { role: 'student', isActive: true } });
      const librarianCount = await User.count({ where: { role: 'librarian', isActive: true } });
      const adminCount = await User.count({ where: { role: 'admin', isActive: true } });

      // New users this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newThisMonth = await User.count({
        where: {
          createdAt: { [Op.gte]: startOfMonth },
        },
      });

      // Update Prometheus gauge
      activeUsers.set(activeUsersCount);

      res.json({
        success: true,
        data: {
          total: totalUsers,
          active: activeUsersCount,
          inactive: inactiveUsersCount,
          byRole: {
            student: studentCount,
            librarian: librarianCount,
            admin: adminCount,
          },
          newThisMonth,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET / ───────────────────────────────────────────────────────────────────
router.get(
  '/',
  authorize('admin', 'librarian'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .trim(),
    query('role')
      .optional()
      .isIn(['student', 'librarian', 'admin'])
      .withMessage('Role must be student, librarian, or admin'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const { search, role, isActive } = req.query;

      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (role) {
        whereClause.role = role;
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['password', 'refreshToken'] },
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            hasNextPage: page * limit < count,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /:id ────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  authorize('admin', 'librarian'),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid user ID format'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id, {
        attributes: { exclude: ['password', 'refreshToken'] },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PUT /:id/role ───────────────────────────────────────────────────────────
router.put(
  '/:id/role',
  authorize('admin'),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid user ID format'),
    body('role')
      .isIn(['student', 'librarian', 'admin'])
      .withMessage('Role must be student, librarian, or admin'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      // Prevent admin from changing their own role
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own role.',
        });
      }

      await user.update({ role: req.body.role });

      res.json({
        success: true,
        message: `User role updated to '${req.body.role}' successfully.`,
        data: { user: user.toJSON() },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PUT /:id/status ─────────────────────────────────────────────────────────
router.put(
  '/:id/status',
  authorize('admin'),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid user ID format'),
    body('isActive')
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      // Prevent admin from deactivating themselves
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own account status.',
        });
      }

      await user.update({ isActive: req.body.isActive });

      const statusText = req.body.isActive ? 'activated' : 'deactivated';
      res.json({
        success: true,
        message: `User account ${statusText} successfully.`,
        data: { user: user.toJSON() },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /:id ─────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  authorize('admin'),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid user ID format'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }

      // Prevent admin from deleting themselves
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account.',
        });
      }

      // Soft delete: set isActive to false
      await user.update({ isActive: false });

      res.json({
        success: true,
        message: 'User soft-deleted (deactivated) successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

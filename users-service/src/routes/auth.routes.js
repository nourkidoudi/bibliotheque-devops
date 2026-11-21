const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { User } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/token');
const { REFRESH_COOKIE, setRefreshCookie, clearRefreshCookie } = require('../utils/cookies');

const router = express.Router();

// ─── POST /register ─────────────────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 100 })
      .withMessage('First name must be at most 100 characters'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 100 })
      .withMessage('Last name must be at most 100 characters'),
    body('studentId')
      .optional()
      .trim(),
    body('department')
      .optional()
      .trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, studentId, department } = req.body;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      if (studentId) {
        const existingStudent = await User.findOne({ where: { studentId } });
        if (existingStudent) {
          return res.status(409).json({
            success: false,
            message: 'This student ID is already registered.',
          });
        }
      }

      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        studentId: studentId || null,
        department: department || null,
      });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      await user.update({ refreshToken });
      setRefreshCookie(res, refreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        data: {
          user: user.toJSON(),
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /login ─────────────────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account has been deactivated. Contact an administrator.',
        });
      }

      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      await user.update({
        lastLogin: new Date(),
        refreshToken,
      });
      setRefreshCookie(res, refreshToken);

      res.json({
        success: true,
        message: 'Login successful.',
        data: {
          user: user.toJSON(),
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /refresh-token ────────────────────────────────────────────────────
// Le refresh token est lu dans le cookie HttpOnly (jamais exposé au JavaScript).
router.post('/refresh-token', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token is required.' });
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.',
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await user.update({ refreshToken: newRefreshToken }); // rotation du refresh token
    setRefreshCookie(res, newRefreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully.',
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /logout ────────────────────────────────────────────────────────────
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    await req.user.update({ refreshToken: null });
    clearRefreshCookie(res);

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /me ─────────────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user.toJSON() },
  });
});

// ─── PUT /me ─────────────────────────────────────────────────────────────────
router.put(
  '/me',
  authenticateToken,
  [
    body('firstName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('First name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('First name must be at most 100 characters'),
    body('lastName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Last name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Last name must be at most 100 characters'),
    body('avatar')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('Avatar must be a valid URL'),
    body('department')
      .optional({ values: 'null' })
      .trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const allowedFields = ['firstName', 'lastName', 'avatar', 'department'];
      const updates = {};

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update.',
        });
      }

      await req.user.update(updates);

      res.json({
        success: true,
        message: 'Profile updated successfully.',
        data: { user: req.user.toJSON() },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PUT /me/password ────────────────────────────────────────────────────────
router.put(
  '/me/password',
  authenticateToken,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('New password must contain at least one uppercase letter')
      .matches(/[0-9]/)
      .withMessage('New password must contain at least one number'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const isValidPassword = await req.user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }

      await req.user.update({ password: newPassword });

      res.json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

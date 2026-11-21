const crypto = require('crypto');
const express = require('express');
const { Op } = require('sequelize');
const { User } = require('../models');

const router = express.Router();

router.get('/staff', async (req, res, next) => {
  const expectedKey = process.env.SERVICE_API_KEY;
  const providedKey = req.get('x-service-api-key') || '';

  if (!expectedKey) {
    return res.status(503).json({ success: false, message: 'Internal service authentication is not configured.' });
  }

  const expected = Buffer.from(expectedKey);
  const provided = Buffer.from(providedKey);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }

  try {
    const staff = await User.findAll({
      where: {
        role: { [Op.in]: ['admin', 'librarian'] },
        isActive: true,
      },
      attributes: ['id', 'role'],
      raw: true,
    });
    res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRATION, JWT_REFRESH_EXPIRATION } = require('../config/jwt');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRATION }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateAccessToken, generateRefreshToken, verifyToken };

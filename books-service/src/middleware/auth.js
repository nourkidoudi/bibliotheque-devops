const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

/**
 * Middleware to verify JWT token from Authorization header.
 * Extracts user data and attaches it to req.user.
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

/**
 * Middleware factory to authorize specific roles.
 * Must be used after authenticate middleware.
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'librarian')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}.`,
      });
    }

    next();
  };
};

/**
 * Middleware to verify internal service-to-service calls.
 * Accepts the header `x-service-api-key` (used by loans-service) and, for
 * backward compatibility, `x-service-key`. The expected value comes from
 * SERVICE_API_KEY (preferred) or SERVICE_KEY.
 * The comparison is constant-time to avoid timing attacks.
 */
const crypto = require('crypto');

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const verifyServiceKey = (req, res, next) => {
  const serviceKey = req.headers['x-service-api-key'] || req.headers['x-service-key'];
  const expectedKey = process.env.SERVICE_API_KEY || process.env.SERVICE_KEY;

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      message: 'Service key not configured on server.',
    });
  }

  if (!serviceKey || !safeEqual(serviceKey, expectedKey)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing service key.',
    });
  }

  next();
};

module.exports = { authenticate, authorize, verifyServiceKey };

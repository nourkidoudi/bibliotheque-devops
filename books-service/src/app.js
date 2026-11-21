const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { metricsMiddleware, metricsEndpoint } = require('./utils/metrics');
const routes = require('./routes');

const app = express();

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// Serve static uploads for cover images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Metrics Endpoint ────────────────────────────────────────────────────────
app.get('/metrics', metricsEndpoint);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'books-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error in books-service:', err);

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      message: 'Validation error.',
      errors,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;

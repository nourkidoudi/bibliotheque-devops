const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { metricsMiddleware, metricsEndpoint } = require('./utils/metrics');
const routes = require('./routes');
const { initCronJobs } = require('./services/cronJobs');
const { getBreakerState } = require('./services/bookService');

const app = express();

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Metrics Endpoint ────────────────────────────────────────────────────────
app.get('/metrics', metricsEndpoint);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'loans-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    booksCircuit: getBreakerState().open ? 'open' : 'closed',
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
  console.error('Unhandled error in loans-service:', err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start background cron jobs if in non-test mode
if (process.env.NODE_ENV !== 'test') {
  initCronJobs();
}

module.exports = app;

const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeLoansGauge = new promClient.Gauge({
  name: 'loans_active_total',
  help: 'Total number of currently active loans',
  registers: [register],
});

const overdueLoansGauge = new promClient.Gauge({
  name: 'loans_overdue_total',
  help: 'Total number of currently overdue loans',
  registers: [register],
});

const loansCreatedCounter = new promClient.Counter({
  name: 'loans_created_total',
  help: 'Total number of loans created',
  registers: [register],
});

const loansReturnedCounter = new promClient.Counter({
  name: 'loans_returned_total',
  help: 'Total number of loans returned',
  registers: [register],
});

const finesCollectedCounter = new promClient.Counter({
  name: 'fines_collected_total',
  help: 'Total amount of fines collected',
  registers: [register],
});

/**
 * Middleware to track HTTP request metrics.
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
  });

  next();
};

/**
 * Metrics endpoint handler
 */
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex.message);
  }
};

module.exports = {
  register,
  metricsMiddleware,
  metricsEndpoint,
  activeLoansGauge,
  overdueLoansGauge,
  loansCreatedCounter,
  loansReturnedCounter,
  finesCollectedCounter,
};

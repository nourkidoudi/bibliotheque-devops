const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeUsers = new client.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users in the system',
  registers: [register],
});

// Middleware to track HTTP requests
const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route ? req.route.path : req.path;
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode,
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });

  next();
};

// Metrics endpoint handler
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
};

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  activeUsers,
  metricsMiddleware,
  metricsEndpoint,
};

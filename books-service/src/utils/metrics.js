const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const booksTotal = new client.Gauge({
  name: 'books_total',
  help: 'Total number of books in the library',
  registers: [register],
});

const booksAvailable = new client.Gauge({
  name: 'books_available_total',
  help: 'Total number of available book copies',
  registers: [register],
});

// Middleware to track HTTP requests
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

// Metrics endpoint handler
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
  httpRequestDuration,
  httpRequestsTotal,
  booksTotal,
  booksAvailable,
};

/**
 * Performance Monitoring Middleware
 *
 * Tracks request latency, logs slow requests, and provides metrics
 * for identifying bottlenecks.
 */

// Simple UUID generator (compatible with CommonJS)
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// In-memory latency histogram (buckets in milliseconds)
const latencyBuckets = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const latencyHistogram = {
  '0-10ms': 0,
  '10-50ms': 0,
  '50-100ms': 0,
  '100-200ms': 0,
  '200-500ms': 0,
  '500-1000ms': 0,
  '1000-2000ms': 0,
  '2000-5000ms': 0,
  '5000-10000ms': 0,
  '>10000ms': 0
};

const requestCounts = {
  total: 0,
  byEndpoint: {},
  errors: 0
};

const requestTimings = [];
const MAX_TIMINGS = 1000; // Keep last 1000 request timings

/**
 * Performance monitoring middleware
 */
function performanceMiddleware(req, res, next) {
  // Generate unique request ID
  const requestId = generateRequestId();
  req.requestId = requestId;

  // Record start time
  const startTime = process.hrtime.bigint();
  const startDate = new Date();

  // Log request start
  console.log(`[${requestId}] ${req.method} ${req.path} - START`);

  // Capture response finish
  const originalEnd = res.end;
  res.end = function(...args) {
    // Calculate duration
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    const durationMs = Number(durationNs) / 1_000_000;

    // Record metrics
    recordMetrics(req, res, durationMs);

    // Log request completion
    const logLevel = durationMs > 1000 ? '⚠️  SLOW' : durationMs > 500 ? '⚡ WARN' : '✓';
    console.log(
      `[${requestId}] ${req.method} ${req.path} - ${logLevel} ${res.statusCode} ${durationMs.toFixed(2)}ms`
    );

    // Set Server-Timing header for browser DevTools
    res.setHeader('Server-Timing', `total;dur=${durationMs.toFixed(2)}`);

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Record metrics for analysis
 */
function recordMetrics(req, res, durationMs) {
  // Update request counts
  requestCounts.total++;
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  requestCounts.byEndpoint[endpoint] = (requestCounts.byEndpoint[endpoint] || 0) + 1;

  if (res.statusCode >= 400) {
    requestCounts.errors++;
  }

  // Update latency histogram
  updateHistogram(durationMs);

  // Store timing data
  requestTimings.push({
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    endpoint: endpoint,
    statusCode: res.statusCode,
    durationMs: durationMs,
    timestamp: new Date()
  });

  // Trim old timings
  if (requestTimings.length > MAX_TIMINGS) {
    requestTimings.shift();
  }
}

/**
 * Update latency histogram
 */
function updateHistogram(durationMs) {
  if (durationMs < 10) {
    latencyHistogram['0-10ms']++;
  } else if (durationMs < 50) {
    latencyHistogram['10-50ms']++;
  } else if (durationMs < 100) {
    latencyHistogram['50-100ms']++;
  } else if (durationMs < 200) {
    latencyHistogram['100-200ms']++;
  } else if (durationMs < 500) {
    latencyHistogram['200-500ms']++;
  } else if (durationMs < 1000) {
    latencyHistogram['500-1000ms']++;
  } else if (durationMs < 2000) {
    latencyHistogram['1000-2000ms']++;
  } else if (durationMs < 5000) {
    latencyHistogram['2000-5000ms']++;
  } else if (durationMs < 10000) {
    latencyHistogram['5000-10000ms']++;
  } else {
    latencyHistogram['>10000ms']++;
  }
}

/**
 * Calculate percentiles from request timings
 */
function calculatePercentiles() {
  if (requestTimings.length === 0) {
    return { p50: 0, p95: 0, p99: 0 };
  }

  const sorted = requestTimings
    .map(t => t.durationMs)
    .sort((a, b) => a - b);

  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { p50, p95, p99 };
}

/**
 * Get performance metrics summary
 */
function getMetrics() {
  const percentiles = calculatePercentiles();

  // Calculate average latency
  const avgLatency = requestTimings.length > 0
    ? requestTimings.reduce((sum, t) => sum + t.durationMs, 0) / requestTimings.length
    : 0;

  // Get slowest requests
  const slowestRequests = [...requestTimings]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 10)
    .map(t => ({
      requestId: t.requestId,
      endpoint: t.endpoint,
      durationMs: t.durationMs.toFixed(2),
      timestamp: t.timestamp
    }));

  // Top endpoints by request count
  const topEndpoints = Object.entries(requestCounts.byEndpoint)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));

  return {
    summary: {
      totalRequests: requestCounts.total,
      errorCount: requestCounts.errors,
      errorRate: requestCounts.total > 0
        ? ((requestCounts.errors / requestCounts.total) * 100).toFixed(2) + '%'
        : '0%'
    },
    latency: {
      average: avgLatency.toFixed(2) + 'ms',
      p50: percentiles.p50?.toFixed(2) + 'ms',
      p95: percentiles.p95?.toFixed(2) + 'ms',
      p99: percentiles.p99?.toFixed(2) + 'ms'
    },
    histogram: latencyHistogram,
    slowestRequests,
    topEndpoints,
    memoryUsage: {
      rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
      heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB'
    },
    eventLoop: {
      // Event loop delay would require perf_hooks, adding basic CPU info
      uptime: (process.uptime() / 60).toFixed(2) + ' minutes'
    }
  };
}

/**
 * Reset metrics (useful for testing)
 */
function resetMetrics() {
  requestCounts.total = 0;
  requestCounts.errors = 0;
  requestCounts.byEndpoint = {};
  requestTimings.length = 0;
  Object.keys(latencyHistogram).forEach(key => {
    latencyHistogram[key] = 0;
  });
}

module.exports = {
  performanceMiddleware,
  getMetrics,
  resetMetrics
};

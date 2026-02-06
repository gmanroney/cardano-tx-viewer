/**
 * Performance Metrics API
 *
 * Exposes performance metrics for monitoring and analysis
 */

const express = require('express');
const router = express.Router();
const { getMetrics, resetMetrics } = require('../middleware/performanceMonitoring');

/**
 * GET /api/metrics
 * Returns comprehensive performance metrics
 */
router.get('/', (req, res) => {
  try {
    const metrics = getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/metrics/reset
 * Resets performance metrics (useful for testing)
 */
router.post('/reset', (req, res) => {
  try {
    resetMetrics();
    res.json({ message: 'Metrics reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

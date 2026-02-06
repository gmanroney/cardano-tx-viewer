const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const cron = require('node-cron');
require('dotenv').config();

const transactionRoutes = require('./routes/transactions');
const governanceRoutes = require('./routes/governance');
const drepRoutes = require('./routes/dreps');
const lobbyingAnalyticsRoutes = require('./routes/lobbyingAnalytics');
const metricsRoutes = require('./routes/metrics');
const transactionService = require('./services/transactionService');
const { performanceMiddleware } = require('./middleware/performanceMonitoring');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(compression()); // Enable gzip/brotli compression
app.use(performanceMiddleware); // Track request latency and metrics

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');

  // Fetch initial transactions
  transactionService.fetchAndStoreTransactions()
    .then(() => console.log('Initial transaction fetch completed'))
    .catch(err => console.error('Initial transaction fetch failed:', err));
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Cardano Transaction Viewer API',
    endpoints: {
      transactions: '/api/transactions',
      transactionByHash: '/api/transactions/:hash',
      stats: '/api/transactions/stats/summary',
      manualFetch: 'POST /api/transactions/fetch'
    }
  });
});

app.use('/api/transactions', transactionRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/dreps', drepRoutes);
app.use('/api/lobbying', lobbyingAnalyticsRoutes);
app.use('/api/metrics', metricsRoutes);

// Schedule periodic transaction fetching
const fetchInterval = process.env.FETCH_INTERVAL_SECONDS || 30;
console.log(`Scheduling transaction fetch every ${fetchInterval} seconds`);

cron.schedule(`*/${fetchInterval} * * * * *`, async () => {
  try {
    await transactionService.fetchAndStoreTransactions();
  } catch (error) {
    console.error('Scheduled fetch failed:', error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
});

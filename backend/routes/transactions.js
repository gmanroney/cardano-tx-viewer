const express = require('express');
const router = express.Router();
const transactionService = require('../services/transactionService');

// Get all transactions with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const result = await transactionService.getTransactions(page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error in GET /transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', message: error.message });
  }
});

// Get transaction by hash
router.get('/:hash', async (req, res) => {
  try {
    const transaction = await transactionService.getTransactionByHash(req.params.hash);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error in GET /transactions/:hash:', error);
    res.status(500).json({ error: 'Failed to fetch transaction', message: error.message });
  }
});

// Get statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await transactionService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error in GET /transactions/stats/summary:', error);
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  }
});

// Manually trigger transaction fetch
router.post('/fetch', async (req, res) => {
  try {
    const result = await transactionService.fetchAndStoreTransactions();
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error in POST /transactions/fetch:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', message: error.message });
  }
});

module.exports = router;

const request = require('supertest');
const express = require('express');

// Mock services BEFORE requiring the router
jest.mock('../../services/transactionService');

// Mock blockfrost service to avoid API key requirement
jest.mock('../../services/blockfrostService', () => ({
  api: {
    blocksLatest: jest.fn(),
    blocksTxs: jest.fn(),
    txs: jest.fn(),
    blocks: jest.fn(),
    epochsLatest: jest.fn()
  }
}));

const transactionRouter = require('../../routes/transactions');
const transactionService = require('../../services/transactionService');

const app = express();
app.use(express.json());
app.use('/api/transactions', transactionRouter);

describe('Transaction Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/transactions', () => {
    it('should return paginated transactions', async () => {
      const mockData = {
        transactions: [
          { hash: 'tx1', blockHeight: 1000 },
          { hash: 'tx2', blockHeight: 1001 }
        ],
        pagination: {
          total: 100,
          page: 1,
          pages: 5
        }
      };

      transactionService.getTransactions.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/transactions?page=1&limit=20')
        .expect(200);

      expect(response.body.transactions.length).toBe(2);
      expect(response.body.pagination.total).toBe(100);
    });

    it('should handle pagination parameters', async () => {
      transactionService.getTransactions.mockResolvedValue({
        transactions: [],
        pagination: { total: 0, page: 1, pages: 0 }
      });

      await request(app)
        .get('/api/transactions?page=2&limit=50')
        .expect(200);

      expect(transactionService.getTransactions).toHaveBeenCalledWith(2, 50);
    });
  });

  describe('GET /api/transactions/:hash', () => {
    it('should return transaction by hash', async () => {
      const mockTx = {
        hash: 'abc123',
        blockHeight: 1000,
        fees: '170000'
      };

      transactionService.getTransactionByHash.mockResolvedValue(mockTx);

      const response = await request(app)
        .get('/api/transactions/abc123')
        .expect(200);

      expect(response.body.hash).toBe('abc123');
    });

    it('should return 404 for non-existent transaction', async () => {
      transactionService.getTransactionByHash.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/transactions/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Transaction not found');
    });
  });

  describe('POST /api/transactions/fetch', () => {
    it('should fetch new transactions', async () => {
      const mockResult = {
        newTransactions: 5,
        totalTransactions: 105
      };

      transactionService.fetchAndStoreTransactions.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/transactions/fetch')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result.newTransactions).toBe(5);
      expect(response.body.result.totalTransactions).toBe(105);
    });
  });
});

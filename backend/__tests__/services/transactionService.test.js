// Mock blockfrost service BEFORE requiring transactionService
jest.mock('../../services/blockfrostService', () => ({
  getRecentTransactions: jest.fn()
}));

jest.mock('../../models/Transaction');

const transactionService = require('../../services/transactionService');
const Transaction = require('../../models/Transaction');
const blockfrostService = require('../../services/blockfrostService');

describe('TransactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchAndStoreTransactions', () => {
    const mockBlockfrostTransactions = [
      {
        hash: 'tx1abc123',
        block: 'block1',
        block_height: 1000,
        slot: 50000,
        index: 0,
        output_amount: [{ unit: 'lovelace', quantity: '5000000' }],
        fees: '170000',
        deposit: '0',
        size: 500,
        invalid_before: null,
        invalid_hereafter: null,
        utxo_count: 2,
        withdrawal_count: 0,
        mir_cert_count: 0,
        delegation_count: 0,
        stake_cert_count: 0,
        pool_update_count: 0,
        pool_retire_count: 0,
        asset_mint_or_burn_count: 0,
        redeemer_count: 0,
        valid_contract: false
      },
      {
        hash: 'tx2def456',
        block: 'block2',
        block_height: 1001,
        slot: 50001,
        index: 1,
        output_amount: [{ unit: 'lovelace', quantity: '10000000' }],
        fees: '180000',
        deposit: '0',
        size: 600,
        invalid_before: null,
        invalid_hereafter: null,
        utxo_count: 3,
        withdrawal_count: 0,
        mir_cert_count: 0,
        delegation_count: 1,
        stake_cert_count: 0,
        pool_update_count: 0,
        pool_retire_count: 0,
        asset_mint_or_burn_count: 0,
        redeemer_count: 0,
        valid_contract: false
      }
    ];

    it('should fetch and store new transactions successfully', async () => {
      blockfrostService.getRecentTransactions.mockResolvedValue(mockBlockfrostTransactions);
      Transaction.findOne.mockResolvedValue(null);
      Transaction.create.mockResolvedValue({});

      const result = await transactionService.fetchAndStoreTransactions();

      expect(blockfrostService.getRecentTransactions).toHaveBeenCalledWith(20);
      expect(Transaction.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        total: 2,
        new: 2,
        updated: 0
      });
    });

    it('should skip existing transactions', async () => {
      blockfrostService.getRecentTransactions.mockResolvedValue(mockBlockfrostTransactions);
      Transaction.findOne.mockResolvedValue({ hash: 'tx1abc123' });

      const result = await transactionService.fetchAndStoreTransactions();

      expect(Transaction.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        total: 2,
        new: 0,
        updated: 2
      });
    });

    it('should handle duplicate key errors gracefully', async () => {
      blockfrostService.getRecentTransactions.mockResolvedValue(mockBlockfrostTransactions);
      Transaction.findOne.mockResolvedValue(null);

      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;
      Transaction.create.mockRejectedValueOnce(duplicateError);
      Transaction.create.mockResolvedValueOnce({});

      const result = await transactionService.fetchAndStoreTransactions();

      expect(result.total).toBe(2);
    });

    it('should handle blockfrost API errors', async () => {
      blockfrostService.getRecentTransactions.mockRejectedValue(new Error('API Error'));

      await expect(transactionService.fetchAndStoreTransactions()).rejects.toThrow('API Error');
    });

    it('should handle database errors during creation', async () => {
      blockfrostService.getRecentTransactions.mockResolvedValue([mockBlockfrostTransactions[0]]);
      Transaction.findOne.mockResolvedValue(null);
      Transaction.create.mockRejectedValue(new Error('Database Error'));

      const result = await transactionService.fetchAndStoreTransactions();

      expect(result.new).toBe(0);
    });
  });

  describe('getTransactions', () => {
    const mockTransactions = [
      {
        hash: 'tx1abc123',
        blockHeight: 1000,
        fees: '170000'
      },
      {
        hash: 'tx2def456',
        blockHeight: 1001,
        fees: '180000'
      }
    ];

    it('should return paginated transactions with default parameters', async () => {
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockTransactions)
            })
          })
        })
      });
      Transaction.countDocuments.mockResolvedValue(100);

      const result = await transactionService.getTransactions();

      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('pagination');
      expect(result.transactions).toEqual(mockTransactions);
      expect(result.pagination).toEqual({
        total: 100,
        page: 1,
        limit: 50,
        pages: 2
      });
    });

    it('should handle custom page and limit parameters', async () => {
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockTransactions)
            })
          })
        })
      });
      Transaction.countDocuments.mockResolvedValue(100);

      const result = await transactionService.getTransactions(2, 20);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.pages).toBe(5);
    });

    it('should handle empty result set', async () => {
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      Transaction.countDocuments.mockResolvedValue(0);

      const result = await transactionService.getTransactions();

      expect(result.transactions).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.pages).toBe(0);
    });

    it('should handle database errors', async () => {
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockRejectedValue(new Error('Database Error'))
            })
          })
        })
      });

      await expect(transactionService.getTransactions()).rejects.toThrow('Database Error');
    });
  });

  describe('getTransactionByHash', () => {
    const mockTransaction = {
      hash: 'tx1abc123',
      blockHeight: 1000,
      fees: '170000'
    };

    it('should return transaction by hash', async () => {
      Transaction.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTransaction)
      });

      const result = await transactionService.getTransactionByHash('tx1abc123');

      expect(result).toEqual(mockTransaction);
      expect(Transaction.findOne).toHaveBeenCalledWith({ hash: 'tx1abc123' });
    });

    it('should return null for non-existent transaction', async () => {
      Transaction.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const result = await transactionService.getTransactionByHash('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      Transaction.findOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database Error'))
      });

      await expect(transactionService.getTransactionByHash('tx1abc123')).rejects.toThrow('Database Error');
    });
  });

  describe('getStats', () => {
    const mockRecentTransactions = [
      {
        hash: 'tx1',
        blockHeight: 1003,
        fees: '170000',
        outputAmount: [{ unit: 'lovelace', quantity: '5000000' }],
        validContract: true,
        redeemerCount: 1,
        assetMintOrBurnCount: 0,
        delegationCount: 0,
        fetchedAt: new Date('2024-01-01T12:03:00Z')
      },
      {
        hash: 'tx2',
        blockHeight: 1002,
        fees: '180000',
        outputAmount: [{ unit: 'lovelace', quantity: '10000000' }],
        validContract: false,
        redeemerCount: 0,
        assetMintOrBurnCount: 1,
        delegationCount: 0,
        fetchedAt: new Date('2024-01-01T12:02:00Z')
      },
      {
        hash: 'tx3',
        blockHeight: 1001,
        fees: '160000',
        outputAmount: [{ unit: 'lovelace', quantity: '15000000' }],
        validContract: false,
        redeemerCount: 0,
        assetMintOrBurnCount: 0,
        delegationCount: 1,
        fetchedAt: new Date('2024-01-01T12:01:00Z')
      }
    ];

    const mockLatestTx = mockRecentTransactions[0];
    const mockOldestTx = mockRecentTransactions[2];

    beforeEach(() => {
      Transaction.countDocuments.mockResolvedValue(150);

      // Mock latest transaction query
      Transaction.findOne.mockImplementation(() => {
        const mockQuery = {
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn()
        };

        // First call is for latest, second for oldest
        if (!Transaction.findOne.mockLatestCalled) {
          Transaction.findOne.mockLatestCalled = true;
          mockQuery.lean.mockResolvedValue(mockLatestTx);
        } else {
          mockQuery.lean.mockResolvedValue(mockOldestTx);
        }

        return mockQuery;
      });

      // Mock recent transactions query
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockRecentTransactions)
          })
        })
      });
    });

    afterEach(() => {
      delete Transaction.findOne.mockLatestCalled;
    });

    it('should calculate statistics correctly', async () => {
      const result = await transactionService.getStats();

      expect(result).toHaveProperty('totalTransactions', 150);
      expect(result).toHaveProperty('latestBlock', 1003);
      expect(result).toHaveProperty('oldestBlock', 1001);
      expect(result).toHaveProperty('totalADA');
      expect(result).toHaveProperty('totalFees');
      expect(result).toHaveProperty('averageFee');
      expect(result).toHaveProperty('averageAmount');
      expect(result).toHaveProperty('transactionsPerMinute');
      expect(result).toHaveProperty('smartContractTransactions', 1);
      expect(result).toHaveProperty('nftTransactions', 1);
      expect(result).toHaveProperty('delegationTransactions', 1);
    });

    it('should calculate ADA totals correctly', async () => {
      const result = await transactionService.getStats();

      // 5 + 10 + 15 = 30 ADA
      expect(parseFloat(result.totalADA)).toBe(30);
    });

    it('should calculate fees correctly', async () => {
      const result = await transactionService.getStats();

      // (0.17 + 0.18 + 0.16) = 0.51 ADA
      expect(parseFloat(result.totalFees)).toBeCloseTo(0.51, 2);
    });

    it('should handle empty database', async () => {
      Transaction.countDocuments.mockResolvedValue(0);
      Transaction.findOne.mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null)
      }));
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
          })
        })
      });

      const result = await transactionService.getStats();

      expect(result.totalTransactions).toBe(0);
      expect(result.latestBlock).toBeNull();
      expect(result.totalADA).toBe('0.00');
    });

    it('should handle transactions without output amounts', async () => {
      const txWithoutOutput = [{
        ...mockRecentTransactions[0],
        outputAmount: []
      }];

      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(txWithoutOutput)
          })
        })
      });

      const result = await transactionService.getStats();

      expect(result.totalADA).toBe('0.00');
    });

    it('should handle database errors', async () => {
      Transaction.countDocuments.mockRejectedValue(new Error('Database Error'));

      await expect(transactionService.getStats()).rejects.toThrow('Database Error');
    });
  });
});

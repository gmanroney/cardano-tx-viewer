const Transaction = require('../models/Transaction');
const blockfrostService = require('./blockfrostService');

class TransactionService {
  async fetchAndStoreTransactions() {
    try {
      console.log('Fetching latest transactions from Cardano...');
      const transactions = await blockfrostService.getRecentTransactions(20);

      let newCount = 0;
      let updatedCount = 0;

      for (const tx of transactions) {
        try {
          const existingTx = await Transaction.findOne({ hash: tx.hash });

          if (existingTx) {
            updatedCount++;
          } else {
            await Transaction.create({
              hash: tx.hash,
              block: tx.block,
              blockHeight: tx.block_height,
              slot: tx.slot,
              index: tx.index,
              outputAmount: tx.output_amount,
              fees: tx.fees,
              deposit: tx.deposit,
              size: tx.size,
              invalidBefore: tx.invalid_before,
              invalidHereafter: tx.invalid_hereafter,
              utxoCount: tx.utxo_count,
              withdrawalCount: tx.withdrawal_count,
              mirCertCount: tx.mir_cert_count,
              delegationCount: tx.delegation_count,
              stakeCertCount: tx.stake_cert_count,
              poolUpdateCount: tx.pool_update_count,
              poolRetireCount: tx.pool_retire_count,
              assetMintOrBurnCount: tx.asset_mint_or_burn_count,
              redeemerCount: tx.redeemer_count,
              validContract: tx.valid_contract
            });
            newCount++;
          }
        } catch (error) {
          if (error.code === 11000) {
            // Duplicate key error, skip
            continue;
          }
          console.error(`Error storing transaction ${tx.hash}:`, error.message);
        }
      }

      console.log(`Fetched ${transactions.length} transactions. New: ${newCount}, Already exists: ${updatedCount}`);
      return { total: transactions.length, new: newCount, updated: updatedCount };
    } catch (error) {
      console.error('Error in fetchAndStoreTransactions:', error.message);
      throw error;
    }
  }

  async getTransactions(page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const transactions = await Transaction.find()
        .sort({ blockHeight: -1, index: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Transaction.countDocuments();

      return {
        transactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting transactions:', error.message);
      throw error;
    }
  }

  async getTransactionByHash(hash) {
    try {
      const transaction = await Transaction.findOne({ hash }).lean();
      return transaction;
    } catch (error) {
      console.error('Error getting transaction by hash:', error.message);
      throw error;
    }
  }

  async getStats() {
    try {
      const total = await Transaction.countDocuments();
      const latest = await Transaction.findOne().sort({ blockHeight: -1 }).lean();
      const oldest = await Transaction.findOne().sort({ blockHeight: 1 }).lean();

      return {
        totalTransactions: total,
        latestBlock: latest ? latest.blockHeight : null,
        oldestBlock: oldest ? oldest.blockHeight : null,
        lastFetchedAt: latest ? latest.fetchedAt : null
      };
    } catch (error) {
      console.error('Error getting stats:', error.message);
      throw error;
    }
  }
}

module.exports = new TransactionService();

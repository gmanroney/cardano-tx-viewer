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

      // Calculate aggregate metrics
      const recentTransactions = await Transaction.find()
        .sort({ blockHeight: -1 })
        .limit(100)
        .lean();

      let totalADA = 0;
      let totalFees = 0;
      let smartContractCount = 0;
      let nftMintCount = 0;
      let delegationCount = 0;

      recentTransactions.forEach(tx => {
        // Calculate total ADA from output amounts
        if (tx.outputAmount && tx.outputAmount.length > 0) {
          const adaOutput = tx.outputAmount.find(output => output.unit === 'lovelace');
          if (adaOutput) {
            totalADA += parseInt(adaOutput.quantity) / 1000000;
          }
        }

        // Sum fees
        totalFees += parseInt(tx.fees) / 1000000;

        // Count special transaction types
        if (tx.validContract && tx.redeemerCount > 0) smartContractCount++;
        if (tx.assetMintOrBurnCount > 0) nftMintCount++;
        if (tx.delegationCount > 0) delegationCount++;
      });

      // Calculate transactions per minute (last 100 transactions)
      let txPerMinute = 0;
      if (recentTransactions.length >= 2) {
        const firstTx = recentTransactions[recentTransactions.length - 1];
        const lastTx = recentTransactions[0];
        const timeDiff = (new Date(lastTx.fetchedAt) - new Date(firstTx.fetchedAt)) / 1000 / 60;
        if (timeDiff > 0) {
          txPerMinute = (recentTransactions.length / timeDiff).toFixed(2);
        }
      }

      const avgFee = recentTransactions.length > 0 ? (totalFees / recentTransactions.length).toFixed(6) : 0;
      const avgAmount = recentTransactions.length > 0 ? (totalADA / recentTransactions.length).toFixed(2) : 0;

      return {
        totalTransactions: total,
        latestBlock: latest ? latest.blockHeight : null,
        oldestBlock: oldest ? oldest.blockHeight : null,
        lastFetchedAt: latest ? latest.fetchedAt : null,

        // Aggregate metrics
        totalADA: totalADA.toFixed(2),
        totalFees: totalFees.toFixed(2),
        averageFee: avgFee,
        averageAmount: avgAmount,

        // Real-time metrics
        transactionsPerMinute: txPerMinute,
        smartContractTransactions: smartContractCount,
        nftTransactions: nftMintCount,
        delegationTransactions: delegationCount,

        // Latest transaction info
        latestTxHash: latest ? latest.hash : null,
        latestTxTime: latest ? latest.fetchedAt : null
      };
    } catch (error) {
      console.error('Error getting stats:', error.message);
      throw error;
    }
  }
}

module.exports = new TransactionService();

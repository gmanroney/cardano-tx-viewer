const { BlockFrostAPI } = require('@blockfrost/blockfrost-js');

class BlockfrostService {
  constructor() {
    const apiKey = process.env.BLOCKFROST_API_KEY;
    const network = process.env.BLOCKFROST_NETWORK || 'mainnet';

    if (!apiKey) {
      throw new Error('BLOCKFROST_API_KEY is not set in environment variables');
    }

    this.api = new BlockFrostAPI({
      projectId: apiKey,
      network: network
    });
  }

  async getLatestBlock() {
    try {
      const latestBlock = await this.api.blocksLatest();
      return latestBlock;
    } catch (error) {
      console.error('Error fetching latest block:', error.message);
      throw error;
    }
  }

  async getBlockTransactions(blockHash) {
    try {
      const transactions = await this.api.blocksTxs(blockHash);
      return transactions;
    } catch (error) {
      console.error(`Error fetching transactions for block ${blockHash}:`, error.message);
      throw error;
    }
  }

  async getTransactionDetails(txHash) {
    try {
      const txDetails = await this.api.txs(txHash);
      return txDetails;
    } catch (error) {
      console.error(`Error fetching transaction details for ${txHash}:`, error.message);
      throw error;
    }
  }

  async getRecentTransactions(limit = 20) {
    try {
      const latestBlock = await this.getLatestBlock();
      const blockHash = latestBlock.hash;

      // Get transactions from the latest block
      const txHashes = await this.getBlockTransactions(blockHash);

      // Fetch details for each transaction (limit to specified number)
      const transactions = [];
      for (let i = 0; i < Math.min(txHashes.length, limit); i++) {
        const txDetails = await this.getTransactionDetails(txHashes[i]);
        transactions.push(txDetails);
      }

      return transactions;
    } catch (error) {
      console.error('Error fetching recent transactions:', error.message);
      throw error;
    }
  }

  async getTransactionsByBlockRange(startBlock, endBlock, limit = 100) {
    try {
      const transactions = [];

      for (let blockNumber = startBlock; blockNumber <= endBlock && transactions.length < limit; blockNumber++) {
        try {
          const block = await this.api.blocks(blockNumber);
          const txHashes = await this.getBlockTransactions(block.hash);

          for (const txHash of txHashes) {
            if (transactions.length >= limit) break;
            const txDetails = await this.getTransactionDetails(txHash);
            transactions.push(txDetails);
          }
        } catch (error) {
          console.error(`Error processing block ${blockNumber}:`, error.message);
          continue;
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error fetching transactions by block range:', error.message);
      throw error;
    }
  }
}

module.exports = new BlockfrostService();

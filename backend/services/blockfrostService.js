const { BlockFrostAPI } = require('@blockfrost/blockfrost-js');
const axios = require('axios');

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

    // Setup direct HTTP client for endpoints not in SDK
    const baseUrl = network === 'mainnet'
      ? 'https://cardano-mainnet.blockfrost.io/api/v0'
      : `https://cardano-${network}.blockfrost.io/api/v0`;

    this.httpClient = axios.create({
      baseURL: baseUrl,
      headers: {
        'project_id': apiKey
      }
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

  async getDRepMetadata(drepId) {
    try {
      // Get DRep info (includes voting power/stake) using direct HTTP call
      const drepInfoResponse = await this.httpClient.get(`/governance/dreps/${drepId}`);
      const drepInfo = drepInfoResponse.data;

      let givenName = null;
      let description = null;
      let objectives = null;

      // Try to fetch the CIP-119 metadata using direct HTTP call
      try {
        const metadataResponse = await this.httpClient.get(`/governance/dreps/${drepId}/metadata`);
        const metadata = metadataResponse.data;

        // Extract givenName from CIP-119 format
        // The structure is: metadata.json_metadata.body.givenName
        if (metadata && metadata.json_metadata && metadata.json_metadata.body) {
          const body = metadata.json_metadata.body;

          // Helper function to unwrap @value objects from CIP-119 metadata
          const unwrapValue = (val) => {
            if (val && typeof val === 'object' && '@value' in val) {
              return val['@value'];
            }
            return val;
          };

          givenName = unwrapValue(body.givenName) || unwrapValue(body.given_name) || unwrapValue(body.name) || null;
          objectives = unwrapValue(body.objectives) || null;
          description = unwrapValue(body.motivations) || unwrapValue(body.qualifications) || unwrapValue(body.bio) || null;

          if (givenName) {
            console.log(`✓ DRep ${drepId.substring(0, 20)}... = "${givenName}"`);
          }
        }
      } catch (metaError) {
        // Metadata not available or error - this is common, don't log every time
        if (!metaError.response || metaError.response.status !== 404) {
          console.log(`Could not fetch metadata for DRep ${drepId.substring(0, 20)}...:`, metaError.message);
        }
      }

      // Extract voting power (in lovelaces)
      const votingPower = drepInfo.amount || drepInfo.active_stake || drepInfo.live_stake || null;

      return {
        drepId: drepId,
        givenName: givenName,
        name: givenName, // Use givenName as the display name
        description: description,
        objectives: objectives,
        votingPower: votingPower,
        metadata: drepInfo
      };
    } catch (error) {
      console.error(`Error fetching DRep info for ${drepId.substring(0, 20)}...:`, error.message);
      return {
        drepId: drepId,
        givenName: null,
        name: null,
        description: null,
        votingPower: null,
        error: error.message
      };
    }
  }

  async getStakePoolMetadata(poolId) {
    try {
      const poolInfoResponse = await this.httpClient.get(`/pools/${poolId}`);
      const poolInfo = poolInfoResponse.data;

      let name = null;
      let description = null;

      // Try to get pool metadata
      try {
        const poolMetadataResponse = await this.httpClient.get(`/pools/${poolId}/metadata`);
        const poolMetadata = poolMetadataResponse.data;

        // Helper function to unwrap @value objects
        const unwrapValue = (val) => {
          if (val && typeof val === 'object' && '@value' in val) {
            return val['@value'];
          }
          return val;
        };

        name = unwrapValue(poolMetadata?.name) || poolInfo.ticker || null;
        description = unwrapValue(poolMetadata?.description) || null;

        if (name) {
          console.log(`✓ Pool ${poolId.substring(0, 20)}... = "${name}" [${poolInfo.ticker || ''}]`);
        }
      } catch (metaError) {
        // Metadata fetch failed, use basic info
        name = poolInfo.ticker || null;
      }

      return {
        poolId: poolId,
        name: name,
        ticker: poolInfo.ticker || null,
        description: description,
        votingPower: poolInfo.active_stake || poolInfo.live_stake || null,
        metadata: poolInfo
      };
    } catch (error) {
      console.error(`Error fetching pool info for ${poolId.substring(0, 20)}...:`, error.message);
      return {
        poolId: poolId,
        name: null,
        ticker: null,
        description: null,
        votingPower: null,
        error: error.message
      };
    }
  }

  async resolveVoterName(voterId) {
    try {
      // Check if it's a DRep (starts with drep)
      if (voterId.startsWith('drep')) {
        const drepMetadata = await this.getDRepMetadata(voterId);
        return {
          id: voterId,
          name: drepMetadata.name,
          type: 'DRep',
          description: drepMetadata.description,
          votingPower: drepMetadata.votingPower
        };
      }

      // Check if it's a stake pool (starts with pool)
      if (voterId.startsWith('pool')) {
        const poolMetadata = await this.getStakePoolMetadata(voterId);
        return {
          id: voterId,
          name: poolMetadata.name || poolMetadata.ticker,
          type: 'Pool',
          ticker: poolMetadata.ticker,
          description: poolMetadata.description,
          votingPower: poolMetadata.votingPower
        };
      }

      // If no name found, return the ID
      return {
        id: voterId,
        name: null,
        type: 'Unknown',
        votingPower: null
      };
    } catch (error) {
      console.error(`Error resolving voter name for ${voterId}:`, error.message);
      return {
        id: voterId,
        name: null,
        type: 'Unknown',
        votingPower: null,
        error: error.message
      };
    }
  }
}

module.exports = new BlockfrostService();

const blockfrostService = require('./blockfrostService');

class GovernanceService {
  async getGovernanceActions() {
    try {
      // Fetch current epoch info
      const epochInfo = await blockfrostService.api.epochsLatest();

      // Fetch governance proposals
      const proposals = await blockfrostService.api.governanceProposals();

      // Get detailed information for each proposal
      const detailedProposals = await Promise.all(
        proposals.slice(0, 50).map(async (proposal) => {
          try {
            const details = await blockfrostService.api.governanceProposals(proposal.tx_hash, proposal.cert_index);
            return {
              txHash: proposal.tx_hash,
              certIndex: proposal.cert_index,
              ...details
            };
          } catch (error) {
            console.error(`Error fetching proposal details for ${proposal.tx_hash}:`, error.message);
            return {
              txHash: proposal.tx_hash,
              certIndex: proposal.cert_index,
              error: 'Details unavailable'
            };
          }
        })
      );

      return {
        currentEpoch: epochInfo.epoch,
        proposals: detailedProposals,
        totalProposals: proposals.length,
        fetchedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching governance actions:', error.message);

      // Return mock data if API fails
      return {
        currentEpoch: 0,
        proposals: [],
        totalProposals: 0,
        fetchedAt: new Date(),
        error: error.message
      };
    }
  }

  async getProposalVotes(txHash, certIndex) {
    try {
      const votes = await blockfrostService.api.governanceProposalsVotes(txHash, certIndex);
      return votes;
    } catch (error) {
      console.error(`Error fetching votes for proposal ${txHash}:`, error.message);
      return [];
    }
  }
}

module.exports = new GovernanceService();

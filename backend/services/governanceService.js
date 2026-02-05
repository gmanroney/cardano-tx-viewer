const blockfrostService = require('./blockfrostService');

class GovernanceService {
  async getGovernanceActions() {
    try {
      console.log('Fetching governance actions...');

      // Fetch current epoch info
      const epochInfo = await blockfrostService.api.epochsLatest();
      console.log('Current epoch:', epochInfo.epoch);

      // Try different API endpoints for governance
      let proposals = [];
      let error = null;

      try {
        // Try fetching DRep votes (governance committee)
        const drepVotes = await blockfrostService.api.governance.drepVotes({ page: 1 });
        console.log('DRep votes found:', drepVotes?.length || 0);

        if (drepVotes && drepVotes.length > 0) {
          proposals = drepVotes.slice(0, 50).map(vote => ({
            txHash: vote.tx_hash || 'N/A',
            certIndex: vote.cert_index || 0,
            type: 'DRep Vote',
            voter: vote.voter,
            vote: vote.vote,
            status: 'Active'
          }));
        }
      } catch (e) {
        console.log('DRep votes not available:', e.message);
      }

      // Try governance proposals endpoint
      try {
        const govProposals = await blockfrostService.api.governance.proposals({ page: 1 });
        console.log('Governance proposals found:', govProposals?.length || 0);

        if (govProposals && govProposals.length > 0) {
          const proposalDetails = govProposals.slice(0, 50).map(proposal => {
            // Determine status based on priority: dropped > enacted > expired > active
            let status = 'Active';
            if (proposal.dropped_epoch !== null && proposal.dropped_epoch !== undefined) {
              status = 'Dropped';
            } else if (proposal.enacted_epoch !== null && proposal.enacted_epoch !== undefined) {
              status = 'Enacted';
            } else if (proposal.expired_epoch !== null && proposal.expired_epoch !== undefined) {
              status = 'Expired';
            }

            return {
              txHash: proposal.tx_hash,
              certIndex: proposal.cert_index,
              type: proposal.gov_action_type || 'Proposal',
              anchorUrl: proposal.anchor_url,
              anchorHash: proposal.anchor_data_hash,
              deposit: proposal.deposit,
              returnAddress: proposal.return_address,
              expiresAt: proposal.expiration,
              enactedEpoch: proposal.enacted_epoch,
              expiredEpoch: proposal.expired_epoch,
              droppedEpoch: proposal.dropped_epoch,
              votingAnchor: proposal.voting_anchor,
              status: status
            };
          });

          proposals = [...proposals, ...proposalDetails];
        }
      } catch (e) {
        console.log('Governance proposals not available:', e.message);
        error = e.message;
      }

      // If no proposals found, try fetching from recent blocks
      if (proposals.length === 0) {
        try {
          const latestBlock = await blockfrostService.api.blocksLatest();
          console.log('Checking recent blocks for governance actions...');

          // Check last 10 blocks for governance-related transactions
          for (let i = 0; i < 10; i++) {
            try {
              const blockNum = latestBlock.height - i;
              const blockTxs = await blockfrostService.api.blocksTxs(blockNum.toString());

              // Sample transactions for governance metadata
              for (const txHash of blockTxs.slice(0, 5)) {
                try {
                  const txMetadata = await blockfrostService.api.txsMetadata(txHash);
                  if (txMetadata && txMetadata.length > 0) {
                    // Check for governance-related metadata
                    const govMetadata = txMetadata.find(m =>
                      m.label === '1694' || // CIP-1694 governance
                      m.label === 'gov' ||
                      JSON.stringify(m.json_metadata).includes('governance')
                    );

                    if (govMetadata) {
                      proposals.push({
                        txHash: txHash,
                        certIndex: 0,
                        type: 'Governance Action',
                        metadata: govMetadata.json_metadata,
                        block: blockNum,
                        status: 'Active'
                      });
                    }
                  }
                } catch (e) {
                  // Skip transactions without metadata
                }
              }
            } catch (e) {
              console.log(`Error checking block ${latestBlock.height - i}:`, e.message);
            }
          }
        } catch (e) {
          console.log('Error fetching from blocks:', e.message);
        }
      }

      console.log(`Total proposals found: ${proposals.length}`);

      return {
        currentEpoch: epochInfo.epoch,
        proposals: proposals,
        totalProposals: proposals.length,
        fetchedAt: new Date(),
        error: proposals.length === 0 ? 'No governance actions found. This network may not have Conway governance enabled yet.' : null
      };
    } catch (error) {
      console.error('Error fetching governance actions:', error);

      return {
        currentEpoch: 0,
        proposals: [],
        totalProposals: 0,
        fetchedAt: new Date(),
        error: `Failed to fetch governance data: ${error.message}`
      };
    }
  }

  async getProposalVotes(txHash, certIndex) {
    try {
      const votes = await blockfrostService.api.governance.proposalVotes(txHash, certIndex);
      return votes;
    } catch (error) {
      console.error(`Error fetching votes for proposal ${txHash}:`, error.message);
      return [];
    }
  }
}

module.exports = new GovernanceService();

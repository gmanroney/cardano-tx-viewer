const blockfrostService = require('./blockfrostService');
const GovernanceProposal = require('../models/GovernanceProposal');

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

      // Skip DRep votes for now as they're not the main governance actions
      // Focus on actual proposals

      // Try governance proposals endpoint - fetch multiple pages
      try {
        console.log('Fetching governance proposals from multiple pages...');
        let allProposals = [];

        // Fetch up to 10 pages (1000 proposals max)
        for (let page = 1; page <= 10; page++) {
          try {
            const govProposals = await blockfrostService.api.governance.proposals({
              page: page,
              count: 100,
              order: 'desc'
            });

            if (!govProposals || govProposals.length === 0) {
              console.log(`No more proposals found at page ${page}`);
              break;
            }

            console.log(`Page ${page}: Found ${govProposals.length} proposals`);
            allProposals = allProposals.concat(govProposals);

            // If we got less than 100, we've reached the end
            if (govProposals.length < 100) {
              break;
            }
          } catch (pageError) {
            console.log(`Error fetching page ${page}:`, pageError.message);
            break;
          }
        }

        console.log('Total governance proposals found:', allProposals.length);

        // Log first proposal to see what data we're getting
        if (allProposals.length > 0) {
          console.log('Sample proposal data:', JSON.stringify(allProposals[0], null, 2));
        }

        if (allProposals.length > 0) {
          // Process proposals in batches to get more details
          const proposalDetails = [];

          for (const proposal of allProposals) {
            try {
              let status = 'Active';
              let enactedEpoch = null;
              let expiredEpoch = null;
              let droppedEpoch = null;
              let anchorUrl = null;
              let anchorHash = null;
              let deposit = null;
              let returnAddress = null;
              let expiresAt = null;
              let govActionType = proposal.governance_type || 'Proposal';

              // Try to fetch detailed proposal info using tx_hash and cert_index
              try {
                const detailedProposal = await blockfrostService.api.governance.proposal(
                  proposal.tx_hash,
                  proposal.cert_index
                );

                if (detailedProposal) {
                  enactedEpoch = detailedProposal.enacted_epoch;
                  expiredEpoch = detailedProposal.expired_epoch;
                  droppedEpoch = detailedProposal.dropped_epoch;
                  anchorUrl = detailedProposal.anchor_url;
                  anchorHash = detailedProposal.anchor_data_hash;
                  deposit = detailedProposal.deposit;
                  returnAddress = detailedProposal.return_address;
                  expiresAt = detailedProposal.expiration;
                  govActionType = detailedProposal.governance_type || govActionType;
                }
              } catch (detailError) {
                // If detailed fetch fails, log but continue with basic data
                if (!detailError.message.includes('not found')) {
                  console.log(`Could not fetch details for ${proposal.tx_hash}:`, detailError.message);
                }
              }

              // Determine status based on the epoch fields
              if (droppedEpoch !== null && droppedEpoch !== undefined) {
                status = 'Dropped';
              } else if (enactedEpoch !== null && enactedEpoch !== undefined) {
                status = 'Enacted';
              } else if (expiredEpoch !== null && expiredEpoch !== undefined) {
                status = 'Expired';
              }

              proposalDetails.push({
                txHash: proposal.tx_hash,
                certIndex: proposal.cert_index,
                proposalId: proposal.id,
                type: govActionType,
                anchorUrl: anchorUrl,
                anchorHash: anchorHash,
                deposit: deposit,
                returnAddress: returnAddress,
                expiresAt: expiresAt,
                enactedEpoch: enactedEpoch,
                expiredEpoch: expiredEpoch,
                droppedEpoch: droppedEpoch,
                status: status
              });

              // Log status for debugging
              if (status !== 'Active') {
                console.log(`Proposal ${proposal.tx_hash.substring(0, 8)}... status: ${status}`);
              }
            } catch (processError) {
              console.log(`Error processing proposal ${proposal.tx_hash}:`, processError.message);
            }
          }

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

      // Save proposals to MongoDB
      if (proposals.length > 0) {
        try {
          let saved = 0;
          let updated = 0;

          for (const proposal of proposals) {
            try {
              const existingProposal = await GovernanceProposal.findOne({ proposalId: proposal.proposalId });

              if (existingProposal) {
                // Update existing proposal
                await GovernanceProposal.updateOne(
                  { proposalId: proposal.proposalId },
                  {
                    $set: {
                      ...proposal,
                      updatedAt: new Date()
                    }
                  }
                );
                updated++;
              } else {
                // Create new proposal
                await GovernanceProposal.create(proposal);
                saved++;
              }
            } catch (saveError) {
              console.log(`Error saving proposal ${proposal.proposalId}:`, saveError.message);
            }
          }

          console.log(`Governance proposals saved to MongoDB: ${saved} new, ${updated} updated`);
        } catch (dbError) {
          console.error('Error saving governance proposals to MongoDB:', dbError.message);
        }
      }

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

  async getProposalMetadata(txHash, certIndex) {
    try {
      const metadata = await blockfrostService.api.governance.proposalMetadata(txHash, certIndex);
      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata for proposal ${txHash}:`, error.message);
      return null;
    }
  }

  async getProposalDetails(txHash, certIndex) {
    try {
      const [proposal, votes, metadata] = await Promise.all([
        blockfrostService.api.governance.proposal(txHash, certIndex),
        this.getProposalVotes(txHash, certIndex),
        this.getProposalMetadata(txHash, certIndex)
      ]);

      return {
        ...proposal,
        votes: votes || [],
        metadata: metadata,
        voteCount: {
          yes: votes.filter(v => v.vote === 'yes').length,
          no: votes.filter(v => v.vote === 'no').length,
          abstain: votes.filter(v => v.vote === 'abstain').length,
          total: votes.length
        }
      };
    } catch (error) {
      console.error(`Error fetching proposal details for ${txHash}:`, error.message);
      throw error;
    }
  }
}

module.exports = new GovernanceService();

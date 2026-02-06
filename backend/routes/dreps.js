const express = require('express');
const router = express.Router();
const GovernanceVote = require('../models/GovernanceVote');
const GovernanceProposal = require('../models/GovernanceProposal');

// Get all DReps with their vote counts
router.get('/', async (req, res) => {
  try {
    // Aggregate to get unique voters with their vote counts
    const dreps = await GovernanceVote.aggregate([
      {
        $match: {
          $or: [
            { voter: { $regex: '^drep' } },
            { voter: { $regex: '^pool' } }
          ]
        }
      },
      {
        $group: {
          _id: '$voter',
          voterName: { $first: '$voterName' },
          voterGivenName: { $first: '$voterGivenName' },
          voterType: { $first: '$voterType' },
          voterTicker: { $first: '$voterTicker' },
          votingPower: { $first: '$votingPower' },
          totalVotes: { $sum: 1 },
          yesVotes: {
            $sum: { $cond: [{ $eq: ['$vote', 'yes'] }, 1, 0] }
          },
          noVotes: {
            $sum: { $cond: [{ $eq: ['$vote', 'no'] }, 1, 0] }
          },
          abstainVotes: {
            $sum: { $cond: [{ $eq: ['$vote', 'abstain'] }, 1, 0] }
          },
          lastVoteDate: { $max: '$blockTime' }
        }
      },
      {
        $project: {
          _id: 0,
          voterId: '$_id',
          voterName: 1,
          voterGivenName: 1,
          voterType: 1,
          voterTicker: 1,
          votingPower: 1,
          totalVotes: 1,
          yesVotes: 1,
          noVotes: 1,
          abstainVotes: 1,
          lastVoteDate: 1
        }
      },
      {
        $sort: { totalVotes: -1 }
      }
    ]);

    res.json({
      dreps: dreps,
      totalDReps: dreps.length,
      fetchedAt: new Date()
    });
  } catch (error) {
    console.error('Error fetching DReps:', error);
    res.status(500).json({ error: 'Failed to fetch DReps', message: error.message });
  }
});

// Get voting history for a specific DRep
router.get('/:voterId/votes', async (req, res) => {
  try {
    const { voterId } = req.params;

    // Get all votes by this DRep
    const votes = await GovernanceVote.find({ voter: voterId })
      .sort({ blockTime: -1 })
      .lean();

    // Get proposal details for each vote
    const votesWithProposals = await Promise.all(
      votes.map(async (vote) => {
        const proposal = await GovernanceProposal.findOne({
          txHash: vote.proposalTxHash,
          certIndex: vote.proposalCertIndex
        }).lean();

        return {
          ...vote,
          proposal: proposal
        };
      })
    );

    res.json({
      voterId: voterId,
      voterName: votes[0]?.voterName || votes[0]?.voterGivenName || null,
      voterType: votes[0]?.voterType || null,
      votingPower: votes[0]?.votingPower || null,
      votes: votesWithProposals,
      totalVotes: votesWithProposals.length,
      voteBreakdown: {
        yes: votesWithProposals.filter(v => v.vote === 'yes').length,
        no: votesWithProposals.filter(v => v.vote === 'no').length,
        abstain: votesWithProposals.filter(v => v.vote === 'abstain').length
      }
    });
  } catch (error) {
    console.error(`Error fetching votes for DRep ${req.params.voterId}:`, error);
    res.status(500).json({ error: 'Failed to fetch DRep votes', message: error.message });
  }
});

module.exports = router;

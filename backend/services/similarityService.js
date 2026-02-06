const GovernanceVote = require('../models/GovernanceVote');
const GovernanceProposal = require('../models/GovernanceProposal');
const SimilarityCache = require('../models/SimilarityCache');

class SimilarityService {
  async findSimilar(voterId, limit = 10) {
    // Check cache first
    const cached = await SimilarityCache.findOne({ voterId });
    if (cached) {
      return cached.similarDReps.slice(0, limit);
    }

    // Fetch target DRep's votes
    const targetVotes = await GovernanceVote.find({ voter: voterId }).lean();
    if (targetVotes.length === 0) {
      return [];
    }

    // Create vote map for target
    const targetMap = new Map();
    targetVotes.forEach(v => {
      const key = `${v.proposalTxHash}-${v.proposalCertIndex}`;
      targetMap.set(key, v.vote?.toLowerCase());
    });

    // Get all other DReps who voted on same proposals
    const proposalKeys = Array.from(targetMap.keys()).map(k => {
      const [txHash, certIndex] = k.split('-');
      return { proposalTxHash: txHash, proposalCertIndex: parseInt(certIndex) };
    });

    const allVotes = await GovernanceVote.find({
      $or: proposalKeys,
      voter: { $ne: voterId }
    }).lean();

    // Group by voter
    const drepVotes = {};
    allVotes.forEach(vote => {
      if (!drepVotes[vote.voter]) {
        drepVotes[vote.voter] = [];
      }
      drepVotes[vote.voter].push(vote);
    });

    // Compute similarities
    const similarities = [];
    Object.entries(drepVotes).forEach(([otherVoterId, votes]) => {
      const { similarity, commonVotes } = this.computeSimilarity(targetMap, votes);
      if (commonVotes >= 3) { // Minimum overlap for meaningful comparison
        similarities.push({
          voterId: otherVoterId,
          similarity,
          commonVotes
        });
      }
    });

    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Cache results
    await SimilarityCache.findOneAndUpdate(
      { voterId },
      {
        voterId,
        similarDReps: similarities.slice(0, 50), // Cache top 50
        computedAt: new Date()
      },
      { upsert: true }
    );

    return similarities.slice(0, limit);
  }

  computeSimilarity(targetMap, votes) {
    let agreements = 0;
    let comparable = 0;

    votes.forEach(vote => {
      const key = `${vote.proposalTxHash}-${vote.proposalCertIndex}`;
      if (targetMap.has(key)) {
        const targetVote = targetMap.get(key);
        const otherVote = vote.vote?.toLowerCase();

        if (targetVote !== 'abstain' && otherVote !== 'abstain') {
          comparable++;
          if (targetVote === otherVote) {
            agreements++;
          }
        }
      }
    });

    const similarity = comparable > 0 ? agreements / comparable : 0;
    return { similarity, commonVotes: comparable };
  }

  async getPersuasionTargets(actionType = null, limit = 20) {
    // Fetch all votes with proposals
    const query = {};
    const votes = await GovernanceVote.find(query).populate('proposalId').lean();

    // Group by voter
    const drepData = {};
    votes.forEach(vote => {
      if (!drepData[vote.voter]) {
        drepData[vote.voter] = {
          voterId: vote.voter,
          voterName: vote.voterName,
          votes: [],
          participation: 0,
          volatility: 0
        };
      }
      drepData[vote.voter].votes.push(vote);
    });

    // Compute persuasion metrics for each DRep
    const targets = [];
    const totalProposals = await GovernanceProposal.countDocuments({});

    Object.values(drepData).forEach(drep => {
      // Compute participation
      const participation = totalProposals > 0 ? drep.votes.length / totalProposals : 0;

      // Compute volatility (simplified)
      const volatility = this.computeVolatility(drep.votes);

      // Compute abstain rate
      const abstainCount = drep.votes.filter(v => v.vote?.toLowerCase() === 'abstain').length;
      const abstainRate = drep.votes.length > 0 ? abstainCount / drep.votes.length : 0;

      // Compute persuasion score (simplified version of frontend formula)
      const persuasionScore = (
        participation * 30 +
        volatility * 25 +
        (1 - abstainRate) * 20 +
        0.5 * 15 // Assuming moderate predictability
      );

      if (drep.votes.length >= 3) { // Minimum activity threshold
        targets.push({
          voterId: drep.voterId,
          voterName: drep.voterName,
          persuasionScore,
          participation,
          volatility,
          abstainRate,
          voteCount: drep.votes.length
        });
      }
    });

    // Sort by persuasion score
    targets.sort((a, b) => b.persuasionScore - a.persuasionScore);

    return targets.slice(0, limit);
  }

  computeVolatility(votes) {
    if (votes.length < 3) return 0;

    let changes = 0;
    for (let i = 1; i < votes.length; i++) {
      const prev = votes[i - 1].vote?.toLowerCase();
      const curr = votes[i].vote?.toLowerCase();
      if (prev !== curr && prev !== 'abstain' && curr !== 'abstain') {
        changes++;
      }
    }

    return votes.length > 1 ? changes / (votes.length - 1) : 0;
  }

  async getPopulationStats() {
    // Get all votes and compute aggregate statistics by proposal type
    const votes = await GovernanceVote.find({}).lean();
    const proposals = await GovernanceProposal.find({}).lean();

    // Create proposal type map
    const proposalTypes = {};
    proposals.forEach(p => {
      const key = `${p.txHash}-${p.certIndex}`;
      proposalTypes[key] = p.type || 'unknown';
    });

    // Group votes by type
    const typeStats = {};
    votes.forEach(vote => {
      const key = `${vote.proposalTxHash}-${vote.proposalCertIndex}`;
      const type = proposalTypes[key] || 'unknown';

      if (!typeStats[type]) {
        typeStats[type] = { yes: 0, no: 0, abstain: 0, total: 0 };
      }

      const voteType = vote.vote?.toLowerCase();
      if (voteType === 'yes') typeStats[type].yes++;
      else if (voteType === 'no') typeStats[type].no++;
      else if (voteType === 'abstain') typeStats[type].abstain++;
      typeStats[type].total++;
    });

    return typeStats;
  }
}

module.exports = new SimilarityService();

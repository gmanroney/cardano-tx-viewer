const VotingBloc = require('../models/VotingBloc');
const GovernanceVote = require('../models/GovernanceVote');

class ClusteringService {
  async computeBlocs(threshold = 0.7) {
    // Fetch all DReps with their votes
    const votes = await GovernanceVote.find({}).lean();

    if (votes.length === 0) {
      return [];
    }

    // Group votes by voter
    const drepVotes = {};
    votes.forEach(vote => {
      if (!drepVotes[vote.voter]) {
        drepVotes[vote.voter] = [];
      }
      drepVotes[vote.voter].push(vote);
    });

    const dreps = Object.entries(drepVotes).map(([voterId, votes]) => ({
      voterId,
      votes
    }));

    if (dreps.length < 2) {
      return [];
    }

    // Compute similarity matrix (expensive operation)
    const similarities = this.computeSimilarityMatrix(dreps);

    // Perform hierarchical clustering
    const blocs = this.agglomerativeClustering(dreps, similarities, threshold);

    // Cache results
    await VotingBloc.deleteMany({}); // Clear old blocs
    const blocDocs = blocs.map(b => ({
      blocId: b.id,
      members: b.members,
      size: b.size,
      cohesion: b.cohesion,
      computedAt: new Date()
    }));

    if (blocDocs.length > 0) {
      await VotingBloc.insertMany(blocDocs);
    }

    return blocs;
  }

  computeSimilarityMatrix(dreps) {
    const n = dreps.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const sim = this.jaccardSimilarity(dreps[i].votes, dreps[j].votes);
        matrix[i][j] = sim;
        matrix[j][i] = sim;
      }
      matrix[i][i] = 1;
    }

    return matrix;
  }

  jaccardSimilarity(votes1, votes2) {
    const map1 = new Map();
    const map2 = new Map();

    votes1.forEach(v => {
      const key = `${v.proposalTxHash}-${v.proposalCertIndex}`;
      map1.set(key, v.vote?.toLowerCase());
    });

    votes2.forEach(v => {
      const key = `${v.proposalTxHash}-${v.proposalCertIndex}`;
      map2.set(key, v.vote?.toLowerCase());
    });

    const commonKeys = [...map1.keys()].filter(k => map2.has(k));
    if (commonKeys.length === 0) return 0;

    let agreements = 0;
    let comparable = 0;

    commonKeys.forEach(key => {
      const v1 = map1.get(key);
      const v2 = map2.get(key);
      if (v1 !== 'abstain' && v2 !== 'abstain') {
        comparable++;
        if (v1 === v2) agreements++;
      }
    });

    return comparable > 0 ? agreements / comparable : 0;
  }

  agglomerativeClustering(dreps, similarities, threshold) {
    // Initialize: each DRep is its own cluster
    const clusters = dreps.map((drep, i) => ({
      id: i,
      members: [i],
      drepIds: [drep.voterId]
    }));

    while (true) {
      let maxSim = threshold;
      let mergeI = -1;
      let mergeJ = -1;

      // Find most similar pair
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const avgSim = this.averageLinkage(
            clusters[i].members,
            clusters[j].members,
            similarities
          );

          if (avgSim > maxSim) {
            maxSim = avgSim;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      if (mergeI === -1) break; // No more merges

      // Merge clusters
      clusters[mergeI].members.push(...clusters[mergeJ].members);
      clusters[mergeI].drepIds.push(...clusters[mergeJ].drepIds);
      clusters.splice(mergeJ, 1);
    }

    // Format output
    return clusters.map((c, idx) => ({
      id: `bloc-${idx}`,
      members: c.drepIds,
      size: c.members.length,
      cohesion: this.calculateCohesion(c.members, similarities)
    }));
  }

  averageLinkage(members1, members2, similarities) {
    let sum = 0;
    let count = 0;

    members1.forEach(m1 => {
      members2.forEach(m2 => {
        sum += similarities[m1][m2];
        count++;
      });
    });

    return count > 0 ? sum / count : 0;
  }

  calculateCohesion(members, similarities) {
    if (members.length < 2) return 1;

    let sum = 0;
    let count = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        sum += similarities[members[i]][members[j]];
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  async getProposalOutcomes() {
    // Query all votes and compute outcomes by proposal
    const votes = await GovernanceVote.find({}).lean();

    const outcomes = {};
    const tallies = {};

    // Group votes by proposal
    votes.forEach(vote => {
      const key = `${vote.proposalTxHash}-${vote.proposalCertIndex}`;
      if (!tallies[key]) {
        tallies[key] = { yes: 0, no: 0, abstain: 0, total: 0 };
      }

      const voteType = vote.vote?.toLowerCase();
      if (voteType === 'yes') tallies[key].yes++;
      else if (voteType === 'no') tallies[key].no++;
      else if (voteType === 'abstain') tallies[key].abstain++;
      tallies[key].total++;
    });

    // Compute outcomes and margins
    Object.entries(tallies).forEach(([key, tally]) => {
      const outcome = tally.yes > tally.no ? 'yes' : 'no';
      const margin = Math.abs(tally.yes - tally.no);
      outcomes[key] = {
        outcome,
        margin,
        yes: tally.yes,
        no: tally.no,
        abstain: tally.abstain,
        total: tally.total
      };
    });

    return outcomes;
  }
}

module.exports = new ClusteringService();

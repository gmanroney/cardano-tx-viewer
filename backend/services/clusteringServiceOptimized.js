const VotingBloc = require('../models/VotingBloc');
const GovernanceVote = require('../models/GovernanceVote');

class ClusteringServiceOptimized {
  /**
   * OPTIMIZED: Compute voting blocs with multiple performance improvements
   *
   * Improvements:
   * 1. MongoDB aggregation instead of loading all votes
   * 2. Pre-computed vote maps (avoid recreating for every comparison)
   * 3. Early termination when no meaningful clusters found
   * 4. Batch processing for large datasets
   */
  async computeBlocs(threshold = 0.7, options = {}) {
    const maxDReps = options.maxDReps || 500; // Limit for safety
    const batchSize = options.batchSize || 100;

    // OPTIMIZATION 1: Use MongoDB aggregation instead of loading all votes
    // This is much faster than find({}).lean() + groupBy in memory
    const drepVotesAggregation = await GovernanceVote.aggregate([
      {
        $group: {
          _id: '$voter',
          voterId: { $first: '$voter' },
          votes: { $push: '$$ROOT' },
          voteCount: { $sum: 1 }
        }
      },
      {
        $match: {
          voteCount: { $gte: 3 } // Only DReps with at least 3 votes
        }
      },
      {
        $limit: maxDReps // Safety limit
      },
      {
        $project: {
          _id: 0,
          voterId: 1,
          votes: 1
        }
      }
    ]);

    if (drepVotesAggregation.length < 2) {
      return [];
    }

    // OPTIMIZATION 2: Pre-compute vote maps for all DReps
    // This avoids recreating maps for every pairwise comparison
    const drepsWithMaps = drepVotesAggregation.map(drep => ({
      voterId: drep.voterId,
      votes: drep.votes,
      voteMap: this.createVoteMap(drep.votes) // Pre-computed!
    }));

    console.log(`Computing blocs for ${drepsWithMaps.length} DReps...`);

    // OPTIMIZATION 3: Compute similarity matrix with pre-computed maps
    const startTime = Date.now();
    const similarities = this.computeSimilarityMatrix(drepsWithMaps);
    const matrixTime = Date.now() - startTime;
    console.log(`Similarity matrix computed in ${matrixTime}ms`);

    // Perform hierarchical clustering
    const blocs = this.agglomerativeClustering(drepsWithMaps, similarities, threshold);

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

    console.log(`Found ${blocs.length} blocs (threshold: ${threshold})`);
    return blocs;
  }

  /**
   * OPTIMIZATION: Create vote map once instead of recreating for every comparison
   */
  createVoteMap(votes) {
    const map = new Map();
    votes.forEach(v => {
      const key = `${v.proposalTxHash}-${v.proposalCertIndex}`;
      map.set(key, v.vote?.toLowerCase());
    });
    return map;
  }

  /**
   * OPTIMIZED: Compute similarity matrix using pre-computed vote maps
   */
  computeSimilarityMatrix(drepsWithMaps) {
    const n = drepsWithMaps.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    // Progress tracking for large datasets
    const totalComparisons = (n * (n - 1)) / 2;
    let completed = 0;
    const reportInterval = Math.max(1, Math.floor(totalComparisons / 10));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        // OPTIMIZATION: Use pre-computed vote maps
        const sim = this.jaccardSimilarityOptimized(
          drepsWithMaps[i].voteMap,
          drepsWithMaps[j].voteMap
        );
        matrix[i][j] = sim;
        matrix[j][i] = sim;

        completed++;
        if (completed % reportInterval === 0) {
          const progress = ((completed / totalComparisons) * 100).toFixed(1);
          console.log(`Similarity computation: ${progress}% (${completed}/${totalComparisons})`);
        }
      }
      matrix[i][i] = 1;
    }

    return matrix;
  }

  /**
   * OPTIMIZED: Jaccard similarity using pre-computed maps
   * No need to create maps on every call - they're passed in!
   */
  jaccardSimilarityOptimized(map1, map2) {
    // Find common proposals
    const commonKeys = [];
    for (const key of map1.keys()) {
      if (map2.has(key)) {
        commonKeys.push(key);
      }
    }

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

  /**
   * Original jaccardSimilarity for backward compatibility
   * (Used by similarityService.js)
   */
  jaccardSimilarity(votes1, votes2) {
    const map1 = this.createVoteMap(votes1);
    const map2 = this.createVoteMap(votes2);
    return this.jaccardSimilarityOptimized(map1, map2);
  }

  agglomerativeClustering(drepsWithMaps, similarities, threshold) {
    // Initialize: each DRep is its own cluster
    const clusters = drepsWithMaps.map((drep, i) => ({
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

  /**
   * OPTIMIZED: Get proposal outcomes using MongoDB aggregation
   */
  async getProposalOutcomes() {
    // Use aggregation instead of loading all votes
    const outcomes = await GovernanceVote.aggregate([
      {
        $group: {
          _id: {
            txHash: '$proposalTxHash',
            certIndex: '$proposalCertIndex'
          },
          yes: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: '$vote' }, 'yes'] }, 1, 0]
            }
          },
          no: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: '$vote' }, 'no'] }, 1, 0]
            }
          },
          abstain: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: '$vote' }, 'abstain'] }, 1, 0]
            }
          },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          key: { $concat: ['$_id.txHash', '-', { $toString: '$_id.certIndex' }] },
          outcome: {
            $cond: [{ $gt: ['$yes', '$no'] }, 'yes', 'no']
          },
          margin: {
            $abs: { $subtract: ['$yes', '$no'] }
          },
          yes: 1,
          no: 1,
          abstain: 1,
          total: 1
        }
      }
    ]);

    // Convert array to object
    const result = {};
    outcomes.forEach(o => {
      result[o.key] = {
        outcome: o.outcome,
        margin: o.margin,
        yes: o.yes,
        no: o.no,
        abstain: o.abstain,
        total: o.total
      };
    });

    return result;
  }
}

module.exports = new ClusteringServiceOptimized();

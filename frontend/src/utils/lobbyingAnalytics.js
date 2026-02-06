/**
 * Advanced lobbying-focused analytics for DRep voting behavior
 * All functions are pure and side-effect free for testing
 */

/**
 * Compute predictability score (voting consistency over time)
 * Lower entropy = more predictable
 * @param {Array} votes - DRep votes [{vote, proposalType, blockTime}]
 * @param {number} windowDays - Rolling window size
 * @returns {number} - Score 0-1 (1 = perfectly predictable)
 */
export function computePredictability(votes, windowDays = 90) {
  if (!votes || votes.length < 3) return 0;

  // Group by action type and compute entropy for each
  const byType = {};
  votes.forEach(v => {
    const type = v.proposal?.type || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(v.vote?.toLowerCase());
  });

  let totalEntropy = 0;
  let typeCount = 0;

  Object.values(byType).forEach(typeVotes => {
    if (typeVotes.length < 2) return;

    const counts = { yes: 0, no: 0, abstain: 0 };
    typeVotes.forEach(v => {
      if (v in counts) counts[v]++;
    });

    const total = typeVotes.length;
    let entropy = 0;
    Object.values(counts).forEach(count => {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    });

    // Normalize entropy (max is log2(3) ≈ 1.585 for 3 choices)
    totalEntropy += entropy / 1.585;
    typeCount++;
  });

  const avgEntropy = typeCount > 0 ? totalEntropy / typeCount : 1;
  return Math.max(0, 1 - avgEntropy); // Invert so 1 = predictable
}

/**
 * Compute swing score (how often DRep differs from majority)
 * Higher score = more independent/swing voter
 * @param {Array} votes - DRep votes
 * @param {Object} outcomes - Map of actionId -> majority outcome
 * @returns {number} - Score 0-1
 */
export function computeSwingScore(votes, outcomes) {
  if (!votes || !outcomes || votes.length === 0) return 0;

  let swings = 0;
  let comparable = 0;

  votes.forEach(vote => {
    const actionId = `${vote.proposalTxHash}-${vote.proposalCertIndex}`;
    const majority = outcomes[actionId];

    if (majority && vote.vote && vote.vote.toLowerCase() !== 'abstain') {
      comparable++;
      if (vote.vote.toLowerCase() !== majority.toLowerCase()) {
        swings++;
      }
    }
  });

  return comparable > 0 ? swings / comparable : 0;
}

/**
 * Compute volatility by action type (variance in voting patterns)
 * Higher = more persuadable on that topic
 * @param {Array} votes - DRep votes
 * @returns {Object} - Map of type -> volatility score
 */
export function computeVolatilityByType(votes) {
  if (!votes || votes.length === 0) return {};

  const byType = {};
  votes.forEach(v => {
    const type = v.proposal?.type || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(v.vote?.toLowerCase());
  });

  const volatility = {};
  Object.entries(byType).forEach(([type, typeVotes]) => {
    if (typeVotes.length < 3) {
      volatility[type] = 0;
      return;
    }

    // Count transitions between votes
    let transitions = 0;
    for (let i = 1; i < typeVotes.length; i++) {
      if (typeVotes[i] !== typeVotes[i-1]) {
        transitions++;
      }
    }

    volatility[type] = transitions / (typeVotes.length - 1);
  });

  return volatility;
}

/**
 * Compute DRep similarity using Jaccard coefficient
 * @param {Array} votes1 - First DRep's votes
 * @param {Array} votes2 - Second DRep's votes
 * @returns {number} - Similarity 0-1
 */
export function computeSimilarity(votes1, votes2) {
  if (!votes1 || !votes2 || votes1.length === 0 || votes2.length === 0) return 0;

  // Build maps of actionId -> vote
  const map1 = {};
  const map2 = {};

  votes1.forEach(v => {
    const id = `${v.proposalTxHash}-${v.proposalCertIndex}`;
    map1[id] = v.vote?.toLowerCase();
  });

  votes2.forEach(v => {
    const id = `${v.proposalTxHash}-${v.proposalCertIndex}`;
    map2[id] = v.vote?.toLowerCase();
  });

  // Find common actions
  const commonActions = Object.keys(map1).filter(id => id in map2);
  if (commonActions.length === 0) return 0;

  // Count agreements (excluding abstains)
  let agreements = 0;
  let comparable = 0;

  commonActions.forEach(id => {
    if (map1[id] !== 'abstain' && map2[id] !== 'abstain') {
      comparable++;
      if (map1[id] === map2[id]) {
        agreements++;
      }
    }
  });

  return comparable > 0 ? agreements / comparable : 0;
}

/**
 * Compute persuasion target score
 * Higher score = better target for lobbying
 * @param {Object} drepMetrics - {participation, volatility, blocStrength, predictability}
 * @returns {number} - Score 0-100
 */
export function computePersuasionScore(drepMetrics) {
  const {
    participation = 0,
    volatility = 0,
    blocStrength = 0,
    predictability = 0,
    abstainRate = 0
  } = drepMetrics;

  // Ideal target: high participation, high volatility, low bloc loyalty, not too abstain-heavy
  let score = 0;

  // Participation weight (need them to show up)
  score += participation * 30;

  // Volatility weight (means they can be swayed)
  score += volatility * 25;

  // Low bloc strength (independent thinkers)
  score += (1 - blocStrength) * 25;

  // Moderate predictability (not chaotic, but not rigid)
  const moderatePredictability = predictability > 0.3 && predictability < 0.7 ? 1 : predictability;
  score += moderatePredictability * 15;

  // Penalize high abstain rate
  score -= abstainRate * 20;

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute pivotality (rough estimate based on voting power and margin)
 * @param {Array} votes - DRep votes
 * @param {Object} outcomes - Action outcomes with margins
 * @param {number} drepPower - DRep's voting power
 * @returns {Object} - {pivotalVotes: [], pivotalityRate: number}
 */
export function computePivotality(votes, outcomes, drepPower) {
  if (!votes || !outcomes || !drepPower) {
    return { pivotalVotes: [], pivotalityRate: 0 };
  }

  const pivotalVotes = [];

  votes.forEach(vote => {
    const actionId = `${vote.proposalTxHash}-${vote.proposalCertIndex}`;
    const outcome = outcomes[actionId];

    if (outcome && outcome.margin !== undefined) {
      // Simple pivotality: was margin < 2x this DRep's power?
      if (Math.abs(outcome.margin) <= 2 * drepPower) {
        pivotalVotes.push({
          ...vote,
          margin: outcome.margin,
          isPivotal: true
        });
      }
    }
  });

  const pivotalityRate = votes.length > 0 ? pivotalVotes.length / votes.length : 0;

  return { pivotalVotes, pivotalityRate };
}

/**
 * Identify signature positions (statistically distinct voting patterns)
 * @param {Array} votes - DRep votes
 * @param {Object} populationStats - Overall population voting stats by type
 * @returns {Array} - [{type, drepRate, popRate, deviation, isSignature}]
 */
export function identifySignaturePositions(votes, populationStats) {
  if (!votes || !populationStats) return [];

  const drepStats = {};
  votes.forEach(v => {
    const type = v.proposal?.type || 'unknown';
    if (!drepStats[type]) {
      drepStats[type] = { yes: 0, no: 0, abstain: 0, total: 0 };
    }
    drepStats[type][v.vote?.toLowerCase() || 'abstain']++;
    drepStats[type].total++;
  });

  const signatures = [];

  Object.entries(drepStats).forEach(([type, stats]) => {
    const popStat = populationStats[type];
    if (!popStat || stats.total < 3) return;

    const drepYesRate = stats.yes / stats.total;
    const popYesRate = popStat.yes / popStat.total;

    // Deviation > 0.3 is considered signature
    const deviation = Math.abs(drepYesRate - popYesRate);

    if (deviation > 0.3) {
      signatures.push({
        type,
        drepYesRate,
        popYesRate,
        deviation,
        isSignature: true,
        stance: drepYesRate > popYesRate ? 'more_supportive' : 'more_opposed'
      });
    }
  });

  return signatures.sort((a, b) => b.deviation - a.deviation);
}

/**
 * Generate contact strategy recommendations
 * @param {Object} analytics - All computed analytics for DRep
 * @returns {Object} - {topIssues, messagingStyle, riskFlags, bestApproach}
 */
export function generateContactStrategy(analytics) {
  const {
    volatilityByType = {},
    signaturePositions = [],
    participation = 0,
    abstainRate = 0,
    lateVoterRate = 0,
    predictability = 0,
    persuasionScore = 0
  } = analytics;

  // Top issues = high volatility (persuadable) + high participation
  const topIssues = Object.entries(volatilityByType)
    .filter(([type, vol]) => vol > 0.3)
    .map(([type, vol]) => ({ type, volatility: vol }))
    .sort((a, b) => b.volatility - a.volatility)
    .slice(0, 3);

  // Messaging style based on predictability
  let messagingStyle = '';
  if (predictability > 0.7) {
    messagingStyle = 'Values-based: Appeal to consistency and principles';
  } else if (predictability > 0.4) {
    messagingStyle = 'Outcomes-focused: Show practical benefits and data';
  } else {
    messagingStyle = 'Coalition-building: Emphasize community consensus';
  }

  // Risk flags
  const riskFlags = [];
  if (participation < 0.5) riskFlags.push('Low participation - may not engage');
  if (abstainRate > 0.3) riskFlags.push('High abstain rate - lacks strong opinions');
  if (lateVoterRate > 0.4) riskFlags.push('Late voter - needs early engagement');
  if (predictability < 0.2) riskFlags.push('Erratic voting - unpredictable');

  // Best approach
  let bestApproach = '';
  if (persuasionScore > 70) {
    bestApproach = 'High-value target: Direct outreach recommended';
  } else if (persuasionScore > 40) {
    bestApproach = 'Moderate target: Community events and education';
  } else {
    bestApproach = 'Low priority: Focus on higher-value targets first';
  }

  return {
    topIssues,
    messagingStyle,
    riskFlags,
    bestApproach,
    persuasionScore
  };
}

/**
 * Detect voting blocs using simple hierarchical clustering
 * @param {Array} allDReps - All DReps with vote vectors
 * @param {number} threshold - Similarity threshold for same bloc (0-1)
 * @returns {Array} - Blocs [{id, members: [], centroid, size}]
 */
export function detectBlocs(allDReps, threshold = 0.7) {
  if (!allDReps || allDReps.length < 2) return [];

  // Compute similarity matrix
  const n = allDReps.length;
  const similarities = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = computeSimilarity(allDReps[i].votes, allDReps[j].votes);
      similarities[i][j] = sim;
      similarities[j][i] = sim;
    }
    similarities[i][i] = 1;
  }

  // Simple agglomerative clustering
  const clusters = allDReps.map((drep, i) => ({ id: i, members: [i], drep }));

  while (true) {
    // Find most similar pair
    let maxSim = threshold;
    let mergeI = -1;
    let mergeJ = -1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        // Average linkage
        let totalSim = 0;
        let count = 0;
        clusters[i].members.forEach(mi => {
          clusters[j].members.forEach(mj => {
            totalSim += similarities[mi][mj];
            count++;
          });
        });
        const avgSim = count > 0 ? totalSim / count : 0;

        if (avgSim > maxSim) {
          maxSim = avgSim;
          mergeI = i;
          mergeJ = j;
        }
      }
    }

    if (mergeI === -1) break; // No more clusters to merge

    // Merge clusters
    clusters[mergeI].members.push(...clusters[mergeJ].members);
    clusters.splice(mergeJ, 1);
  }

  // Format output
  return clusters.map((cluster, idx) => ({
    id: `bloc-${idx}`,
    members: cluster.members.map(i => allDReps[i].voterId),
    size: cluster.members.length,
    cohesion: calculateCohesion(cluster.members, similarities)
  }));
}

/**
 * Calculate within-bloc cohesion
 * @param {Array} members - Member indices
 * @param {Array} similarities - Similarity matrix
 * @returns {number} - Average similarity within bloc
 */
function calculateCohesion(members, similarities) {
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
 * Compute cross-bloc bridge score
 * @param {Array} votes - DRep votes
 * @param {Object} blocMemberships - Map of drepId -> blocId
 * @param {Array} allDReps - All DReps with votes
 * @returns {number} - Bridge score 0-1 (higher = more cross-bloc alignment)
 */
export function computeBridgeScore(votes, blocMemberships, allDReps) {
  if (!votes || !blocMemberships || !allDReps) return 0;

  // Find DReps from other blocs with high similarity
  const myBloc = blocMemberships[votes[0]?.voterId];
  if (!myBloc) return 0;

  const otherBlocDReps = allDReps.filter(d => blocMemberships[d.voterId] !== myBloc);
  if (otherBlocDReps.length === 0) return 0;

  let totalSim = 0;
  otherBlocDReps.forEach(other => {
    totalSim += computeSimilarity(votes, other.votes);
  });

  return totalSim / otherBlocDReps.length;
}

/**
 * Compute time-series metrics for trend analysis
 * @param {Array} votes - DRep votes sorted by time
 * @param {number} windowSize - Number of votes per window
 * @returns {Array} - [{period, yesRate, participationRate, latency}]
 */
export function computeTimeSeries(votes, windowSize = 10) {
  if (!votes || votes.length < windowSize) return [];

  const series = [];

  for (let i = 0; i < votes.length - windowSize + 1; i++) {
    const window = votes.slice(i, i + windowSize);

    const yesCount = window.filter(v => v.vote?.toLowerCase() === 'yes').length;
    const yesRate = yesCount / windowSize;

    const avgTime = window.reduce((sum, v) => {
      const time = new Date(v.blockTime).getTime();
      return sum + time;
    }, 0) / windowSize;

    series.push({
      period: i,
      timestamp: new Date(avgTime),
      yesRate,
      voteCount: windowSize
    });
  }

  return series;
}

/**
 * Export filtered votes to CSV format
 * @param {Array} votes - Votes to export
 * @param {string} drepName - DRep name for filename
 * @returns {string} - CSV content
 */
export function exportLobbyingBrief(votes, drepName, analytics) {
  const lines = [];

  // Header
  lines.push(`# Lobbying Brief: ${drepName}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Key Metrics
  lines.push('## Key Metrics');
  lines.push(`Persuasion Score: ${analytics.persuasionScore?.toFixed(1) || 'N/A'}/100`);
  lines.push(`Participation Rate: ${(analytics.participation * 100).toFixed(1)}%`);
  lines.push(`Predictability: ${(analytics.predictability * 100).toFixed(1)}%`);
  lines.push('');

  // Contact Strategy
  lines.push('## Contact Strategy');
  lines.push(`Approach: ${analytics.contactStrategy?.bestApproach || 'N/A'}`);
  lines.push(`Messaging: ${analytics.contactStrategy?.messagingStyle || 'N/A'}`);
  lines.push('');

  // Top Issues
  if (analytics.contactStrategy?.topIssues?.length > 0) {
    lines.push('## Top Persuadable Issues');
    analytics.contactStrategy.topIssues.forEach(issue => {
      lines.push(`- ${issue.type}: ${(issue.volatility * 100).toFixed(0)}% volatility`);
    });
    lines.push('');
  }

  // Risk Flags
  if (analytics.contactStrategy?.riskFlags?.length > 0) {
    lines.push('## Risk Flags');
    analytics.contactStrategy.riskFlags.forEach(flag => {
      lines.push(`- ${flag}`);
    });
    lines.push('');
  }

  // Voting History Summary
  lines.push('## Recent Voting History');
  const recentVotes = votes.slice(0, 10);
  recentVotes.forEach(v => {
    lines.push(`- ${v.proposal?.type || 'Unknown'}: ${v.vote?.toUpperCase()} (${new Date(v.blockTime).toLocaleDateString()})`);
  });

  return lines.join('\n');
}

/**
 * Pure functions for computing DRep voting analytics
 * All functions are side-effect free and unit-testable
 */

/**
 * Compute overall participation rate
 * @param {Array} drepVotes - Votes cast by this DRep
 * @param {Array} allActions - All governance actions available
 * @returns {number} - Participation rate as decimal (0-1)
 */
export function computeParticipation(drepVotes, allActions) {
  if (!allActions || allActions.length === 0) return 0;
  if (!drepVotes || drepVotes.length === 0) return 0;

  const uniqueActionIds = new Set(drepVotes.map(v => v.proposalTxHash + v.proposalCertIndex));
  return uniqueActionIds.size / allActions.length;
}

/**
 * Compute participation rate by action type
 * @param {Array} drepVotes - Votes cast by this DRep
 * @param {Array} allActions - All governance actions available
 * @returns {Object} - Map of type -> {voted, total, rate}
 */
export function computeParticipationByType(drepVotes, allActions) {
  if (!allActions || !drepVotes) return {};

  const typeStats = {};

  // Count total actions by type
  allActions.forEach(action => {
    const type = action.type || action.governance_type || 'unknown';
    if (!typeStats[type]) {
      typeStats[type] = { voted: 0, total: 0, rate: 0 };
    }
    typeStats[type].total++;
  });

  // Count voted actions by type
  drepVotes.forEach(vote => {
    const action = allActions.find(a =>
      a.txHash === vote.proposalTxHash || a.tx_hash === vote.proposalTxHash
    );
    if (action) {
      const type = action.type || action.governance_type || 'unknown';
      if (typeStats[type]) {
        typeStats[type].voted++;
      }
    }
  });

  // Calculate rates
  Object.keys(typeStats).forEach(type => {
    if (typeStats[type].total > 0) {
      typeStats[type].rate = typeStats[type].voted / typeStats[type].total;
    }
  });

  return typeStats;
}

/**
 * Compute choice distribution (yes/no/abstain)
 * @param {Array} drepVotes - Votes cast by this DRep
 * @param {string} weightMode - 'count' or 'stake'
 * @returns {Object} - {yes, no, abstain} with counts or stake-weighted values
 */
export function computeChoiceDistribution(drepVotes, weightMode = 'count') {
  if (!drepVotes || drepVotes.length === 0) {
    return { yes: 0, no: 0, abstain: 0 };
  }

  const distribution = { yes: 0, no: 0, abstain: 0 };

  drepVotes.forEach(vote => {
    const choice = (vote.vote || '').toLowerCase();
    if (choice in distribution) {
      if (weightMode === 'stake' && vote.voting_power) {
        distribution[choice] += parseInt(vote.voting_power) || 0;
      } else {
        distribution[choice]++;
      }
    }
  });

  return distribution;
}

/**
 * Compute voting latency statistics
 * @param {Array} drepVotes - Votes cast by this DRep
 * @param {Array} allActions - All governance actions with voting windows
 * @returns {Object} - {median, mean, p25, p75, p90, distribution}
 */
export function computeLatencyStats(drepVotes, allActions) {
  if (!drepVotes || drepVotes.length === 0) {
    return { median: 0, mean: 0, p25: 0, p75: 0, p90: 0, distribution: [] };
  }

  const latencies = [];

  drepVotes.forEach(vote => {
    const action = allActions.find(a =>
      (a.txHash === vote.proposalTxHash || a.tx_hash === vote.proposalTxHash) &&
      (a.certIndex === vote.proposalCertIndex || a.cert_index === vote.proposalCertIndex)
    );

    if (action && vote.blockTime) {
      const votedAt = new Date(vote.blockTime);
      // Use action creation time or block time as start
      const startTime = action.votingStart
        ? new Date(action.votingStart)
        : action.block_time
        ? new Date(action.block_time * 1000)
        : null;

      if (startTime && !isNaN(votedAt.getTime()) && !isNaN(startTime.getTime())) {
        const latencyMs = votedAt - startTime;
        if (latencyMs >= 0) {
          latencies.push({
            latencyMs,
            latencyHours: latencyMs / (1000 * 60 * 60),
            latencyDays: latencyMs / (1000 * 60 * 60 * 24)
          });
        }
      }
    }
  });

  if (latencies.length === 0) {
    return { median: 0, mean: 0, p25: 0, p75: 0, p90: 0, distribution: [] };
  }

  // Sort by latency
  latencies.sort((a, b) => a.latencyMs - b.latencyMs);

  const mean = latencies.reduce((sum, l) => sum + l.latencyHours, 0) / latencies.length;

  return {
    median: latencies[Math.floor(latencies.length / 2)].latencyHours,
    mean,
    p25: latencies[Math.floor(latencies.length * 0.25)].latencyHours,
    p75: latencies[Math.floor(latencies.length * 0.75)].latencyHours,
    p90: latencies[Math.floor(latencies.length * 0.90)].latencyHours,
    distribution: latencies
  };
}

/**
 * Compute late voter rate
 * @param {Array} drepVotes - Votes cast by this DRep
 * @param {Array} allActions - All governance actions with voting windows
 * @param {number} lateThreshold - Threshold (0-1) defining "late" (default 0.8 = last 20%)
 * @returns {number} - Percentage of votes cast late (0-1)
 */
export function computeLateVoterRate(drepVotes, allActions, lateThreshold = 0.8) {
  if (!drepVotes || drepVotes.length === 0) return 0;

  let lateVotes = 0;
  let votesWithWindow = 0;

  drepVotes.forEach(vote => {
    const action = allActions.find(a =>
      (a.txHash === vote.proposalTxHash || a.tx_hash === vote.proposalTxHash)
    );

    if (action && vote.blockTime) {
      const votedAt = new Date(vote.blockTime);
      const startTime = action.votingStart ? new Date(action.votingStart) : null;
      const endTime = action.votingEnd ? new Date(action.votingEnd) : null;

      if (startTime && endTime && !isNaN(votedAt.getTime())) {
        votesWithWindow++;
        const windowDuration = endTime - startTime;
        const voteOffset = votedAt - startTime;
        const relativePosition = voteOffset / windowDuration;

        if (relativePosition >= lateThreshold) {
          lateVotes++;
        }
      }
    }
  });

  return votesWithWindow > 0 ? lateVotes / votesWithWindow : 0;
}

/**
 * Compute alignment with majority outcome
 * @param {Array} drepVotes - Votes cast by this DRep
 * @param {Object} overallOutcomes - Map of actionId -> majority outcome {choice, isStakeWeighted}
 * @returns {Object} - {alignmentRate, alignedCount, totalComparable}
 */
export function computeAlignment(drepVotes, overallOutcomes) {
  if (!drepVotes || !overallOutcomes) {
    return { alignmentRate: 0, alignedCount: 0, totalComparable: 0, contrarian: 0 };
  }

  let alignedCount = 0;
  let totalComparable = 0;

  drepVotes.forEach(vote => {
    const actionId = vote.proposalTxHash + '_' + vote.proposalCertIndex;
    const outcome = overallOutcomes[actionId];

    if (outcome && outcome.choice) {
      totalComparable++;
      if (vote.vote.toLowerCase() === outcome.choice.toLowerCase()) {
        alignedCount++;
      }
    }
  });

  const alignmentRate = totalComparable > 0 ? alignedCount / totalComparable : 0;
  const contrarian = totalComparable > 0 ? (totalComparable - alignedCount) / totalComparable : 0;

  return { alignmentRate, alignedCount, totalComparable, contrarian };
}

/**
 * Compute stability/consistency score using entropy
 * @param {Array} drepVotes - Votes cast by this DRep
 * @param {number} windowDays - Rolling window in days (0 = all time)
 * @returns {number} - Entropy score (0 = perfectly consistent, higher = more varied)
 */
export function computeEntropyStability(drepVotes, windowDays = 0) {
  if (!drepVotes || drepVotes.length === 0) return 0;

  let votesToConsider = drepVotes;

  // Apply time window if specified
  if (windowDays > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    votesToConsider = drepVotes.filter(v => {
      if (!v.blockTime) return false;
      const voteDate = new Date(v.blockTime);
      return voteDate >= cutoffDate;
    });
  }

  if (votesToConsider.length === 0) return 0;

  // Count choice frequencies
  const counts = { yes: 0, no: 0, abstain: 0 };
  votesToConsider.forEach(vote => {
    const choice = (vote.vote || '').toLowerCase();
    if (choice in counts) {
      counts[choice]++;
    }
  });

  // Calculate entropy: -Σ(p * log2(p))
  const total = votesToConsider.length;
  let entropy = 0;

  Object.values(counts).forEach(count => {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  });

  return entropy;
}

/**
 * Compute rolling statistics over time windows
 * @param {Array} drepVotes - Votes cast by this DRep (should be sorted by date)
 * @param {number} windowDays - Rolling window size in days
 * @returns {Array} - Array of {date, participation, yesRate, noRate, abstainRate, entropy}
 */
export function computeRollingStats(drepVotes, windowDays = 30) {
  if (!drepVotes || drepVotes.length === 0) return [];

  // Sort votes by date
  const sortedVotes = [...drepVotes].sort((a, b) => {
    const dateA = new Date(a.blockTime);
    const dateB = new Date(b.blockTime);
    return dateA - dateB;
  });

  const results = [];
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  // For each date with a vote, compute stats for the window ending on that date
  sortedVotes.forEach((vote, index) => {
    const endDate = new Date(vote.blockTime);
    if (isNaN(endDate.getTime())) return;

    const startDate = new Date(endDate.getTime() - windowMs);

    // Get votes in window
    const windowVotes = sortedVotes.filter(v => {
      const vDate = new Date(v.blockTime);
      return vDate >= startDate && vDate <= endDate;
    });

    if (windowVotes.length === 0) return;

    // Compute stats
    const distribution = computeChoiceDistribution(windowVotes, 'count');
    const total = windowVotes.length;
    const entropy = computeEntropyStability(windowVotes, 0);

    results.push({
      date: endDate,
      voteCount: total,
      yesRate: distribution.yes / total,
      noRate: distribution.no / total,
      abstainRate: distribution.abstain / total,
      entropy
    });
  });

  return results;
}

/**
 * Convert table data to CSV format
 * @param {Array} rows - Array of objects
 * @param {Array} columns - Column definitions [{key, label}]
 * @returns {string} - CSV string
 */
export function toCsv(rows, columns) {
  if (!rows || rows.length === 0) return '';

  // Header row
  const headers = columns.map(col => `"${col.label}"`).join(',');

  // Data rows
  const dataRows = rows.map(row => {
    return columns.map(col => {
      let value = row[col.key];
      if (value === null || value === undefined) value = '';
      if (typeof value === 'object') value = JSON.stringify(value);
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headers, ...dataRows].join('\n');
}

/**
 * Categorize latency into buckets
 * @param {number} latencyHours - Latency in hours
 * @returns {string} - Bucket label
 */
export function categorizeLatency(latencyHours) {
  if (latencyHours < 1) return '< 1 hour';
  if (latencyHours < 6) return '1-6 hours';
  if (latencyHours < 24) return '6-24 hours';
  if (latencyHours < 72) return '1-3 days';
  if (latencyHours < 168) return '3-7 days';
  return '> 7 days';
}

/**
 * Filter votes by criteria
 * @param {Array} votes - Votes to filter
 * @param {Object} filters - Filter criteria
 * @returns {Array} - Filtered votes
 */
export function filterVotes(votes, filters) {
  if (!votes) return [];

  return votes.filter(vote => {
    // Date range
    if (filters.startDate || filters.endDate) {
      const voteDate = new Date(vote.blockTime);
      if (filters.startDate && voteDate < new Date(filters.startDate)) return false;
      if (filters.endDate && voteDate > new Date(filters.endDate)) return false;
    }

    // Choice filter
    if (filters.choice && filters.choice !== 'all') {
      if (vote.vote.toLowerCase() !== filters.choice.toLowerCase()) return false;
    }

    // Action type filter
    if (filters.actionType && filters.actionType !== 'all') {
      if (vote.proposal?.type !== filters.actionType) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (vote.proposal?.status !== filters.status) return false;
    }

    // Min voting power
    if (filters.minVotingPower) {
      const power = parseInt(vote.voting_power) || 0;
      if (power < filters.minVotingPower) return false;
    }

    // Latency bucket
    if (filters.latencyBucket && filters.latencyBucket !== 'all') {
      // This would need latency computed - skip for now or compute on the fly
    }

    return true;
  });
}

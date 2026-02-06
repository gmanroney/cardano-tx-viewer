import {
  computeParticipation,
  computeParticipationByType,
  computeChoiceDistribution,
  computeLatencyStats,
  computeLateVoterRate,
  computeAlignment,
  computeEntropyStability,
  categorizeLatency,
  toCsv
} from './drepAnalytics';

describe('drepAnalytics', () => {
  describe('computeParticipation', () => {
    it('should return 0 for empty votes', () => {
      expect(computeParticipation([], [{ id: 1 }, { id: 2 }])).toBe(0);
    });

    it('should return 0 for empty actions', () => {
      expect(computeParticipation([{ proposalTxHash: 'a', proposalCertIndex: 0 }], [])).toBe(0);
    });

    it('should compute correct participation rate', () => {
      const votes = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0 },
        { proposalTxHash: 'tx2', proposalCertIndex: 0 }
      ];
      const actions = [
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }
      ];
      expect(computeParticipation(votes, actions)).toBe(0.5); // 2/4
    });

    it('should handle duplicate votes for same action', () => {
      const votes = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0 },
        { proposalTxHash: 'tx1', proposalCertIndex: 0 }
      ];
      const actions = [{ id: 1 }, { id: 2 }];
      expect(computeParticipation(votes, actions)).toBe(0.5); // 1/2 unique actions
    });
  });

  describe('computeParticipationByType', () => {
    it('should return empty object for no data', () => {
      expect(computeParticipationByType(null, null)).toEqual({});
    });

    it('should compute participation by type correctly', () => {
      const votes = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0 },
        { proposalTxHash: 'tx2', proposalCertIndex: 0 }
      ];
      const actions = [
        { txHash: 'tx1', type: 'treasury_withdrawals' },
        { txHash: 'tx2', type: 'treasury_withdrawals' },
        { txHash: 'tx3', type: 'new_constitution' },
        { txHash: 'tx4', type: 'new_constitution' }
      ];

      const result = computeParticipationByType(votes, actions);

      expect(result.treasury_withdrawals).toEqual({
        voted: 2,
        total: 2,
        rate: 1
      });
      expect(result.new_constitution).toEqual({
        voted: 0,
        total: 2,
        rate: 0
      });
    });
  });

  describe('computeChoiceDistribution', () => {
    it('should return zero distribution for empty votes', () => {
      expect(computeChoiceDistribution([])).toEqual({
        yes: 0,
        no: 0,
        abstain: 0
      });
    });

    it('should count votes correctly', () => {
      const votes = [
        { vote: 'yes' },
        { vote: 'yes' },
        { vote: 'no' },
        { vote: 'abstain' }
      ];

      expect(computeChoiceDistribution(votes, 'count')).toEqual({
        yes: 2,
        no: 1,
        abstain: 1
      });
    });

    it('should handle stake-weighted mode', () => {
      const votes = [
        { vote: 'yes', voting_power: '1000000' },
        { vote: 'yes', voting_power: '2000000' },
        { vote: 'no', voting_power: '500000' }
      ];

      const result = computeChoiceDistribution(votes, 'stake');
      expect(result.yes).toBe(3000000);
      expect(result.no).toBe(500000);
      expect(result.abstain).toBe(0);
    });

    it('should handle case-insensitive vote values', () => {
      const votes = [
        { vote: 'YES' },
        { vote: 'No' },
        { vote: 'ABSTAIN' }
      ];

      expect(computeChoiceDistribution(votes, 'count')).toEqual({
        yes: 1,
        no: 1,
        abstain: 1
      });
    });
  });

  describe('computeLatencyStats', () => {
    it('should return zeros for empty votes', () => {
      const result = computeLatencyStats([], []);
      expect(result.median).toBe(0);
      expect(result.mean).toBe(0);
    });

    it('should compute latency statistics correctly', () => {
      const votes = [
        {
          proposalTxHash: 'tx1',
          proposalCertIndex: 0,
          blockTime: new Date('2024-01-01T12:00:00Z')
        },
        {
          proposalTxHash: 'tx2',
          proposalCertIndex: 0,
          blockTime: new Date('2024-01-01T18:00:00Z')
        }
      ];

      const actions = [
        {
          txHash: 'tx1',
          certIndex: 0,
          votingStart: '2024-01-01T10:00:00Z'
        },
        {
          txHash: 'tx2',
          certIndex: 0,
          votingStart: '2024-01-01T12:00:00Z'
        }
      ];

      const result = computeLatencyStats(votes, actions);
      expect(result.median).toBeGreaterThan(0);
      expect(result.mean).toBeGreaterThan(0);
      expect(result.distribution.length).toBe(2);
    });
  });

  describe('computeLateVoterRate', () => {
    it('should return 0 for empty votes', () => {
      expect(computeLateVoterRate([], [])).toBe(0);
    });

    it('should identify late votes correctly', () => {
      const votes = [
        {
          proposalTxHash: 'tx1',
          blockTime: new Date('2024-01-01T09:00:00Z') // Early: 10% through window
        },
        {
          proposalTxHash: 'tx2',
          blockTime: new Date('2024-01-01T19:00:00Z') // Late: 90% through window
        }
      ];

      const actions = [
        {
          txHash: 'tx1',
          votingStart: '2024-01-01T08:00:00Z',
          votingEnd: '2024-01-01T18:00:00Z' // 10 hour window
        },
        {
          txHash: 'tx2',
          votingStart: '2024-01-01T10:00:00Z',
          votingEnd: '2024-01-01T20:00:00Z' // 10 hour window
        }
      ];

      const result = computeLateVoterRate(votes, actions, 0.8);
      expect(result).toBe(0.5); // 1 out of 2 votes was late
    });
  });

  describe('computeAlignment', () => {
    it('should return zeros for no data', () => {
      const result = computeAlignment(null, {});
      expect(result.alignmentRate).toBe(0);
      expect(result.alignedCount).toBe(0);
    });

    it('should compute alignment correctly', () => {
      const votes = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'no' },
        { proposalTxHash: 'tx3', proposalCertIndex: 0, vote: 'yes' }
      ];

      const outcomes = {
        'tx1_0': { choice: 'yes' },
        'tx2_0': { choice: 'yes' }, // DRep voted no, majority yes
        'tx3_0': { choice: 'yes' }
      };

      const result = computeAlignment(votes, outcomes);
      expect(result.alignmentRate).toBeCloseTo(2 / 3);
      expect(result.alignedCount).toBe(2);
      expect(result.totalComparable).toBe(3);
      expect(result.contrarian).toBeCloseTo(1 / 3);
    });
  });

  describe('computeEntropyStability', () => {
    it('should return 0 for empty votes', () => {
      expect(computeEntropyStability([])).toBe(0);
    });

    it('should return 0 for perfectly consistent voting', () => {
      const votes = [
        { vote: 'yes', blockTime: new Date() },
        { vote: 'yes', blockTime: new Date() },
        { vote: 'yes', blockTime: new Date() }
      ];

      expect(computeEntropyStability(votes)).toBe(0);
    });

    it('should return higher entropy for varied voting', () => {
      const votesConsistent = [
        { vote: 'yes', blockTime: new Date() },
        { vote: 'yes', blockTime: new Date() }
      ];

      const votesVaried = [
        { vote: 'yes', blockTime: new Date() },
        { vote: 'no', blockTime: new Date() },
        { vote: 'abstain', blockTime: new Date() }
      ];

      const entropyConsistent = computeEntropyStability(votesConsistent);
      const entropyVaried = computeEntropyStability(votesVaried);

      expect(entropyVaried).toBeGreaterThan(entropyConsistent);
    });
  });

  describe('categorizeLatency', () => {
    it('should categorize latencies correctly', () => {
      expect(categorizeLatency(0.5)).toBe('< 1 hour');
      expect(categorizeLatency(3)).toBe('1-6 hours');
      expect(categorizeLatency(12)).toBe('6-24 hours');
      expect(categorizeLatency(48)).toBe('1-3 days');
      expect(categorizeLatency(100)).toBe('3-7 days');
      expect(categorizeLatency(200)).toBe('> 7 days');
    });
  });

  describe('toCsv', () => {
    it('should return empty string for empty data', () => {
      expect(toCsv([], [])).toBe('');
    });

    it('should generate CSV correctly', () => {
      const rows = [
        { name: 'Alice', age: 30, city: 'NYC' },
        { name: 'Bob', age: 25, city: 'LA' }
      ];

      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'age', label: 'Age' },
        { key: 'city', label: 'City' }
      ];

      const csv = toCsv(rows, columns);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('"Name","Age","City"');
      expect(lines[1]).toBe('"Alice","30","NYC"');
      expect(lines[2]).toBe('"Bob","25","LA"');
    });

    it('should escape quotes in values', () => {
      const rows = [{ name: 'Say "Hello"', value: 42 }];
      const columns = [
        { key: 'name', label: 'Name' },
        { key: 'value', label: 'Value' }
      ];

      const csv = toCsv(rows, columns);
      expect(csv).toContain('Say ""Hello""');
    });
  });
});

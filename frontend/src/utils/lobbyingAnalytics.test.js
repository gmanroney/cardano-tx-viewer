import {
  computePredictability,
  computeSwingScore,
  computeVolatilityByType,
  computeSimilarity,
  computePersuasionScore,
  computePivotality,
  identifySignaturePositions,
  generateContactStrategy,
  detectBlocs,
  computeBridgeScore,
  computeTimeSeries,
  exportLobbyingBrief
} from './lobbyingAnalytics';

describe('Lobbying Analytics', () => {
  describe('computePredictability', () => {
    it('should return 0 for empty votes', () => {
      expect(computePredictability([])).toBe(0);
    });

    it('should return 0 for insufficient votes', () => {
      const votes = [{ vote: 'yes', proposal: { type: 'treasury' } }];
      expect(computePredictability(votes)).toBe(0);
    });

    it('should return high score for consistent voting', () => {
      const votes = [
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } }
      ];
      const score = computePredictability(votes);
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return low score for inconsistent voting', () => {
      const votes = [
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'no', proposal: { type: 'treasury' } },
        { vote: 'abstain', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } }
      ];
      const score = computePredictability(votes);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('computeSwingScore', () => {
    it('should return 0 for empty votes', () => {
      expect(computeSwingScore([], {})).toBe(0);
    });

    it('should return 0 when always agreeing with majority', () => {
      const votes = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'no' }
      ];
      const outcomes = {
        'tx1-0': 'yes',
        'tx2-0': 'no'
      };
      expect(computeSwingScore(votes, outcomes)).toBe(0);
    });

    it('should return 1 when always disagreeing with majority', () => {
      const votes = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'no' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'yes' }
      ];
      const outcomes = {
        'tx1-0': 'yes',
        'tx2-0': 'no'
      };
      expect(computeSwingScore(votes, outcomes)).toBe(1);
    });

    it('should ignore abstain votes', () => {
      const votes = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'abstain' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'yes' }
      ];
      const outcomes = {
        'tx1-0': 'yes',
        'tx2-0': 'yes'
      };
      expect(computeSwingScore(votes, outcomes)).toBe(0);
    });
  });

  describe('computeVolatilityByType', () => {
    it('should return empty object for no votes', () => {
      expect(computeVolatilityByType([])).toEqual({});
    });

    it('should return 0 for insufficient votes per type', () => {
      const votes = [
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } }
      ];
      const volatility = computeVolatilityByType(votes);
      expect(volatility.treasury).toBe(0);
    });

    it('should compute high volatility for changing votes', () => {
      const votes = [
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'no', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'no', proposal: { type: 'treasury' } }
      ];
      const volatility = computeVolatilityByType(votes);
      expect(volatility.treasury).toBe(1);
    });

    it('should compute zero volatility for consistent votes', () => {
      const votes = [
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } }
      ];
      const volatility = computeVolatilityByType(votes);
      expect(volatility.treasury).toBe(0);
    });
  });

  describe('computeSimilarity', () => {
    it('should return 0 for empty votes', () => {
      expect(computeSimilarity([], [])).toBe(0);
    });

    it('should return 1 for identical votes', () => {
      const votes1 = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'no' }
      ];
      const votes2 = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'no' }
      ];
      expect(computeSimilarity(votes1, votes2)).toBe(1);
    });

    it('should return 0 for completely different votes', () => {
      const votes1 = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'yes' }
      ];
      const votes2 = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'no' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'no' }
      ];
      expect(computeSimilarity(votes1, votes2)).toBe(0);
    });

    it('should compute partial similarity', () => {
      const votes1 = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'no' }
      ];
      const votes2 = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'yes' }
      ];
      expect(computeSimilarity(votes1, votes2)).toBe(0.5);
    });

    it('should ignore abstain votes in similarity calculation', () => {
      const votes1 = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'abstain' }
      ];
      const votes2 = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'no' }
      ];
      expect(computeSimilarity(votes1, votes2)).toBe(1);
    });
  });

  describe('computePersuasionScore', () => {
    it('should return 0 for completely unfavorable metrics', () => {
      const metrics = {
        participation: 0,
        volatility: 0,
        blocStrength: 1,
        predictability: 0,
        abstainRate: 1
      };
      const score = computePersuasionScore(metrics);
      expect(score).toBeLessThan(10);
    });

    it('should return high score for ideal lobbying target', () => {
      const metrics = {
        participation: 0.9,
        volatility: 0.7,
        blocStrength: 0.2,
        predictability: 0.5,
        abstainRate: 0.1
      };
      const score = computePersuasionScore(metrics);
      expect(score).toBeGreaterThan(70);
    });

    it('should penalize high abstain rate', () => {
      const metrics1 = {
        participation: 0.9,
        volatility: 0.5,
        blocStrength: 0.3,
        predictability: 0.5,
        abstainRate: 0.1
      };
      const metrics2 = {
        ...metrics1,
        abstainRate: 0.8
      };
      const score1 = computePersuasionScore(metrics1);
      const score2 = computePersuasionScore(metrics2);
      expect(score2).toBeLessThan(score1);
    });
  });

  describe('computePivotality', () => {
    it('should return empty for no votes', () => {
      const result = computePivotality([], {}, 1000000);
      expect(result.pivotalVotes).toEqual([]);
      expect(result.pivotalityRate).toBe(0);
    });

    it('should identify pivotal votes based on margin', () => {
      const votes = [
        { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
        { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'yes' }
      ];
      const outcomes = {
        'tx1-0': { margin: 500000 },  // Pivotal (within 2x power)
        'tx2-0': { margin: 5000000 }  // Not pivotal
      };
      const drepPower = 1000000;

      const result = computePivotality(votes, outcomes, drepPower);
      expect(result.pivotalVotes.length).toBe(1);
      expect(result.pivotalityRate).toBe(0.5);
    });
  });

  describe('identifySignaturePositions', () => {
    it('should return empty for no votes', () => {
      expect(identifySignaturePositions([], {})).toEqual([]);
    });

    it('should identify positions significantly different from population', () => {
      const votes = [
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'yes', proposal: { type: 'treasury' } }
      ];
      const populationStats = {
        treasury: { yes: 10, no: 90, total: 100 }
      };

      const signatures = identifySignaturePositions(votes, populationStats);
      expect(signatures.length).toBeGreaterThan(0);
      expect(signatures[0].isSignature).toBe(true);
      expect(signatures[0].stance).toBe('more_supportive');
    });

    it('should not identify positions close to population average', () => {
      const votes = [
        { vote: 'yes', proposal: { type: 'treasury' } },
        { vote: 'no', proposal: { type: 'treasury' } }
      ];
      const populationStats = {
        treasury: { yes: 50, no: 50, total: 100 }
      };

      const signatures = identifySignaturePositions(votes, populationStats);
      expect(signatures.length).toBe(0);
    });
  });

  describe('generateContactStrategy', () => {
    it('should recommend high-value target for good metrics', () => {
      const analytics = {
        volatilityByType: { treasury: 0.8, committee: 0.6 },
        signaturePositions: [],
        participation: 0.9,
        abstainRate: 0.1,
        lateVoterRate: 0.2,
        predictability: 0.5,
        persuasionScore: 80
      };

      const strategy = generateContactStrategy(analytics);
      expect(strategy.bestApproach).toContain('High-value');
      expect(strategy.topIssues.length).toBeGreaterThan(0);
      expect(strategy.riskFlags.length).toBe(0);
    });

    it('should identify risk flags for problematic behavior', () => {
      const analytics = {
        volatilityByType: {},
        signaturePositions: [],
        participation: 0.3,
        abstainRate: 0.5,
        lateVoterRate: 0.6,
        predictability: 0.1,
        persuasionScore: 20
      };

      const strategy = generateContactStrategy(analytics);
      expect(strategy.riskFlags.length).toBeGreaterThan(2);
      expect(strategy.bestApproach).toContain('Low priority');
    });

    it('should recommend appropriate messaging style', () => {
      const analytics1 = {
        volatilityByType: {},
        participation: 0.8,
        abstainRate: 0.1,
        lateVoterRate: 0.2,
        predictability: 0.8,
        persuasionScore: 50
      };

      const strategy1 = generateContactStrategy(analytics1);
      expect(strategy1.messagingStyle).toContain('Values-based');

      const analytics2 = { ...analytics1, predictability: 0.2 };
      const strategy2 = generateContactStrategy(analytics2);
      expect(strategy2.messagingStyle).toContain('Coalition-building');
    });
  });

  describe('detectBlocs', () => {
    it('should return empty for insufficient DReps', () => {
      expect(detectBlocs([])).toEqual([]);
    });

    it('should group similar DReps into blocs', () => {
      const dreps = [
        {
          voterId: 'drep1',
          votes: [
            { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
            { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'yes' }
          ]
        },
        {
          voterId: 'drep2',
          votes: [
            { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' },
            { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'yes' }
          ]
        },
        {
          voterId: 'drep3',
          votes: [
            { proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'no' },
            { proposalTxHash: 'tx2', proposalCertIndex: 0, vote: 'no' }
          ]
        }
      ];

      const blocs = detectBlocs(dreps, 0.7);
      expect(blocs.length).toBeGreaterThanOrEqual(1);
      expect(blocs.length).toBeLessThanOrEqual(2);
    });
  });

  describe('computeBridgeScore', () => {
    it('should return 0 for no cross-bloc alignment', () => {
      const votes = [{ voterId: 'drep1', proposalTxHash: 'tx1', proposalCertIndex: 0, vote: 'yes' }];
      const blocMemberships = { drep1: 'bloc1' };
      const allDReps = [{ voterId: 'drep1', votes }];

      const score = computeBridgeScore(votes, blocMemberships, allDReps);
      expect(score).toBe(0);
    });
  });

  describe('computeTimeSeries', () => {
    it('should return empty for insufficient votes', () => {
      const votes = [{ vote: 'yes', blockTime: '2024-01-01T00:00:00Z' }];
      expect(computeTimeSeries(votes, 10)).toEqual([]);
    });

    it('should compute rolling windows correctly', () => {
      const votes = Array(15).fill(null).map((_, i) => ({
        vote: i < 7 ? 'yes' : 'no',
        blockTime: new Date(2024, 0, i + 1).toISOString()
      }));

      const series = computeTimeSeries(votes, 5);
      expect(series.length).toBeGreaterThan(0);
      expect(series[0]).toHaveProperty('yesRate');
      expect(series[0]).toHaveProperty('timestamp');
    });
  });

  describe('exportLobbyingBrief', () => {
    it('should generate valid markdown brief', () => {
      const votes = [
        { vote: 'yes', proposal: { type: 'treasury' }, blockTime: '2024-01-01T00:00:00Z' }
      ];
      const analytics = {
        persuasionScore: 75,
        participation: 0.8,
        predictability: 0.6,
        contactStrategy: {
          bestApproach: 'High-value target',
          messagingStyle: 'Values-based',
          topIssues: [{ type: 'treasury', volatility: 0.5 }],
          riskFlags: []
        }
      };

      const brief = exportLobbyingBrief(votes, 'TestDRep', analytics);
      expect(brief).toContain('# Lobbying Brief: TestDRep');
      expect(brief).toContain('Persuasion Score');
      expect(brief).toContain('Contact Strategy');
      expect(brief).toContain('High-value target');
    });
  });
});

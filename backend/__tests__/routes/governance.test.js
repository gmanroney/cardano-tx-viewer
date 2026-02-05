const request = require('supertest');
const express = require('express');
const governanceRouter = require('../../routes/governance');

// Mock the governance service
jest.mock('../../services/governanceService');
const governanceService = require('../../services/governanceService');

const app = express();
app.use(express.json());
app.use('/api/governance', governanceRouter);

describe('Governance Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/governance/proposals', () => {
    it('should return governance proposals successfully', async () => {
      const mockData = {
        currentEpoch: 611,
        proposals: [
          { txHash: 'abc123', status: 'Active' }
        ],
        totalProposals: 1
      };

      governanceService.getGovernanceActions.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/governance/proposals')
        .expect(200);

      expect(response.body).toEqual(mockData);
      expect(response.body.totalProposals).toBe(1);
    });

    it('should handle errors with 500 status', async () => {
      governanceService.getGovernanceActions.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/governance/proposals')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/governance/proposals/:txHash/:certIndex', () => {
    it('should return proposal details successfully', async () => {
      const mockDetails = {
        txHash: 'abc123',
        certIndex: 0,
        votes: [{ voter: 'drep1', vote: 'yes' }],
        metadata: { url: 'https://example.com' },
        voteCount: { yes: 1, no: 0, abstain: 0, total: 1 }
      };

      governanceService.getProposalDetails.mockResolvedValue(mockDetails);

      const response = await request(app)
        .get('/api/governance/proposals/abc123/0')
        .expect(200);

      expect(response.body).toEqual(mockDetails);
      expect(response.body.votes).toBeDefined();
      expect(response.body.metadata).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      governanceService.getProposalDetails.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .get('/api/governance/proposals/invalid/0')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/governance/proposals/:txHash/:certIndex/votes', () => {
    it('should return proposal votes', async () => {
      const mockVotes = [
        { voter: 'drep1', vote: 'yes' },
        { voter: 'drep2', vote: 'no' }
      ];

      governanceService.getProposalVotes.mockResolvedValue(mockVotes);

      const response = await request(app)
        .get('/api/governance/proposals/abc123/0/votes')
        .expect(200);

      expect(response.body.votes).toEqual(mockVotes);
      expect(response.body.votes.length).toBe(2);
    });
  });
});

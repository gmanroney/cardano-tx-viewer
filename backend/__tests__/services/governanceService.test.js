const governanceService = require('../../services/governanceService');

// Mock the blockfrost service
jest.mock('../../services/blockfrostService', () => ({
  api: {
    epochsLatest: jest.fn(),
    governance: {
      proposals: jest.fn(),
      proposal: jest.fn(),
      proposalVotes: jest.fn(),
      proposalMetadata: jest.fn()
    }
  }
}));

// Mock the GovernanceProposal model
jest.mock('../../models/GovernanceProposal', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
  create: jest.fn()
}));

const blockfrostService = require('../../services/blockfrostService');
const GovernanceProposal = require('../../models/GovernanceProposal');

describe('GovernanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGovernanceActions', () => {
    it('should fetch governance actions successfully', async () => {
      const mockEpoch = { epoch: 611 };
      const mockProposals = [
        {
          id: 'gov_action1',
          tx_hash: 'abc123',
          cert_index: 0,
          governance_type: 'treasury_withdrawals'
        }
      ];

      blockfrostService.api.epochsLatest.mockResolvedValue(mockEpoch);
      blockfrostService.api.governance.proposals.mockResolvedValue(mockProposals);
      blockfrostService.api.governance.proposal.mockResolvedValue({
        deposit: '100000000000',
        return_address: 'stake1...',
        enacted_epoch: null,
        expired_epoch: null,
        dropped_epoch: null
      });

      GovernanceProposal.findOne.mockResolvedValue(null);
      GovernanceProposal.create.mockResolvedValue({});

      const result = await governanceService.getGovernanceActions();

      expect(result).toHaveProperty('currentEpoch', 611);
      expect(result).toHaveProperty('proposals');
      expect(result).toHaveProperty('totalProposals');
      expect(result.proposals.length).toBeGreaterThan(0);
      expect(blockfrostService.api.epochsLatest).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      blockfrostService.api.epochsLatest.mockRejectedValue(new Error('API Error'));

      const result = await governanceService.getGovernanceActions();

      expect(result).toHaveProperty('error');
      expect(result.currentEpoch).toBe(0);
      expect(result.proposals).toEqual([]);
    });

    it('should save proposals to MongoDB', async () => {
      const mockEpoch = { epoch: 611 };
      const mockProposals = [{
        id: 'gov_action1',
        tx_hash: 'abc123',
        cert_index: 0,
        governance_type: 'info_action'
      }];

      blockfrostService.api.epochsLatest.mockResolvedValue(mockEpoch);
      blockfrostService.api.governance.proposals.mockResolvedValue(mockProposals);
      blockfrostService.api.governance.proposal.mockResolvedValue({
        deposit: '100000000000',
        enacted_epoch: null,
        expired_epoch: null,
        dropped_epoch: null
      });

      GovernanceProposal.findOne.mockResolvedValue(null);
      GovernanceProposal.create.mockResolvedValue({});

      await governanceService.getGovernanceActions();

      expect(GovernanceProposal.create).toHaveBeenCalled();
    });
  });

  describe('getProposalVotes', () => {
    it('should fetch proposal votes successfully', async () => {
      const mockVotes = [
        { voter: 'drep1...', vote: 'yes' },
        { voter: 'drep2...', vote: 'no' }
      ];

      blockfrostService.api.governance.proposalVotes.mockResolvedValue(mockVotes);

      const result = await governanceService.getProposalVotes('abc123', 0);

      expect(result).toEqual(mockVotes);
      expect(result.length).toBe(2);
    });

    it('should return empty array on error', async () => {
      blockfrostService.api.governance.proposalVotes.mockRejectedValue(new Error('API Error'));

      const result = await governanceService.getProposalVotes('abc123', 0);

      expect(result).toEqual([]);
    });
  });

  describe('getProposalMetadata', () => {
    it('should fetch proposal metadata successfully', async () => {
      const mockMetadata = {
        url: 'https://example.com/metadata.json',
        hash: 'abc123',
        json_metadata: {
          body: {
            title: 'Test Proposal',
            abstract: 'Test abstract'
          }
        }
      };

      blockfrostService.api.governance.proposalMetadata.mockResolvedValue(mockMetadata);

      const result = await governanceService.getProposalMetadata('abc123', 0);

      expect(result).toEqual(mockMetadata);
      expect(result.json_metadata.body.title).toBe('Test Proposal');
    });

    it('should return null on error', async () => {
      blockfrostService.api.governance.proposalMetadata.mockRejectedValue(new Error('API Error'));

      const result = await governanceService.getProposalMetadata('abc123', 0);

      expect(result).toBeNull();
    });
  });

  describe('getProposalDetails', () => {
    it('should fetch complete proposal details with votes and metadata', async () => {
      const mockProposal = {
        id: 'gov_action1',
        tx_hash: 'abc123',
        deposit: '100000000000'
      };

      const mockVotes = [
        { voter: 'drep1', vote: 'yes' },
        { voter: 'drep2', vote: 'yes' },
        { voter: 'drep3', vote: 'no' }
      ];

      const mockMetadata = {
        url: 'https://example.com/metadata.json',
        json_metadata: { body: { title: 'Test' } }
      };

      blockfrostService.api.governance.proposal.mockResolvedValue(mockProposal);
      blockfrostService.api.governance.proposalVotes.mockResolvedValue(mockVotes);
      blockfrostService.api.governance.proposalMetadata.mockResolvedValue(mockMetadata);

      const result = await governanceService.getProposalDetails('abc123', 0);

      expect(result).toHaveProperty('votes');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('voteCount');
      expect(result.voteCount.yes).toBe(2);
      expect(result.voteCount.no).toBe(1);
      expect(result.voteCount.total).toBe(3);
    });
  });
});

const mongoose = require('mongoose');
const GovernanceProposal = require('../../models/GovernanceProposal');

describe('GovernanceProposal Model', () => {
  it('should create a valid governance proposal', () => {
    const validProposal = {
      txHash: 'abc123',
      certIndex: 0,
      proposalId: 'gov_action1',
      type: 'treasury_withdrawals',
      status: 'Active',
      deposit: '100000000000'
    };

    const proposal = new GovernanceProposal(validProposal);
    const validationError = proposal.validateSync();

    expect(validationError).toBeUndefined();
    expect(proposal.txHash).toBe('abc123');
    expect(proposal.certIndex).toBe(0);
  });

  it('should require txHash field', () => {
    const invalidProposal = {
      certIndex: 0,
      proposalId: 'gov_action1'
    };

    const proposal = new GovernanceProposal(invalidProposal);
    const validationError = proposal.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError.errors.txHash).toBeDefined();
  });

  it('should require certIndex field', () => {
    const invalidProposal = {
      txHash: 'abc123',
      proposalId: 'gov_action1'
    };

    const proposal = new GovernanceProposal(invalidProposal);
    const validationError = proposal.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError.errors.certIndex).toBeDefined();
  });

  it('should require proposalId field', () => {
    const invalidProposal = {
      txHash: 'abc123',
      certIndex: 0
    };

    const proposal = new GovernanceProposal(invalidProposal);
    const validationError = proposal.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError.errors.proposalId).toBeDefined();
  });
});

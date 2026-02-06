const mongoose = require('mongoose');

const governanceVoteSchema = new mongoose.Schema({
  proposalId: {
    type: String,
    required: true,
    index: true
  },
  proposalTxHash: {
    type: String,
    required: true,
    index: true
  },
  proposalCertIndex: {
    type: Number,
    required: true
  },
  voteTxHash: {
    type: String,
    required: true,
    index: true
  },
  voter: {
    type: String,
    required: true,
    index: true
  },
  voterRole: String,
  vote: {
    type: String,
    enum: ['yes', 'no', 'abstain'],
    required: true
  },
  // Enriched voter information
  voterName: String,
  voterGivenName: String,
  voterType: String,
  voterTicker: String,
  voterDescription: String,
  // Voting details
  votingPower: String, // in lovelaces
  epoch: Number,
  blockHeight: Number,
  blockTime: Date,
  // Metadata
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for unique votes
governanceVoteSchema.index({ proposalTxHash: 1, proposalCertIndex: 1, voter: 1 }, { unique: true });

// Index for querying votes by proposal
governanceVoteSchema.index({ proposalId: 1, vote: 1 });

// PERFORMANCE: Compound index for voter queries (optimizes GET /dreps/:voterId/votes)
governanceVoteSchema.index({ voter: 1, blockTime: -1 });

// PERFORMANCE: Compound index for proposal lookups (optimizes batch fetching)
governanceVoteSchema.index({ proposalTxHash: 1, proposalCertIndex: 1 });

module.exports = mongoose.model('GovernanceVote', governanceVoteSchema);

const mongoose = require('mongoose');

const governanceProposalSchema = new mongoose.Schema({
  txHash: {
    type: String,
    required: true,
    index: true
  },
  certIndex: {
    type: Number,
    required: true
  },
  proposalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: String,
  status: String,
  anchorUrl: String,
  anchorHash: String,
  deposit: String,
  returnAddress: String,
  expiresAt: Number,
  enactedEpoch: Number,
  expiredEpoch: Number,
  droppedEpoch: Number,
  votingAnchor: String,
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

// Compound index for txHash and certIndex
governanceProposalSchema.index({ txHash: 1, certIndex: 1 });

module.exports = mongoose.model('GovernanceProposal', governanceProposalSchema);

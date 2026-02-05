const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  block: {
    type: String,
    required: true
  },
  blockHeight: {
    type: Number,
    required: true
  },
  slot: {
    type: Number,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  outputAmount: [{
    unit: String,
    quantity: String
  }],
  fees: {
    type: String,
    required: true
  },
  deposit: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  invalidBefore: String,
  invalidHereafter: String,
  utxoCount: {
    type: Number,
    required: true
  },
  withdrawalCount: {
    type: Number,
    required: true
  },
  mirCertCount: {
    type: Number,
    required: true
  },
  delegationCount: {
    type: Number,
    required: true
  },
  stakeCertCount: {
    type: Number,
    required: true
  },
  poolUpdateCount: {
    type: Number,
    required: true
  },
  poolRetireCount: {
    type: Number,
    required: true
  },
  assetMintOrBurnCount: {
    type: Number,
    required: true
  },
  redeemerCount: {
    type: Number,
    required: true
  },
  validContract: {
    type: Boolean,
    required: true
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for sorting by block height (newest first)
transactionSchema.index({ blockHeight: -1, index: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);

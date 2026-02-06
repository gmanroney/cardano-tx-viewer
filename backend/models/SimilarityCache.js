const mongoose = require('mongoose');

const similarityCacheSchema = new mongoose.Schema({
  voterId: { type: String, required: true, index: true },
  similarDReps: [{
    voterId: String,
    similarity: Number,
    commonVotes: Number
  }],
  computedAt: { type: Date, default: Date.now, expires: 300 } // TTL: 5 minutes
});

similarityCacheSchema.index({ voterId: 1 }, { unique: true });
similarityCacheSchema.index({ computedAt: 1 });

module.exports = mongoose.model('SimilarityCache', similarityCacheSchema);

const mongoose = require('mongoose');

const votingBlocSchema = new mongoose.Schema({
  blocId: { type: String, required: true, unique: true },
  members: [{ type: String }], // Array of voterId
  size: { type: Number },
  cohesion: { type: Number }, // 0-1
  computedAt: { type: Date, default: Date.now, expires: 300 } // TTL: 5 minutes
});

votingBlocSchema.index({ computedAt: 1 });

module.exports = mongoose.model('VotingBloc', votingBlocSchema);

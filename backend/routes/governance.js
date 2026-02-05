const express = require('express');
const router = express.Router();
const governanceService = require('../services/governanceService');

// Get all governance proposals
router.get('/proposals', async (req, res) => {
  try {
    const data = await governanceService.getGovernanceActions();
    res.json(data);
  } catch (error) {
    console.error('Error in GET /governance/proposals:', error);
    res.status(500).json({ error: 'Failed to fetch governance proposals', message: error.message });
  }
});

// Get votes for a specific proposal
router.get('/proposals/:txHash/:certIndex/votes', async (req, res) => {
  try {
    const { txHash, certIndex } = req.params;
    const votes = await governanceService.getProposalVotes(txHash, parseInt(certIndex));
    res.json({ votes });
  } catch (error) {
    console.error('Error in GET /governance/proposals/:txHash/:certIndex/votes:', error);
    res.status(500).json({ error: 'Failed to fetch proposal votes', message: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const clusteringService = require('../services/clusteringService');
const similarityService = require('../services/similarityService');

// Compute voting blocs
router.post('/compute-blocs', async (req, res) => {
  try {
    const { threshold = 0.7 } = req.body;
    const blocs = await clusteringService.computeBlocs(threshold);
    res.json({ blocs, computedAt: new Date() });
  } catch (error) {
    console.error('Error computing blocs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get similar DReps
router.get('/similarity/:voterId', async (req, res) => {
  try {
    const { voterId } = req.params;
    const { limit = 10 } = req.query;
    const similar = await similarityService.findSimilar(voterId, parseInt(limit));
    res.json({ voterId, similar });
  } catch (error) {
    console.error('Error finding similar DReps:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get persuasion target rankings
router.get('/persuasion-targets', async (req, res) => {
  try {
    const { actionType, limit = 20 } = req.query;
    const targets = await similarityService.getPersuasionTargets(actionType, parseInt(limit));
    res.json({ targets });
  } catch (error) {
    console.error('Error getting persuasion targets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get population statistics
router.get('/population-stats', async (req, res) => {
  try {
    const stats = await similarityService.getPopulationStats();
    res.json({ stats });
  } catch (error) {
    console.error('Error getting population stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get proposal outcomes with margins
router.get('/outcomes', async (req, res) => {
  try {
    const outcomes = await clusteringService.getProposalOutcomes();
    res.json({ outcomes });
  } catch (error) {
    console.error('Error getting proposal outcomes:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

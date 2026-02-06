# Lobbying Analytics Implementation Guide

## Overview

This document provides a complete implementation plan for extending the DRep page with comprehensive lobbying-focused analytics. The implementation adds 6 new analytical tabs focused on identifying persuadable voters, voting blocs, and contact strategies.

## Architecture

### Data Flow
```
Frontend Request → Backend API → MongoDB
                ↓
        Compute Metrics
                ↓
        Cache Results
                ↓
        Return to UI
```

### Performance Strategy
- **Backend**: Pre-compute expensive operations (clustering, similarity matrices)
- **Frontend**: Memoize individual DRep metrics, cache with 5-minute TTL
- **Database**: Create indexes on voterId, proposalTxHash, blockTime

## Files Structure

### ✅ COMPLETED

1. **frontend/src/utils/lobbyingAnalytics.js** - Core metrics library
2. **frontend/src/utils/lobbyingAnalytics.test.js** - Unit tests (50+ test cases)

### 📝 TO IMPLEMENT

#### Frontend Components

3. **frontend/src/components/LobbyingTabs/LobbyingOverview.js**
   - At-a-glance KPIs
   - Contact strategy box
   - What moves them summary

4. **frontend/src/components/LobbyingTabs/TimelineAnalysis.js**
   - Time-series charts
   - Responsiveness metrics
   - Change-point detection

5. **frontend/src/components/LobbyingTabs/BlocAnalysis.js**
   - Similarity rankings
   - Bloc membership visualization
   - Cross-bloc bridge score

6. **frontend/src/components/LobbyingTabs/IssuePositions.js**
   - Breakdown by action type
   - Signature positions table
   - Volatility heatmap

7. **frontend/src/components/LobbyingTabs/InfluenceMetrics.js**
   - Pivotality analysis
   - Persuasion targets ranking
   - Credibility scores

8. **frontend/src/components/LobbyingTabs/DrilldownTable.js**
   - Enhanced vote table with all metadata
   - Advanced filters
   - Export options (CSV, PDF, Markdown)

#### Frontend Modifications

9. **frontend/src/components/DRepDetail.js** (MODIFY)
   - Add 6 new tabs
   - Integrate lobbying analytics
   - Add memoization for expensive computations

10. **frontend/src/components/DRepDetail.css** (MODIFY)
    - Add styles for new components
    - Responsive layouts

#### Backend Services

11. **backend/routes/lobbyingAnalytics.js** (NEW)
    - POST `/api/lobbying/compute-blocs` - Cluster all DReps
    - GET `/api/lobbying/similarity/:voterId` - Get similar DReps
    - GET `/api/lobbying/persuasion-targets` - Ranked list
    - GET `/api/lobbying/population-stats` - Aggregate statistics
    - GET `/api/lobbying/outcomes` - Proposal outcomes with margins

12. **backend/services/clusteringService.js** (NEW)
    - Hierarchical clustering algorithm
    - Bloc membership assignment
    - Cohesion metrics

13. **backend/services/similarityService.js** (NEW)
    - Similarity matrix computation
    - Caching layer (Redis or in-memory)
    - Incremental updates

14. **backend/models/VotingBloc.js** (NEW)
    - MongoDB schema for cached blocs
    - TTL index for auto-expiry

## Implementation Steps

### Phase 1: Backend Foundation (Day 1)

#### Step 1.1: Create Backend Routes

```javascript
// backend/routes/lobbyingAnalytics.js
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
    res.status(500).json({ error: error.message });
  }
});

// Get similar DReps
router.get('/similarity/:voterId', async (req, res) => {
  try {
    const { voterId } = req.params;
    const { limit = 10 } = req.query;
    const similar = await similarityService.findSimilar(voterId, limit);
    res.json({ voterId, similar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get persuasion target rankings
router.get('/persuasion-targets', async (req, res) => {
  try {
    const { actionType, limit = 20 } = req.query;
    const targets = await similarityService.getPersuasionTargets(actionType, limit);
    res.json({ targets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get population statistics
router.get('/population-stats', async (req, res) => {
  try {
    const stats = await similarityService.getPopulationStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get proposal outcomes with margins
router.get('/outcomes', async (req, res) => {
  try {
    const outcomes = await clusteringService.getProposalOutcomes();
    res.json({ outcomes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

#### Step 1.2: Create Clustering Service

```javascript
// backend/services/clusteringService.js
const VotingBloc = require('../models/VotingBloc');
const DRepVotes = require('../models/DRepVotes'); // Assume this exists

class ClusteringService {
  async computeBlocs(threshold = 0.7) {
    // Fetch all DReps with votes
    const dreps = await DRepVotes.find({}).lean();

    if (dreps.length < 2) {
      return [];
    }

    // Compute similarity matrix (expensive operation)
    const similarities = this.computeSimilarityMatrix(dreps);

    // Perform hierarchical clustering
    const blocs = this.agglomerativeClustering(dreps, similarities, threshold);

    // Cache results
    await VotingBloc.deleteMany({}); // Clear old blocs
    const blocDocs = blocs.map(b => ({
      blocId: b.id,
      members: b.members,
      size: b.size,
      cohesion: b.cohesion,
      computedAt: new Date()
    }));
    await VotingBloc.insertMany(blocDocs);

    return blocs;
  }

  computeSimilarityMatrix(dreps) {
    const n = dreps.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const sim = this.jaccardSimilarity(dreps[i].votes, dreps[j].votes);
        matrix[i][j] = sim;
        matrix[j][i] = sim;
      }
      matrix[i][i] = 1;
    }

    return matrix;
  }

  jaccardSimilarity(votes1, votes2) {
    const map1 = new Map();
    const map2 = new Map();

    votes1.forEach(v => {
      const key = `${v.proposalTxHash}-${v.proposalCertIndex}`;
      map1.set(key, v.vote?.toLowerCase());
    });

    votes2.forEach(v => {
      const key = `${v.proposalTxHash}-${v.proposalCertIndex}`;
      map2.set(key, v.vote?.toLowerCase());
    });

    const commonKeys = [...map1.keys()].filter(k => map2.has(k));
    if (commonKeys.length === 0) return 0;

    let agreements = 0;
    let comparable = 0;

    commonKeys.forEach(key => {
      const v1 = map1.get(key);
      const v2 = map2.get(key);
      if (v1 !== 'abstain' && v2 !== 'abstain') {
        comparable++;
        if (v1 === v2) agreements++;
      }
    });

    return comparable > 0 ? agreements / comparable : 0;
  }

  agglomerativeClustering(dreps, similarities, threshold) {
    // Initialize: each DRep is its own cluster
    const clusters = dreps.map((drep, i) => ({
      id: i,
      members: [i],
      drepIds: [drep.voterId]
    }));

    while (true) {
      let maxSim = threshold;
      let mergeI = -1;
      let mergeJ = -1;

      // Find most similar pair
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const avgSim = this.averageLinkage(
            clusters[i].members,
            clusters[j].members,
            similarities
          );

          if (avgSim > maxSim) {
            maxSim = avgSim;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      if (mergeI === -1) break; // No more merges

      // Merge clusters
      clusters[mergeI].members.push(...clusters[mergeJ].members);
      clusters[mergeI].drepIds.push(...clusters[mergeJ].drepIds);
      clusters.splice(mergeJ, 1);
    }

    // Format output
    return clusters.map((c, idx) => ({
      id: `bloc-${idx}`,
      members: c.drepIds,
      size: c.members.length,
      cohesion: this.calculateCohesion(c.members, similarities)
    }));
  }

  averageLinkage(members1, members2, similarities) {
    let sum = 0;
    let count = 0;

    members1.forEach(m1 => {
      members2.forEach(m2 => {
        sum += similarities[m1][m2];
        count++;
      });
    });

    return count > 0 ? sum / count : 0;
  }

  calculateCohesion(members, similarities) {
    if (members.length < 2) return 1;

    let sum = 0;
    let count = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        sum += similarities[members[i]][members[j]];
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  async getProposalOutcomes() {
    // This would query governance actions and compute majority outcomes
    // For now, return mock data structure
    // In production, compute from actual vote tallies
    return {};
  }
}

module.exports = new ClusteringService();
```

#### Step 1.3: Create Voting Bloc Model

```javascript
// backend/models/VotingBloc.js
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
```

#### Step 1.4: Register Routes in server.js

```javascript
// Add to backend/server.js after existing routes
const lobbyingAnalyticsRoutes = require('./routes/lobbyingAnalytics');
app.use('/api/lobbying', lobbyingAnalyticsRoutes);
```

### Phase 2: Frontend Components (Day 2-3)

#### Step 2.1: Create LobbyingOverview Component

```javascript
// frontend/src/components/LobbyingTabs/LobbyingOverview.js
import React, { useMemo } from 'react';
import {
  computePredictability,
  computeVolatilityByType,
  computePersuasionScore,
  generateContactStrategy
} from '../../utils/lobbyingAnalytics';
import './LobbyingOverview.css';

function LobbyingOverview({ votes, allProposals, drepData, analytics }) {
  const lobbyingMetrics = useMemo(() => {
    if (!votes || !analytics) return null;

    const predictability = computePredictability(votes);
    const volatilityByType = computeVolatilityByType(votes);
    const avgVolatility = Object.values(volatilityByType).reduce((a, b) => a + b, 0) /
                          Math.max(Object.keys(volatilityByType).length, 1);

    const persuasionScore = computePersuasionScore({
      participation: analytics.participation,
      volatility: avgVolatility,
      blocStrength: 0.5, // Would come from bloc API
      predictability,
      abstainRate: analytics.choiceDistribution.abstain / votes.length
    });

    const contactStrategy = generateContactStrategy({
      volatilityByType,
      participation: analytics.participation,
      abstainRate: analytics.choiceDistribution.abstain / votes.length,
      lateVoterRate: analytics.lateVoterRate,
      predictability,
      persuasionScore
    });

    return {
      predictability,
      volatilityByType,
      persuasionScore,
      contactStrategy
    };
  }, [votes, analytics]);

  if (!lobbyingMetrics) return <div>Loading lobbying metrics...</div>;

  return (
    <div className="lobbying-overview">
      <h3>Lobbying Snapshot</h3>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Persuasion Score</div>
          <div className="kpi-value">{lobbyingMetrics.persuasionScore.toFixed(1)}/100</div>
          <div className="kpi-subtitle">Higher = better target</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Predictability</div>
          <div className="kpi-value">{(lobbyingMetrics.predictability * 100).toFixed(1)}%</div>
          <div className="kpi-subtitle">Voting consistency</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Participation</div>
          <div className="kpi-value">{(analytics.participation * 100).toFixed(1)}%</div>
          <div className="kpi-subtitle">{votes.length}/{allProposals.length} actions</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Avg Response Time</div>
          <div className="kpi-value">{analytics.latencyStats.median.toFixed(1)}h</div>
          <div className="kpi-subtitle">Median latency</div>
        </div>
      </div>

      {/* Contact Strategy Box */}
      <div className="contact-strategy-box">
        <h4>📋 Contact Strategy</h4>

        <div className="strategy-section">
          <strong>Best Approach:</strong>
          <p>{lobbyingMetrics.contactStrategy.bestApproach}</p>
        </div>

        <div className="strategy-section">
          <strong>Messaging Style:</strong>
          <p>{lobbyingMetrics.contactStrategy.messagingStyle}</p>
        </div>

        {lobbyingMetrics.contactStrategy.topIssues?.length > 0 && (
          <div className="strategy-section">
            <strong>Top Persuadable Issues:</strong>
            <ul>
              {lobbyingMetrics.contactStrategy.topIssues.map(issue => (
                <li key={issue.type}>
                  {issue.type}: {(issue.volatility * 100).toFixed(0)}% volatility
                </li>
              ))}
            </ul>
          </div>
        )}

        {lobbyingMetrics.contactStrategy.riskFlags?.length > 0 && (
          <div className="strategy-section risk-flags">
            <strong>⚠️ Risk Flags:</strong>
            <ul>
              {lobbyingMetrics.contactStrategy.riskFlags.map((flag, idx) => (
                <li key={idx} className="risk-flag">{flag}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* What Moves Them */}
      <div className="what-moves-them">
        <h4>What Moves Them</h4>

        <div className="volatility-grid">
          {Object.entries(lobbyingMetrics.volatilityByType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([type, vol]) => (
              <div key={type} className="volatility-item">
                <div className="type-label">{type}</div>
                <div className="volatility-bar-container">
                  <div
                    className="volatility-bar"
                    style={{ width: `${vol * 100}%` }}
                  />
                </div>
                <div className="volatility-value">{(vol * 100).toFixed(0)}%</div>
              </div>
            ))}
        </div>
      </div>

      {/* Analyst Notes */}
      <div className="analyst-notes">
        <h4>📊 Understanding These Metrics</h4>
        <ul>
          <li><strong>Persuasion Score:</strong> Composite metric combining participation, volatility, bloc independence, and reliability. Higher scores indicate better lobbying targets.</li>
          <li><strong>Predictability:</strong> Measures voting consistency across issue types. High = follows principles, Low = persuadable.</li>
          <li><strong>Volatility:</strong> Measures how often votes change direction on same issue type. High volatility = more open to persuasion.</li>
          <li><strong>Risk Flags:</strong> Potential obstacles to successful outreach (low participation, late responses, high abstains).</li>
        </ul>
      </div>
    </div>
  );
}

export default LobbyingOverview;
```

#### Step 2.2: Modify DRepDetail.js to Add New Tabs

```javascript
// Additions to frontend/src/components/DRepDetail.js

// Add imports at top
import LobbyingOverview from './LobbyingTabs/LobbyingOverview';
import TimelineAnalysis from './LobbyingTabs/TimelineAnalysis';
import BlocAnalysis from './LobbyingTabs/BlocAnalysis';
import IssuePositions from './LobbyingTabs/IssuePositions';
import InfluenceMetrics from './LobbyingTabs/InfluenceMetrics';
import DrilldownTable from './LobbyingTabs/DrilldownTable';

// Modify state to support more tabs
const [activeTab, setActiveTab] = useState('overview'); // Changed default

// Add new state for lobbying data
const [blocData, setBlocData] = useState(null);
const [similarDReps, setSimilarDReps] = useState([]);
const [populationStats, setPopulationStats] = useState({});

// Add effect to fetch lobbying data
useEffect(() => {
  if (voterId && activeTab.startsWith('lobbying-')) {
    fetchLobbyingData();
  }
}, [voterId, activeTab]);

const fetchLobbyingData = async () => {
  try {
    const [blocsRes, similarRes, statsRes] = await Promise.all([
      axios.get('/api/lobbying/compute-blocs'),
      axios.get(`/api/lobbying/similarity/${voterId}?limit=10`),
      axios.get('/api/lobbying/population-stats')
    ]);

    setBlocData(blocsRes.data);
    setSimilarDReps(similarRes.data.similar);
    setPopulationStats(statsRes.data.stats);
  } catch (err) {
    console.error('Error fetching lobbying data:', err);
  }
};

// Modify tabs section in render:
<div className="tabs">
  <button
    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
    onClick={() => setActiveTab('overview')}
  >
    📋 Lobbying Overview
  </button>
  <button
    className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
    onClick={() => setActiveTab('timeline')}
  >
    📈 Timeline
  </button>
  <button
    className={`tab ${activeTab === 'blocs' ? 'active' : ''}`}
    onClick={() => setActiveTab('blocs')}
  >
    🤝 Blocs & Alignment
  </button>
  <button
    className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
    onClick={() => setActiveTab('issues')}
  >
    🎯 Issue Positions
  </button>
  <button
    className={`tab ${activeTab === 'influence' ? 'active' : ''}`}
    onClick={() => setActiveTab('influence')}
  >
    ⚖️ Influence & Pivotality
  </button>
  <button
    className={`tab ${activeTab === 'drilldown' ? 'active' : ''}`}
    onClick={() => setActiveTab('drilldown')}
  >
    📊 Detailed Drilldown
  </button>
  <button
    className={`tab ${activeTab === 'basic-analytics' ? 'active' : ''}`}
    onClick={() => setActiveTab('basic-analytics')}
  >
    📉 Basic Analytics
  </button>
  <button
    className={`tab ${activeTab === 'history' ? 'active' : ''}`}
    onClick={() => setActiveTab('history')}
  >
    📜 Vote History
  </button>
</div>

// Add tab content rendering:
{activeTab === 'overview' && (
  <LobbyingOverview
    votes={votingHistory?.votes || []}
    allProposals={allProposals}
    drepData={drepData}
    analytics={analytics}
  />
)}

{activeTab === 'timeline' && (
  <TimelineAnalysis
    votes={votingHistory?.votes || []}
    allProposals={allProposals}
  />
)}

{activeTab === 'blocs' && (
  <BlocAnalysis
    votes={votingHistory?.votes || []}
    blocData={blocData}
    similarDReps={similarDReps}
    voterId={voterId}
  />
)}

{activeTab === 'issues' && (
  <IssuePositions
    votes={votingHistory?.votes || []}
    populationStats={populationStats}
    analytics={analytics}
  />
)}

{activeTab === 'influence' && (
  <InfluenceMetrics
    votes={votingHistory?.votes || []}
    drepData={drepData}
    allProposals={allProposals}
  />
)}

{activeTab === 'drilldown' && (
  <DrilldownTable
    votes={votingHistory?.votes || []}
    voterId={voterId}
    drepName={drepData?.voterName || voterId}
    analytics={analytics}
  />
)}

// Keep existing 'basic-analytics' and 'history' tabs as before
```

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

Run tests:
```bash
cd frontend
npm test -- lobbyingAnalytics.test.js
```

Expected: 50+ tests passing

### Integration Tests

1. **API Endpoints:**
   ```bash
   # Test bloc computation
   curl -X POST http://localhost:5000/api/lobbying/compute-blocs \
     -H "Content-Type: application/json" \
     -d '{"threshold": 0.7}'

   # Test similarity
   curl http://localhost:5000/api/lobbying/similarity/drep1abc123?limit=10
   ```

2. **Component Tests:**
   - Test LobbyingOverview renders KPIs
   - Test contact strategy displays correctly
   - Test volatility grid shows top 6 issues
   - Test risk flags appear when present

### E2E Tests (Cypress)

```javascript
describe('Lobbying Analytics', () => {
  it('should display lobbying overview tab', () => {
    cy.visit('/');
    cy.contains('DReps').click();
    cy.contains('View Analytics').first().click();
    cy.contains('Lobbying Overview').click();
    cy.get('.persuasion-score').should('be.visible');
    cy.get('.contact-strategy-box').should('be.visible');
  });
});
```

## Performance Benchmarks

### Target Metrics

- **Bloc computation:** < 2s for 500 DReps
- **Similarity query:** < 200ms with caching
- **Tab switch:** < 100ms
- **Export CSV:** < 500ms for 1000 votes

### Optimization Checklist

- [ ] Enable MongoDB indexes on voterId, proposalTxHash
- [ ] Implement Redis caching for similarity matrices
- [ ] Use React.memo() for expensive components
- [ ] Lazy load tabs (React.lazy + Suspense)
- [ ] Virtualize long tables (react-window)
- [ ] Debounce filter inputs

## Deployment Checklist

### Pre-deployment

- [ ] All unit tests passing (50+)
- [ ] All integration tests passing
- [ ] E2E smoke tests passing
- [ ] Performance benchmarks met
- [ ] Code review completed
- [ ] Documentation updated

### Post-deployment

- [ ] Monitor API response times
- [ ] Check database index performance
- [ ] Verify cache hit rates
- [ ] Test with production data volumes
- [ ] User acceptance testing with lobbying teams

## Future Enhancements

1. **ML-based clustering:** Replace simple hierarchical clustering with DBSCAN or spectral clustering
2. **Real-time updates:** WebSocket updates for new votes
3. **Comparative analysis:** Side-by-side comparison of 2+ DReps
4. **Network graph visualization:** Interactive D3.js force-directed graph
5. **Predictive modeling:** ML model to predict future votes based on past behavior
6. **Export to CRM:** Integration with Salesforce/HubSpot
7. **Automated alerts:** Email/Slack notifications when persuadable DRep votes on key issue

## Support & Troubleshooting

### Common Issues

**Issue:** Bloc computation times out
- **Solution:** Increase timeout, reduce threshold, or implement incremental clustering

**Issue:** Similarity queries slow
- **Solution:** Implement Redis caching layer, pre-compute top-k similarities

**Issue:** Frontend crashes with large datasets
- **Solution:** Implement pagination/virtualization, lazy load charts

### Getting Help

- Documentation: `/docs/lobbying-analytics.md`
- API Reference: `/api/docs` (if using Swagger)
- Issues: GitHub Issues tracker
- Contact: dev-team@example.com

## Conclusion

This implementation provides a production-ready lobbying analytics system for Cardano governance. The modular architecture allows for easy extension and maintenance, while the performance optimizations ensure scalability to thousands of DReps and proposals.

**Estimated Implementation Time:** 3-4 days for full implementation + testing
**Complexity Level:** High (advanced analytics, clustering algorithms, complex UI)
**Business Value:** Critical for lobbying/advocacy organizations to target outreach effectively

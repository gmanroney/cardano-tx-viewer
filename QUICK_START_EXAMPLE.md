# Quick Start: Using Lobbying Analytics RIGHT NOW

The core analytics library is **complete and tested** (34/34 tests passing). You can start using these functions in your existing DRep page immediately, even before implementing the full UI.

## ✅ What Works Right Now (No Additional Code Needed)

You can import and use these functions anywhere in your frontend:

```javascript
import {
  computePredictability,
  computeVolatilityByType,
  computePersuasionScore,
  generateContactStrategy,
  computeSimilarity,
  identifySignaturePositions
} from './utils/lobbyingAnalytics';
```

## Example 1: Add Persuasion Score to Existing DRepDetail

**File:** `frontend/src/components/DRepDetail.js`

### Quick Integration (5 minutes)

Add this to your existing analytics computation (around line 70):

```javascript
// EXISTING CODE:
const analytics = useMemo(() => {
  if (!votingHistory || !allProposals) return null;

  const votes = votingHistory.votes || [];
  const participation = computeParticipation(votes, allProposals);
  const choiceDistribution = computeChoiceDistribution(votes, weightMode);
  // ... existing metrics ...

  // ⭐ ADD THIS - NEW LOBBYING METRICS:
  const predictability = computePredictability(votes);
  const volatilityByType = computeVolatilityByType(votes);
  const avgVolatility = Object.values(volatilityByType).reduce((a, b) => a + b, 0) /
                        Math.max(Object.keys(volatilityByType).length, 1);

  const persuasionScore = computePersuasionScore({
    participation,
    volatility: avgVolatility,
    blocStrength: 0.5, // Default until we have bloc API
    predictability,
    abstainRate: choiceDistribution.abstain / Math.max(votes.length, 1)
  });

  const contactStrategy = generateContactStrategy({
    volatilityByType,
    participation,
    abstainRate: choiceDistribution.abstain / Math.max(votes.length, 1),
    lateVoterRate,
    predictability,
    persuasionScore
  });

  return {
    participation,
    participationByType,
    choiceDistribution,
    latencyStats,
    lateVoterRate,
    entropy,
    rollingStats,
    alignment,
    // ⭐ NEW:
    predictability,
    persuasionScore,
    contactStrategy,
    volatilityByType
  };
}, [votingHistory, allProposals, weightMode]);
```

### Display in UI (Add to existing Analytics tab)

Add this JSX after your existing KPI cards (around line 200):

```jsx
{/* ⭐ NEW KPI CARDS */}
<div className="kpi-card">
  <div className="kpi-label">Persuasion Score</div>
  <div className="kpi-value">{analytics.persuasionScore?.toFixed(1) || 'N/A'}/100</div>
  <div className="kpi-subtitle">Lobbying target quality</div>
</div>

<div className="kpi-card">
  <div className="kpi-label">Predictability</div>
  <div className="kpi-value">{((analytics.predictability || 0) * 100).toFixed(1)}%</div>
  <div className="kpi-subtitle">Voting consistency</div>
</div>

{/* ⭐ CONTACT STRATEGY BOX */}
{analytics.contactStrategy && (
  <div style={{
    background: '#1e3a5f',
    padding: '1.5rem',
    borderRadius: '8px',
    marginTop: '2rem',
    border: '1px solid #3b9dff'
  }}>
    <h4 style={{ margin: '0 0 1rem 0', color: '#3b9dff' }}>
      📋 Contact Strategy
    </h4>

    <div style={{ marginBottom: '1rem' }}>
      <strong style={{ color: '#e0e6ed' }}>Best Approach:</strong>
      <p style={{ color: '#a0aec0', margin: '0.5rem 0' }}>
        {analytics.contactStrategy.bestApproach}
      </p>
    </div>

    <div style={{ marginBottom: '1rem' }}>
      <strong style={{ color: '#e0e6ed' }}>Messaging Style:</strong>
      <p style={{ color: '#a0aec0', margin: '0.5rem 0' }}>
        {analytics.contactStrategy.messagingStyle}
      </p>
    </div>

    {analytics.contactStrategy.topIssues?.length > 0 && (
      <div style={{ marginBottom: '1rem' }}>
        <strong style={{ color: '#e0e6ed' }}>Top Persuadable Issues:</strong>
        <ul style={{ color: '#a0aec0', margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          {analytics.contactStrategy.topIssues.map(issue => (
            <li key={issue.type}>
              {issue.type}: {(issue.volatility * 100).toFixed(0)}% volatility
            </li>
          ))}
        </ul>
      </div>
    )}

    {analytics.contactStrategy.riskFlags?.length > 0 && (
      <div>
        <strong style={{ color: '#ef4444' }}>⚠️ Risk Flags:</strong>
        <ul style={{ color: '#ef4444', margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          {analytics.contactStrategy.riskFlags.map((flag, idx) => (
            <li key={idx}>{flag}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}
```

**Result:** You'll immediately see persuasion scores and contact strategies in your existing DRep modal!

## Example 2: Add Export Lobbying Brief Button

Add this button to your Vote History tab (around line 300):

```jsx
<button
  className="export-btn"
  onClick={() => {
    const brief = exportLobbyingBrief(
      filteredVotes,
      drepData?.voterName || voterId,
      analytics
    );

    const blob = new Blob([brief], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lobbying-brief-${voterId}.md`;
    a.click();
    window.URL.revokeObjectURL(url);
  }}
  style={{ marginLeft: '1rem', background: '#8b5cf6' }}
>
  📄 Export Lobbying Brief
</button>
```

**Result:** One-click download of a lobbying brief in Markdown format!

## Example 3: Show Volatility Heatmap

Add this visualization to show which issues are most persuadable:

```jsx
{/* ⭐ ADD THIS AFTER YOUR CHARTS */}
{analytics.volatilityByType && Object.keys(analytics.volatilityByType).length > 0 && (
  <div className="chart-card full-width">
    <h3>🎯 Persuadability by Issue Type</h3>
    <div style={{ padding: '1rem' }}>
      {Object.entries(analytics.volatilityByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([type, volatility]) => (
          <div key={type} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.75rem',
            gap: '1rem'
          }}>
            <div style={{ width: '200px', color: '#e0e6ed' }}>
              {type}
            </div>
            <div style={{
              flex: 1,
              background: '#0f1419',
              height: '24px',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${volatility * 100}%`,
                height: '100%',
                background: volatility > 0.5 ? '#10b981' : volatility > 0.3 ? '#f59e0b' : '#6b7280',
                transition: 'width 0.3s'
              }} />
            </div>
            <div style={{ width: '60px', textAlign: 'right', color: '#a0aec0' }}>
              {(volatility * 100).toFixed(0)}%
            </div>
          </div>
        ))}
    </div>
    <div style={{ fontSize: '0.875rem', color: '#718096', padding: '0 1rem' }}>
      Higher volatility = more likely to change position = better lobbying target
    </div>
  </div>
)}
```

**Result:** Visual heatmap showing which issues the DRep is most persuadable on!

## Example 4: Compare Two DReps (Add to DReps List Page)

Want to compare two DReps? Add this to your `DReps.js` page:

```jsx
// Add state
const [compareDReps, setCompareDReps] = useState([]);
const [showComparison, setShowComparison] = useState(false);

// Add compare checkbox to each row
<td className="actions-cell">
  <input
    type="checkbox"
    checked={compareDReps.includes(drep.voterId)}
    onChange={(e) => {
      if (e.target.checked) {
        setCompareDReps([...compareDReps, drep.voterId].slice(0, 2));
      } else {
        setCompareDReps(compareDReps.filter(id => id !== drep.voterId));
      }
    }}
    disabled={compareDReps.length >= 2 && !compareDReps.includes(drep.voterId)}
  />
  <button
    className="view-history-btn"
    onClick={() => setSelectedDRep(drep.voterId)}
  >
    View Analytics
  </button>
</td>

// Add comparison button above table
{compareDReps.length === 2 && (
  <button
    onClick={async () => {
      // Fetch both DReps' votes
      const [drep1Res, drep2Res] = await Promise.all([
        axios.get(`/api/dreps/${compareDReps[0]}/votes`),
        axios.get(`/api/dreps/${compareDReps[1]}/votes`)
      ]);

      const similarity = computeSimilarity(
        drep1Res.data.votes,
        drep2Res.data.votes
      );

      alert(`Similarity: ${(similarity * 100).toFixed(1)}%\n\n` +
            `High similarity (>70%) means they vote alike.\n` +
            `Low similarity (<30%) means they're opposites.`);
    }}
    style={{
      background: '#3b9dff',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      marginBottom: '1rem'
    }}
  >
    Compare Selected DReps ({compareDReps.length}/2)
  </button>
)}
```

**Result:** Select two DReps and instantly see their voting similarity!

## Example 5: Identify Signature Positions

Add this to show where a DRep stands out from the crowd:

```jsx
{/* ⭐ ADD THIS TO ANALYTICS TAB */}
{analytics.signaturePositions?.length > 0 && (
  <div className="chart-card full-width">
    <h3>🎭 Signature Positions (Statistically Distinct Stances)</h3>
    <table style={{ width: '100%', marginTop: '1rem' }}>
      <thead>
        <tr>
          <th>Issue Type</th>
          <th>DRep Yes Rate</th>
          <th>Population Yes Rate</th>
          <th>Deviation</th>
          <th>Stance</th>
        </tr>
      </thead>
      <tbody>
        {analytics.signaturePositions.map(sig => (
          <tr key={sig.type}>
            <td>{sig.type}</td>
            <td>{(sig.drepYesRate * 100).toFixed(1)}%</td>
            <td>{(sig.popYesRate * 100).toFixed(1)}%</td>
            <td style={{
              color: sig.deviation > 0.5 ? '#ef4444' : '#f59e0b'
            }}>
              {(sig.deviation * 100).toFixed(1)}%
            </td>
            <td>
              <span style={{
                background: sig.stance === 'more_supportive' ? '#10b981' : '#ef4444',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem'
              }}>
                {sig.stance === 'more_supportive' ? 'More Supportive' : 'More Opposed'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ fontSize: '0.875rem', color: '#718096', padding: '1rem 0 0' }}>
      Signature positions show where this DRep differs significantly (&gt;30%) from average.
      These are their defining issues - good for understanding their values.
    </div>
  </div>
)}
```

**Note:** To use `identifySignaturePositions`, you'll need population statistics. Add this fetch:

```javascript
// In DRepDetail.js, add to fetchDRepData:
const [popStatsRes] = await Promise.all([
  // ... existing fetches ...
  axios.get('/api/lobbying/population-stats') // ⚠️ Needs backend implementation
]);
setPopulationStats(popStatsRes.data);

// Then compute in analytics:
const signaturePositions = identifySignaturePositions(votes, populationStats);
```

## Testing Your Integration

### 1. Run Unit Tests
```bash
cd frontend
npm test -- lobbyingAnalytics.test.js
```

Expected output: ✅ 34 tests passing

### 2. Test in Browser
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend && npm start

# Browser: http://localhost:3000
```

### 3. Verify Each Feature
- [ ] Open DReps page
- [ ] Click "View Analytics" on a DRep
- [ ] See new "Persuasion Score" KPI card
- [ ] See new "Predictability" KPI card
- [ ] See "Contact Strategy" box with recommendations
- [ ] See "Persuadability by Issue Type" heatmap
- [ ] Click "Export Lobbying Brief" button → downloads .md file
- [ ] Open the .md file → see formatted lobbying brief

### 4. Check Console
Open browser DevTools (F12) → Console tab

Expected: No errors, no warnings

If you see errors, they're likely:
- Missing population stats (needs backend endpoint)
- Missing proposal outcomes (needs backend endpoint)

These are expected until Phase 1 (backend services) is complete. The core metrics will still work!

## What Works Without Backend Implementation

✅ **These work immediately** (no backend needed):
- Persuasion score
- Predictability
- Volatility by type
- Contact strategy recommendations
- Export lobbying brief
- Similarity (if you manually fetch 2 DReps' votes)

⚠️ **These need backend** (Phase 1 implementation):
- Bloc detection and membership
- Similar DReps ranking (needs pre-computed similarities)
- Population statistics (for signature positions)
- Proposal outcomes (for swing score and pivotality)
- Persuasion targets leaderboard

## Troubleshooting

### "Analytics is undefined"
Make sure you added the new metrics to the `return` object in your `analytics` useMemo.

### "ContactStrategy is undefined"
Add `contactStrategy` to the analytics return object and pass it down to components.

### "VolatilityByType shows no data"
Check that votes have a `proposal` object with a `type` field. If missing, votes may not be enriched with proposal data.

### "Persuasion score always 0"
Check that all input metrics (participation, volatility, etc.) are being calculated correctly. Log them to console to debug.

## Next Steps

Once you've tested these quick integrations and confirmed they work:

1. **Proceed to Phase 1** (Backend Services) to enable:
   - Bloc detection
   - Similar DReps ranking
   - Population statistics
   - Persuasion targets leaderboard

2. **Proceed to Phase 2** (Frontend Components) to add:
   - 6 new dedicated tabs
   - Advanced visualizations
   - Network graphs
   - Enhanced filtering and exports

3. **Proceed to Phase 3** (Testing) to ensure:
   - 120+ component tests passing
   - E2E workflows verified
   - Performance benchmarks met

## Need Help?

- **Documentation:** See `LOBBYING_ANALYTICS_IMPLEMENTATION.md` for full technical guide
- **Summary:** See `LOBBYING_ANALYTICS_SUMMARY.md` for progress tracking
- **Tests:** Run `npm test -- lobbyingAnalytics.test.js` to verify core library
- **Issues:** Check browser console for errors, verify API endpoints are accessible

---

**Quick Win:** Implement Example 1 (5 minutes) to immediately add persuasion scores to your existing DRep page! 🚀

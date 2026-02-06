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

    const abstainCount = votes.filter(v => v.vote?.toLowerCase() === 'abstain').length;
    const abstainRate = votes.length > 0 ? abstainCount / votes.length : 0;

    const persuasionScore = computePersuasionScore({
      participation: analytics.participation,
      volatility: avgVolatility,
      blocStrength: 0.5, // Would come from bloc API
      predictability,
      abstainRate
    });

    const contactStrategy = generateContactStrategy({
      volatilityByType,
      participation: analytics.participation,
      abstainRate,
      lateVoterRate: analytics.lateVoterRate || 0,
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

  if (!lobbyingMetrics) return <div className="loading-message">Loading lobbying metrics...</div>;

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
          <div className="kpi-subtitle">{votes.length}/{allProposals?.length || 0} actions</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Avg Response Time</div>
          <div className="kpi-value">{analytics.latencyStats?.median?.toFixed(1) || 'N/A'}h</div>
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
        <p className="section-subtitle">Issue types where this DRep is most persuadable</p>

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
                    style={{
                      width: `${vol * 100}%`,
                      backgroundColor: vol > 0.5 ? '#10b981' : vol > 0.3 ? '#f59e0b' : '#6b7280'
                    }}
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

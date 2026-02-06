import React, { useMemo } from 'react';
import { computePivotality, computePersuasionScore } from '../../utils/lobbyingAnalytics';
import './InfluenceMetrics.css';

function InfluenceMetrics({ votes, drepData, allProposals, persuasionTargets, outcomes }) {
  const influenceData = useMemo(() => {
    if (!votes || votes.length === 0) return null;

    // Compute pivotality
    const drepPower = drepData?.votingPower ?
      parseFloat(drepData.votingPower) : 1000000; // Default 1M ADA

    const pivotalityResults = computePivotality(votes, outcomes || {}, drepPower);

    return {
      pivotality: pivotalityResults,
      drepPower
    };
  }, [votes, drepData, outcomes]);

  if (!influenceData) {
    return (
      <div className="influence-metrics">
        <div className="empty-state">
          <p>No voting data available for influence analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="influence-metrics">
      <h3>Influence & Pivotality</h3>

      {/* Pivotality Overview */}
      <div className="pivotality-overview">
        <h4>Pivotal Vote Analysis</h4>
        <p className="section-subtitle">
          Proposals where this DRep's vote could have changed the outcome
        </p>

        <div className="pivotality-stats">
          <div className="stat-card">
            <div className="stat-value">{influenceData.pivotality.pivotalVotes.length}</div>
            <div className="stat-label">Pivotal Votes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {(influenceData.pivotality.pivotalityRate * 100).toFixed(1)}%
            </div>
            <div className="stat-label">Pivotality Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {(influenceData.drepPower / 1_000_000).toFixed(1)}M
            </div>
            <div className="stat-label">Voting Power (ADA)</div>
          </div>
        </div>

        {influenceData.pivotality.pivotalVotes.length > 0 ? (
          <div className="pivotal-votes-table">
            <div className="table-header">
              <div className="col-proposal">Proposal</div>
              <div className="col-vote">DRep Vote</div>
              <div className="col-outcome">Outcome</div>
              <div className="col-margin">Margin</div>
            </div>

            {influenceData.pivotality.pivotalVotes.slice(0, 10).map((pv, idx) => (
              <div key={idx} className="table-row">
                <div className="col-proposal">
                  <span className="proposal-id">
                    {pv.proposalTxHash?.substring(0, 12) || 'Unknown'}...
                  </span>
                </div>
                <div className="col-vote">
                  <span className={`vote-badge ${pv.vote}`}>
                    {pv.vote}
                  </span>
                </div>
                <div className="col-outcome">
                  <span className="outcome-text">
                    {outcomes?.[`${pv.proposalTxHash}-${pv.proposalCertIndex}`]?.outcome || 'Unknown'}
                  </span>
                </div>
                <div className="col-margin">
                  <span className="margin-value">
                    {outcomes?.[`${pv.proposalTxHash}-${pv.proposalCertIndex}`]?.margin?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-pivotal-votes">
            <p>
              No pivotal votes detected. This DRep's voting power was not decisive in any close proposals.
              Pivotal votes are identified when the margin is within 2x this DRep's voting power.
            </p>
          </div>
        )}
      </div>

      {/* Persuasion Targets Leaderboard */}
      {persuasionTargets && persuasionTargets.length > 0 && (
        <div className="persuasion-targets-section">
          <h4>Global Persuasion Targets</h4>
          <p className="section-subtitle">
            Top DReps ranked by lobbying target quality (from all DReps)
          </p>

          <div className="targets-table">
            <div className="table-header">
              <div className="col-rank">Rank</div>
              <div className="col-drep">DRep</div>
              <div className="col-score">Score</div>
              <div className="col-participation">Participation</div>
              <div className="col-volatility">Volatility</div>
            </div>

            {persuasionTargets.slice(0, 15).map((target, idx) => (
              <div key={target.voterId} className="table-row">
                <div className="col-rank">
                  <span className={`rank-badge ${idx < 3 ? 'top-three' : ''}`}>
                    #{idx + 1}
                  </span>
                </div>
                <div className="col-drep">
                  <span className="drep-name">{target.voterName || target.voterId.substring(0, 12) + '...'}</span>
                </div>
                <div className="col-score">
                  <div className="score-bar-container">
                    <div
                      className="score-bar"
                      style={{
                        width: `${target.persuasionScore}%`,
                        backgroundColor: target.persuasionScore > 70 ? '#10b981' :
                                       target.persuasionScore > 40 ? '#f59e0b' : '#6b7280'
                      }}
                    />
                  </div>
                  <span className="score-value">{target.persuasionScore.toFixed(0)}</span>
                </div>
                <div className="col-participation">{(target.participation * 100).toFixed(0)}%</div>
                <div className="col-volatility">{(target.volatility * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="insights-box">
        <h4>⚖️ Understanding Influence Metrics</h4>
        <ul>
          <li>
            <strong>Pivotal votes:</strong> Proposals where this DRep's vote could have swung
            the outcome. High pivotality means this DRep has significant influence on close decisions.
            These are the most important votes for lobbying efforts.
          </li>
          <li>
            <strong>Pivotality rate:</strong> Percentage of all votes that were pivotal. Rates above
            20% indicate a DRep with substantial decision-making power on contested issues.
          </li>
          <li>
            <strong>Persuasion targets:</strong> Global ranking of all DReps by lobbying value.
            Scores above 70 are high-priority targets. Focus on DReps with high participation but
            moderate volatility - they're engaged but still persuadable.
          </li>
          <li>
            <strong>Strategy:</strong> For this DRep, review their pivotal votes to understand which
            issues they had decisive influence on. Use this to gauge their importance for future
            similar proposals.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default InfluenceMetrics;

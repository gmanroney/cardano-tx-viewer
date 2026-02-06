import React, { useMemo } from 'react';
import { computeVolatilityByType, identifySignaturePositions } from '../../utils/lobbyingAnalytics';
import './IssuePositions.css';

function IssuePositions({ votes, populationStats, analytics }) {
  const issueData = useMemo(() => {
    if (!votes || votes.length === 0) return null;

    // Compute breakdown by type
    const byType = {};
    votes.forEach(vote => {
      const type = vote.proposal?.type || 'unknown';
      if (!byType[type]) {
        byType[type] = {
          type,
          yes: 0,
          no: 0,
          abstain: 0,
          total: 0,
          totalLatency: 0
        };
      }

      const voteChoice = vote.vote?.toLowerCase();
      byType[type].total++;
      if (voteChoice === 'yes') byType[type].yes++;
      else if (voteChoice === 'no') byType[type].no++;
      else if (voteChoice === 'abstain') byType[type].abstain++;

      if (vote.latency != null) {
        byType[type].totalLatency += vote.latency;
      }
    });

    // Compute derived metrics
    const breakdown = Object.values(byType).map(item => ({
      ...item,
      yesRate: item.total > 0 ? item.yes / item.total : 0,
      noRate: item.total > 0 ? item.no / item.total : 0,
      abstainRate: item.total > 0 ? item.abstain / item.total : 0,
      avgLatency: item.totalLatency > 0 ? item.totalLatency / item.total : 0
    }));

    // Compute volatility
    const volatilityByType = computeVolatilityByType(votes);

    // Add volatility to breakdown
    breakdown.forEach(item => {
      item.volatility = volatilityByType[item.type] || 0;
    });

    // Compute signature positions if population stats available
    const signatures = populationStats ?
      identifySignaturePositions(votes, populationStats) : [];

    return {
      breakdown,
      signatures
    };
  }, [votes, populationStats]);

  if (!issueData) {
    return (
      <div className="issue-positions">
        <div className="empty-state">
          <p>No voting data available for issue position analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="issue-positions">
      <h3>Issue Positions</h3>

      {/* Breakdown Table */}
      <div className="breakdown-section">
        <h4>Voting Breakdown by Issue Type</h4>
        <p className="section-subtitle">How this DRep votes on different types of proposals</p>

        <div className="breakdown-table">
          <div className="table-header">
            <div className="col-type">Type</div>
            <div className="col-votes">Votes</div>
            <div className="col-yes">Yes Rate</div>
            <div className="col-no">No Rate</div>
            <div className="col-volatility">Volatility</div>
            <div className="col-latency">Avg Latency</div>
          </div>

          {issueData.breakdown
            .sort((a, b) => b.total - a.total)
            .map(item => (
              <div key={item.type} className="table-row">
                <div className="col-type">
                  <span className="type-name">{item.type}</span>
                </div>
                <div className="col-votes">{item.total}</div>
                <div className="col-yes">
                  <div className="mini-bar-container">
                    <div
                      className="mini-bar yes-bar"
                      style={{ width: `${item.yesRate * 100}%` }}
                    />
                  </div>
                  <span className="rate-value">{(item.yesRate * 100).toFixed(0)}%</span>
                </div>
                <div className="col-no">
                  <div className="mini-bar-container">
                    <div
                      className="mini-bar no-bar"
                      style={{ width: `${item.noRate * 100}%` }}
                    />
                  </div>
                  <span className="rate-value">{(item.noRate * 100).toFixed(0)}%</span>
                </div>
                <div className="col-volatility">
                  <div className="volatility-indicator">
                    <div
                      className="volatility-dot"
                      style={{
                        backgroundColor: item.volatility > 0.5 ? '#10b981' :
                                       item.volatility > 0.3 ? '#f59e0b' : '#6b7280'
                      }}
                    />
                    <span>{(item.volatility * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="col-latency">{item.avgLatency.toFixed(1)}h</div>
              </div>
            ))}
        </div>

        <div className="legend-box">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
            <span>High volatility (&gt;50%) = persuadable</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
            <span>Moderate (30-50%)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#6b7280' }}></span>
            <span>Low (&lt;30%) = firm position</span>
          </div>
        </div>
      </div>

      {/* Signature Positions */}
      {issueData.signatures.length > 0 && (
        <div className="signatures-section">
          <h4>Signature Positions</h4>
          <p className="section-subtitle">
            Issues where this DRep differs significantly from the broader community
          </p>

          <div className="signatures-table">
            <div className="table-header">
              <div className="col-sig-type">Issue Type</div>
              <div className="col-sig-drep">DRep Position</div>
              <div className="col-sig-pop">Community Avg</div>
              <div className="col-sig-diff">Deviation</div>
              <div className="col-sig-stance">Stance</div>
            </div>

            {issueData.signatures.map(sig => (
              <div key={sig.type} className="table-row">
                <div className="col-sig-type">{sig.type}</div>
                <div className="col-sig-drep">{(sig.drepYesRate * 100).toFixed(0)}% yes</div>
                <div className="col-sig-pop">{(sig.popYesRate * 100).toFixed(0)}% yes</div>
                <div className="col-sig-diff">
                  <span className="deviation-value">{(sig.deviation * 100).toFixed(0)}%</span>
                </div>
                <div className="col-sig-stance">
                  <span className={`stance-badge ${sig.stance}`}>
                    {sig.stance === 'more_supportive' ? 'More Supportive' : 'More Opposed'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="signatures-note">
            <strong>Note:</strong> Signature positions show where this DRep's voting pattern
            deviates by more than 30% from the community average. These may represent core
            values or policy priorities that are difficult to change through lobbying.
          </div>
        </div>
      )}

      {issueData.signatures.length === 0 && populationStats && (
        <div className="no-signatures">
          <p>No signature positions detected. This DRep's voting patterns are generally aligned
             with the broader community averages.</p>
        </div>
      )}

      {!populationStats && (
        <div className="no-pop-stats">
          <p>Population statistics not yet available. Signature position analysis requires
             aggregate community data to compute deviations.</p>
        </div>
      )}

      {/* Insights */}
      <div className="insights-box">
        <h4>🎯 Understanding Issue Positions</h4>
        <ul>
          <li>
            <strong>Volatility:</strong> High volatility on a specific issue type means this
            DRep frequently changes their vote direction. These are the best issues to focus
            lobbying efforts on.
          </li>
          <li>
            <strong>Yes/No rates:</strong> Show this DRep's general stance. A DRep with 80% yes
            rate on treasury proposals generally supports treasury spending.
          </li>
          <li>
            <strong>Signature positions:</strong> Highlight core values. If a DRep is consistently
            more opposed to committee changes (-50% deviation), this likely reflects a principled
            position that's hard to change.
          </li>
          <li>
            <strong>Strategy:</strong> Target issues with high volatility but no signature position.
            Avoid lobbying on signature issues unless you have extremely compelling arguments.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default IssuePositions;

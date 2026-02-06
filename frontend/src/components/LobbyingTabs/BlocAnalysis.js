import React, { useMemo } from 'react';
import { computeSimilarity, computeBridgeScore } from '../../utils/lobbyingAnalytics';
import './BlocAnalysis.css';

function BlocAnalysis({ votes, blocData, similarDReps, voterId }) {
  const blocInfo = useMemo(() => {
    if (!blocData?.blocs) return null;

    // Find which bloc this DRep belongs to
    const myBloc = blocData.blocs.find(bloc =>
      bloc.members.includes(voterId)
    );

    return {
      myBloc,
      allBlocs: blocData.blocs
    };
  }, [blocData, voterId]);

  if (!votes || votes.length === 0) {
    return (
      <div className="bloc-analysis">
        <div className="empty-state">
          <p>No voting data available for bloc analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bloc-analysis">
      <h3>Blocs & Alignment</h3>

      {/* Bloc Membership */}
      {blocInfo?.myBloc && (
        <div className="bloc-membership-section">
          <h4>Voting Bloc Membership</h4>
          <div className="bloc-card">
            <div className="bloc-header">
              <span className="bloc-id">{blocInfo.myBloc.id}</span>
              <span className="bloc-size">{blocInfo.myBloc.size} members</span>
            </div>
            <div className="bloc-cohesion">
              <span className="cohesion-label">Cohesion:</span>
              <div className="cohesion-bar-container">
                <div
                  className="cohesion-bar"
                  style={{
                    width: `${blocInfo.myBloc.cohesion * 100}%`,
                    backgroundColor: blocInfo.myBloc.cohesion > 0.7 ? '#10b981' : '#f59e0b'
                  }}
                />
              </div>
              <span className="cohesion-value">{(blocInfo.myBloc.cohesion * 100).toFixed(0)}%</span>
            </div>
            <p className="bloc-description">
              This DRep belongs to a voting bloc with {blocInfo.myBloc.size} members who tend to vote similarly.
              {blocInfo.myBloc.cohesion > 0.7 ? ' The bloc has high cohesion, indicating strong alignment.' :
               ' The bloc has moderate cohesion, indicating some voting independence.'}
            </p>
          </div>
        </div>
      )}

      {!blocInfo?.myBloc && blocData && (
        <div className="bloc-membership-section">
          <h4>Voting Bloc Membership</h4>
          <div className="no-bloc-card">
            <p>This DRep is not currently assigned to any voting bloc. This may indicate:</p>
            <ul>
              <li>Independent voting patterns</li>
              <li>Unique positions that don't align with major blocs</li>
              <li>Insufficient voting history for clustering</li>
            </ul>
          </div>
        </div>
      )}

      {/* Similar DReps */}
      <div className="similarity-section">
        <h4>Most Aligned DReps</h4>
        <p className="section-subtitle">DReps with similar voting patterns (most likely to vote the same way)</p>

        {similarDReps && similarDReps.length > 0 ? (
          <div className="similarity-table">
            <div className="table-header">
              <div className="col-drep">DRep</div>
              <div className="col-similarity">Similarity</div>
              <div className="col-votes">Common Votes</div>
            </div>

            {similarDReps.slice(0, 10).map((drep, idx) => (
              <div key={drep.voterId} className="table-row">
                <div className="col-drep">
                  <span className="rank">#{idx + 1}</span>
                  <span className="drep-id">{drep.voterId.substring(0, 12)}...</span>
                </div>
                <div className="col-similarity">
                  <div className="similarity-bar-container">
                    <div
                      className="similarity-bar"
                      style={{
                        width: `${drep.similarity * 100}%`,
                        backgroundColor: drep.similarity > 0.8 ? '#10b981' :
                                       drep.similarity > 0.6 ? '#3b9dff' : '#f59e0b'
                      }}
                    />
                  </div>
                  <span className="similarity-value">{(drep.similarity * 100).toFixed(0)}%</span>
                </div>
                <div className="col-votes">{drep.commonVotes}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data-message">
            <p>Similarity data not yet computed. Click "Compute Blocs" above to analyze.</p>
          </div>
        )}
      </div>

      {/* All Blocs Overview */}
      {blocInfo?.allBlocs && blocInfo.allBlocs.length > 0 && (
        <div className="all-blocs-section">
          <h4>All Voting Blocs</h4>
          <p className="section-subtitle">Current voting blocs in the DRep community</p>

          <div className="blocs-grid">
            {blocInfo.allBlocs
              .sort((a, b) => b.size - a.size)
              .map(bloc => (
                <div
                  key={bloc.id}
                  className={`bloc-card-small ${bloc.id === blocInfo.myBloc?.id ? 'my-bloc' : ''}`}
                >
                  <div className="bloc-card-header">
                    <span className="bloc-id-small">{bloc.id}</span>
                    {bloc.id === blocInfo.myBloc?.id && <span className="you-badge">YOU</span>}
                  </div>
                  <div className="bloc-stats">
                    <span className="stat-item">{bloc.size} members</span>
                    <span className="stat-item">{(bloc.cohesion * 100).toFixed(0)}% cohesion</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="insights-box">
        <h4>🤝 Understanding Blocs & Alignment</h4>
        <ul>
          <li>
            <strong>Voting blocs:</strong> Groups of DReps who consistently vote similarly.
            High cohesion blocs are harder to influence as a group.
          </li>
          <li>
            <strong>Similarity:</strong> High similarity (&gt;80%) means these DReps almost always vote
            the same way. Low similarity (&lt;40%) indicates potential opposition.
          </li>
          <li>
            <strong>Lobbying strategy:</strong> Target DReps with moderate similarity (60-80%) from
            other blocs - they're aligned enough to understand your perspective but independent
            enough to be persuadable.
          </li>
          <li>
            <strong>Bridge DReps:</strong> DReps not strongly aligned with any bloc may have high
            influence as swing voters. Prioritize outreach to these independent voices.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default BlocAnalysis;

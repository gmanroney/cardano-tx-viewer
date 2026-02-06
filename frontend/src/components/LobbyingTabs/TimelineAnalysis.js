import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { computeTimeSeries } from '../../utils/lobbyingAnalytics';
import './TimelineAnalysis.css';

function TimelineAnalysis({ votes, allProposals }) {
  const timelineData = useMemo(() => {
    if (!votes || votes.length < 10) return null;

    // Sort votes by time
    const sortedVotes = [...votes].sort((a, b) =>
      new Date(a.blockTime) - new Date(b.blockTime)
    );

    // Compute time series with rolling window
    const timeSeries = computeTimeSeries(sortedVotes, 10);

    // Compute responsiveness by type
    const latencyByType = {};
    votes.forEach(vote => {
      const type = vote.proposal?.type || 'unknown';
      if (!latencyByType[type]) {
        latencyByType[type] = [];
      }
      if (vote.latency != null) {
        latencyByType[type].push(vote.latency);
      }
    });

    const responsiveness = Object.entries(latencyByType).map(([type, latencies]) => {
      if (latencies.length === 0) return null;
      const sorted = [...latencies].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      return { type, median, avg, count: latencies.length };
    }).filter(Boolean);

    return {
      timeSeries,
      responsiveness
    };
  }, [votes]);

  if (!timelineData) {
    return (
      <div className="timeline-analysis">
        <div className="empty-state">
          <p>Insufficient data for timeline analysis. Need at least 10 votes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-analysis">
      <h3>Timeline & Responsiveness</h3>

      {/* Time Series Chart */}
      <div className="chart-section">
        <h4>Voting Pattern Over Time</h4>
        <p className="section-subtitle">Rolling 10-vote window showing yes/no rates</p>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData.timeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a4a6f" />
            <XAxis
              dataKey="period"
              stroke="#718096"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              stroke="#718096"
              style={{ fontSize: '0.75rem' }}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e3a5f',
                border: '1px solid #3b9dff',
                borderRadius: '4px',
                color: '#e0e6ed'
              }}
              formatter={(value) => `${(value * 100).toFixed(1)}%`}
            />
            <Legend
              wrapperStyle={{ color: '#a0aec0', fontSize: '0.875rem' }}
            />
            <Line
              type="monotone"
              dataKey="yesRate"
              stroke="#10b981"
              name="Yes Rate"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="noRate"
              stroke="#ef4444"
              name="No Rate"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Responsiveness Heatmap */}
      <div className="responsiveness-section">
        <h4>Response Time by Issue Type</h4>
        <p className="section-subtitle">How quickly does this DRep vote on different issues?</p>

        <div className="responsiveness-grid">
          {timelineData.responsiveness
            .sort((a, b) => a.median - b.median)
            .map(item => (
              <div key={item.type} className="responsiveness-item">
                <div className="responsiveness-label">
                  <span className="type-name">{item.type}</span>
                  <span className="vote-count">({item.count} votes)</span>
                </div>

                <div className="responsiveness-bars">
                  <div className="bar-row">
                    <span className="bar-label">Median:</span>
                    <div className="bar-container">
                      <div
                        className="bar median-bar"
                        style={{
                          width: `${Math.min(item.median / 72 * 100, 100)}%`,
                          backgroundColor: item.median < 24 ? '#10b981' : item.median < 48 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="bar-value">{item.median.toFixed(1)}h</span>
                  </div>

                  <div className="bar-row">
                    <span className="bar-label">Average:</span>
                    <div className="bar-container">
                      <div
                        className="bar avg-bar"
                        style={{
                          width: `${Math.min(item.avg / 72 * 100, 100)}%`,
                          backgroundColor: item.avg < 24 ? '#10b981' : item.avg < 48 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="bar-value">{item.avg.toFixed(1)}h</span>
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="legend-box">
          <span className="legend-item"><span className="legend-color fast"></span>Fast (&lt;24h)</span>
          <span className="legend-item"><span className="legend-color moderate"></span>Moderate (24-48h)</span>
          <span className="legend-item"><span className="legend-color slow"></span>Slow (&gt;48h)</span>
        </div>
      </div>

      {/* Insights */}
      <div className="insights-box">
        <h4>📈 Insights</h4>
        <ul>
          <li>
            <strong>Time-series patterns:</strong> Look for volatility (frequent switching) vs consistency.
            High volatility suggests openness to persuasion.
          </li>
          <li>
            <strong>Response times:</strong> Fast responders (&lt;24h) are engaged and monitor proposals closely.
            Slower responders may need early outreach before voting windows close.
          </li>
          <li>
            <strong>Issue-specific timing:</strong> Different response speeds by issue type may indicate
            which topics this DRep prioritizes or has stronger opinions about.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default TimelineAnalysis;

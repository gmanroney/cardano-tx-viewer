import React from 'react';
import './Stats.css';

function Stats({ stats, onRefresh }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="stats-container">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value">{stats.totalTransactions?.toLocaleString() || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Latest Block</div>
          <div className="stat-value">{stats.latestBlock?.toLocaleString() || 'N/A'}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Oldest Block</div>
          <div className="stat-value">{stats.oldestBlock?.toLocaleString() || 'N/A'}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Last Updated</div>
          <div className="stat-value small">{formatDate(stats.lastFetchedAt)}</div>
        </div>
      </div>

      <button className="refresh-button" onClick={onRefresh}>
        <span>🔄</span> Fetch Now
      </button>
    </div>
  );
}

export default Stats;

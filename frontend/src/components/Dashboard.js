import React from 'react';
import './Dashboard.css';

function Dashboard({ stats }) {
  const formatNumber = (num) => {
    if (!num) return '0';
    return parseFloat(num).toLocaleString();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleString();
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Cardano Blockchain Metrics</h2>
        <div className="live-indicator">
          <span className="pulse"></span>
          <span>LIVE</span>
        </div>
      </div>

      <div className="metrics-grid">
        {/* Network Status */}
        <div className="metric-section network-status">
          <h3>Network Status</h3>
          <div className="metric-cards">
            <div className="metric-card highlight">
              <div className="metric-icon">🔗</div>
              <div className="metric-content">
                <div className="metric-label">Latest Block</div>
                <div className="metric-value">{formatNumber(stats.latestBlock)}</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">⚡</div>
              <div className="metric-content">
                <div className="metric-label">TX/Minute</div>
                <div className="metric-value">{stats.transactionsPerMinute || '0'}</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <div className="metric-label">Total Tracked</div>
                <div className="metric-value">{formatNumber(stats.totalTransactions)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Metrics */}
        <div className="metric-section">
          <h3>Transaction Analytics</h3>
          <div className="metric-cards">
            <div className="metric-card">
              <div className="metric-icon">💰</div>
              <div className="metric-content">
                <div className="metric-label">Total Volume</div>
                <div className="metric-value">{formatNumber(stats.totalADA)} ADA</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <div className="metric-label">Avg Amount</div>
                <div className="metric-value">{formatNumber(stats.averageAmount)} ADA</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">💸</div>
              <div className="metric-content">
                <div className="metric-label">Total Fees</div>
                <div className="metric-value">{formatNumber(stats.totalFees)} ADA</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">🏷️</div>
              <div className="metric-content">
                <div className="metric-label">Avg Fee</div>
                <div className="metric-value">{stats.averageFee || '0'} ADA</div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Breakdown */}
        <div className="metric-section">
          <h3>Activity Breakdown</h3>
          <div className="metric-cards">
            <div className="metric-card activity">
              <div className="metric-icon">📜</div>
              <div className="metric-content">
                <div className="metric-label">Smart Contracts</div>
                <div className="metric-value">{stats.smartContractTransactions || '0'}</div>
                <div className="metric-subtitle">in last 100 TX</div>
              </div>
            </div>
            <div className="metric-card activity">
              <div className="metric-icon">🎨</div>
              <div className="metric-content">
                <div className="metric-label">NFT/Token Mints</div>
                <div className="metric-value">{stats.nftTransactions || '0'}</div>
                <div className="metric-subtitle">in last 100 TX</div>
              </div>
            </div>
            <div className="metric-card activity">
              <div className="metric-icon">🤝</div>
              <div className="metric-content">
                <div className="metric-label">Delegations</div>
                <div className="metric-value">{stats.delegationTransactions || '0'}</div>
                <div className="metric-subtitle">in last 100 TX</div>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Transaction */}
        <div className="metric-section latest-tx">
          <h3>Latest Transaction</h3>
          <div className="latest-tx-card">
            <div className="tx-info">
              <div className="tx-hash-display">
                <span className="label">Hash:</span>
                <span className="hash" title={stats.latestTxHash}>
                  {formatHash(stats.latestTxHash)}
                </span>
              </div>
              <div className="tx-time">
                <span className="label">Time:</span>
                <span className="time">{formatDate(stats.latestTxTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

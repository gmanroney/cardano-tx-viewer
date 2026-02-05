import React from 'react';
import './Dashboard.css';
import Tooltip from './Tooltip';

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
            <Tooltip text="The most recent block height on the Cardano blockchain. This is the current tip of the chain and represents the latest confirmed block.">
              <div className="metric-card highlight">
                <div className="metric-icon">🔗</div>
                <div className="metric-content">
                  <div className="metric-label">Latest Block</div>
                  <div className="metric-value">{formatNumber(stats.latestBlock)}</div>
                </div>
              </div>
            </Tooltip>
            <Tooltip text="Transactions per minute - calculated by analyzing the time difference between the last 100 transactions. Shows the current network activity rate.">
              <div className="metric-card">
                <div className="metric-icon">⚡</div>
                <div className="metric-content">
                  <div className="metric-label">TX/Minute</div>
                  <div className="metric-value">{stats.transactionsPerMinute || '0'}</div>
                </div>
              </div>
            </Tooltip>
            <Tooltip text="Total number of transactions stored in the database. This grows as the application continuously fetches new transactions from the blockchain every 30 seconds.">
              <div className="metric-card">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <div className="metric-label">Total Tracked</div>
                  <div className="metric-value">{formatNumber(stats.totalTransactions)}</div>
                </div>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Transaction Metrics */}
        <div className="metric-section">
          <h3>Transaction Analytics</h3>
          <div className="metric-cards">
            <Tooltip text="Total ADA volume across the last 100 transactions. Calculated by summing all output amounts (lovelace units converted to ADA).">
              <div className="metric-card">
                <div className="metric-icon">💰</div>
                <div className="metric-content">
                  <div className="metric-label">Total Volume</div>
                  <div className="metric-value">{formatNumber(stats.totalADA)} ADA</div>
                </div>
              </div>
            </Tooltip>
            <Tooltip text="Average transaction amount - calculated by dividing total volume by the number of recent transactions. Gives insight into typical transaction sizes.">
              <div className="metric-card">
                <div className="metric-icon">📈</div>
                <div className="metric-content">
                  <div className="metric-label">Avg Amount</div>
                  <div className="metric-value">{formatNumber(stats.averageAmount)} ADA</div>
                </div>
              </div>
            </Tooltip>
            <Tooltip text="Total transaction fees paid across the last 100 transactions. Fees go to stake pool operators and the Cardano treasury.">
              <div className="metric-card">
                <div className="metric-icon">💸</div>
                <div className="metric-content">
                  <div className="metric-label">Total Fees</div>
                  <div className="metric-value">{formatNumber(stats.totalFees)} ADA</div>
                </div>
              </div>
            </Tooltip>
            <Tooltip text="Average fee per transaction - calculated by dividing total fees by transaction count. Cardano fees are typically very low (0.17-0.3 ADA).">
              <div className="metric-card">
                <div className="metric-icon">🏷️</div>
                <div className="metric-content">
                  <div className="metric-label">Avg Fee</div>
                  <div className="metric-value">{stats.averageFee || '0'} ADA</div>
                </div>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Activity Breakdown */}
        <div className="metric-section">
          <h3>Activity Breakdown</h3>
          <div className="metric-cards">
            <Tooltip text="Number of smart contract transactions in the last 100 TX. Identified by valid contract flag and redeemer count > 0. Includes DeFi, NFT marketplaces, and dApps.">
              <div className="metric-card activity">
                <div className="metric-icon">📜</div>
                <div className="metric-content">
                  <div className="metric-label">Smart Contracts</div>
                  <div className="metric-value">{stats.smartContractTransactions || '0'}</div>
                  <div className="metric-subtitle">in last 100 TX</div>
                </div>
              </div>
            </Tooltip>
            <Tooltip text="Transactions that mint or burn native tokens/NFTs. Counted when assetMintOrBurnCount > 0. Includes NFT creation, token minting, and asset burning.">
              <div className="metric-card activity">
                <div className="metric-icon">🎨</div>
                <div className="metric-content">
                  <div className="metric-label">NFT/Token Mints</div>
                  <div className="metric-value">{stats.nftTransactions || '0'}</div>
                  <div className="metric-subtitle">in last 100 TX</div>
                </div>
              </div>
            </Tooltip>
            <Tooltip text="Stake delegation transactions where users delegate their ADA to stake pools. Counted when delegationCount > 0. Used for participating in network consensus and earning rewards.">
              <div className="metric-card activity">
                <div className="metric-icon">🤝</div>
                <div className="metric-content">
                  <div className="metric-label">Delegations</div>
                  <div className="metric-value">{stats.delegationTransactions || '0'}</div>
                  <div className="metric-subtitle">in last 100 TX</div>
                </div>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Latest Transaction */}
        <div className="metric-section latest-tx">
          <h3>
            <Tooltip text="The most recently fetched transaction from the Cardano blockchain. Shows the transaction hash (unique identifier) and when it was added to our database.">
              <span style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                Latest Transaction ℹ️
              </span>
            </Tooltip>
          </h3>
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

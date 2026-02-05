import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TransactionList.css';

function TransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('blockHeight');
  const [sortDirection, setSortDirection] = useState('desc');
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    smartContracts: 0,
    nftMints: 0,
    delegations: 0
  });
  const itemsPerPage = 20;

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, [page, sortField, sortDirection]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/transactions?page=${page}&limit=${itemsPerPage}`);
      const txData = response.data.transactions;
      setTransactions(txData);
      setTotalPages(response.data.pagination.pages);

      // Calculate stats
      const smartContracts = txData.filter(tx => tx.validContract && tx.redeemerCount > 0).length;
      const nftMints = txData.filter(tx => tx.assetMintOrBurnCount > 0).length;
      const delegations = txData.filter(tx => tx.delegationCount > 0).length;

      setStats({
        total: response.data.pagination.total,
        smartContracts,
        nftMints,
        delegations
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 12)}...${hash.substring(hash.length - 12)}`;
  };

  const formatADA = (lovelace) => {
    if (!lovelace) return '0';
    return (parseInt(lovelace) / 1000000).toFixed(6);
  };

  const getTotalADA = (tx) => {
    if (!tx.outputAmount || tx.outputAmount.length === 0) return '0';
    const adaOutput = tx.outputAmount.find(output => output.unit === 'lovelace');
    return adaOutput ? formatADA(adaOutput.quantity) : '0';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const viewTransaction = (tx) => {
    setSelectedTx(tx);
  };

  const closeModal = () => {
    setSelectedTx(null);
  };

  // Apply sorting
  let sortedTransactions = [...transactions];
  if (sortField) {
    sortedTransactions.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle different data types
      if (sortField === 'blockHeight' || sortField === 'slot' || sortField === 'size' || sortField === 'fees') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      } else if (sortField === 'amount') {
        aVal = parseFloat(getTotalADA(a)) || 0;
        bVal = parseFloat(getTotalADA(b)) || 0;
      } else if (sortField === 'fetchedAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="tx-list-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tx-list-container">
        <div className="error-state">
          <h3>⚠️ Transaction Data Unavailable</h3>
          <p>{error}</p>
          <button onClick={fetchTransactions} className="retry-btn">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-list-container">
      <div className="tx-list-header">
        <h2>Cardano Transactions</h2>
        <button onClick={fetchTransactions} className="refresh-btn" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      <div className="tx-stats-grid">
        <div className="tx-stat-card">
          <span className="label">Total Tracked</span>
          <span className="value">{stats.total.toLocaleString()}</span>
        </div>
        <div className="tx-stat-card">
          <span className="label">Smart Contracts</span>
          <span className="value">{stats.smartContracts}</span>
        </div>
        <div className="tx-stat-card">
          <span className="label">NFT/Token Mints</span>
          <span className="value">{stats.nftMints}</span>
        </div>
        <div className="tx-stat-card">
          <span className="label">Delegations</span>
          <span className="value">{stats.delegations}</span>
        </div>
      </div>

      {sortedTransactions.length === 0 ? (
        <div className="empty-state">
          <p>No transactions found.</p>
        </div>
      ) : (
        <>
          <div className="tx-table-container">
            <table className="tx-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('hash')} style={{cursor: 'pointer'}}>
                    Transaction Hash {getSortIcon('hash')}
                  </th>
                  <th onClick={() => handleSort('blockHeight')} style={{cursor: 'pointer'}}>
                    Block Height {getSortIcon('blockHeight')}
                  </th>
                  <th onClick={() => handleSort('amount')} style={{cursor: 'pointer'}}>
                    Amount (ADA) {getSortIcon('amount')}
                  </th>
                  <th onClick={() => handleSort('fees')} style={{cursor: 'pointer'}}>
                    Fees (ADA) {getSortIcon('fees')}
                  </th>
                  <th onClick={() => handleSort('size')} style={{cursor: 'pointer'}}>
                    Size {getSortIcon('size')}
                  </th>
                  <th onClick={() => handleSort('fetchedAt')} style={{cursor: 'pointer'}}>
                    Time {getSortIcon('fetchedAt')}
                  </th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((tx, index) => (
                  <tr key={`${tx.hash}-${index}`}>
                    <td className="hash-cell" title={tx.hash}>
                      {formatHash(tx.hash)}
                    </td>
                    <td>{tx.blockHeight.toLocaleString()}</td>
                    <td className="amount-cell">{getTotalADA(tx)}</td>
                    <td>{formatADA(tx.fees)}</td>
                    <td>{tx.size.toLocaleString()} B</td>
                    <td className="time-cell">{formatDate(tx.fetchedAt)}</td>
                    <td className="type-cell">
                      {tx.validContract && tx.redeemerCount > 0 && (
                        <span className="badge smart-contract" title="Smart Contract">📜</span>
                      )}
                      {tx.assetMintOrBurnCount > 0 && (
                        <span className="badge nft" title="NFT/Token">🎨</span>
                      )}
                      {tx.delegationCount > 0 && (
                        <span className="badge delegation" title="Delegation">🤝</span>
                      )}
                      {!tx.validContract && tx.assetMintOrBurnCount === 0 && tx.delegationCount === 0 && (
                        <span className="badge regular" title="Regular Transfer">💰</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => viewTransaction(tx)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="pagination-btn"
            >
              ← Previous
            </button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="pagination-btn"
            >
              Next →
            </button>
          </div>
        </>
      )}

      {selectedTx && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>Basic Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Hash:</span>
                  <span className="detail-value hash-value" title={selectedTx.hash}>
                    {selectedTx.hash}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Block Height:</span>
                  <span className="detail-value">{selectedTx.blockHeight.toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Slot:</span>
                  <span className="detail-value">{selectedTx.slot.toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Index:</span>
                  <span className="detail-value">{selectedTx.index}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Financial Details</h4>
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value amount">{getTotalADA(selectedTx)} ADA</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Fees:</span>
                  <span className="detail-value">{formatADA(selectedTx.fees)} ADA</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Size:</span>
                  <span className="detail-value">{selectedTx.size.toLocaleString()} bytes</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Transaction Metadata</h4>
                <div className="detail-row">
                  <span className="detail-label">UTXOs:</span>
                  <span className="detail-value">{selectedTx.utxoCount}</span>
                </div>
                {selectedTx.assetMintOrBurnCount > 0 && (
                  <div className="detail-row">
                    <span className="detail-label">Assets Minted/Burned:</span>
                    <span className="detail-value">{selectedTx.assetMintOrBurnCount}</span>
                  </div>
                )}
                {selectedTx.delegationCount > 0 && (
                  <div className="detail-row">
                    <span className="detail-label">Delegations:</span>
                    <span className="detail-value">{selectedTx.delegationCount}</span>
                  </div>
                )}
                {selectedTx.redeemerCount > 0 && (
                  <div className="detail-row">
                    <span className="detail-label">Redeemers:</span>
                    <span className="detail-value">{selectedTx.redeemerCount}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Valid Contract:</span>
                  <span className="detail-value">{selectedTx.validContract ? '✓ Yes' : '✗ No'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Timestamps</h4>
                <div className="detail-row">
                  <span className="detail-label">Fetched At:</span>
                  <span className="detail-value">{formatDate(selectedTx.fetchedAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Updated At:</span>
                  <span className="detail-value">{formatDate(selectedTx.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionList;
